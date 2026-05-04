import { extractGoogleMapsUrl } from "@/lib/input";
import type { InputType, ParsedRestaurantInput } from "@/types/restaurant";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TEST_MODEL = "gpt-5.4-nano";

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
}

interface ParseRestaurantInputParams {
  inputText: string;
  inputType: InputType;
}

export async function testOpenAIConnection(): Promise<{
  model: string;
  message: string;
}> {
  const model = process.env.OPENAI_TEST_MODEL || DEFAULT_TEST_MODEL;
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: "請用繁體中文回覆：OpenAI API 連線正常。",
      max_output_tokens: 80,
      model,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API failed with ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;

  return {
    message: extractTextOutput(payload) || "OpenAI API 連線正常。",
    model,
  };
}

export async function parseRestaurantInput({
  inputText,
  inputType,
}: ParseRestaurantInputParams): Promise<ParsedRestaurantInput> {
  const model = process.env.OPENAI_PARSE_MODEL || DEFAULT_TEST_MODEL;
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const googleMapsUrl = extractGoogleMapsUrl(inputText) ?? "";
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: buildParseRestaurantInputPrompt({
        googleMapsUrl,
        inputText,
        inputType,
      }),
      max_output_tokens: 700,
      model,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API failed with ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;
  const outputText = extractTextOutput(payload);
  const parsed = parseJsonObject(outputText);

  return normalizeParsedRestaurantInput(parsed, googleMapsUrl);
}

function extractTextOutput(payload: OpenAIResponsesPayload): string {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function buildParseRestaurantInputPrompt({
  googleMapsUrl,
  inputText,
  inputType,
}: ParseRestaurantInputParams & { googleMapsUrl: string }): string {
  return `你是一個餐廳資料輸入解析助手。

請根據使用者輸入的一句自然語言，拆解出：
- 餐廳名稱
- 國家提示
- 城市提示
- 區域提示
- Google Maps URL
- 資料來源類型
- 來源名稱
- 來源備註
- 來源可信度
- 適合情境提示
- 標籤提示

規則：
1. 使用者可能輸入中文、英文、日文或其他語言。
2. 不要自己補查資料，只解析輸入句子本身。
3. restaurantName 只放餐廳名稱，不要把國家、城市或區域放進 restaurantName。
4. 如果使用者沒有提到資料來源，sourceType = "Neutral"，sourceReliability = 3。
5. 如果提到朋友推薦，sourceType = "FriendRecommended"，sourceReliability = 4。
6. 如果提到自己吃過，sourceType = "SelfVisited"，sourceReliability = 5。
7. 如果提到 IG、短影音、社群看到，sourceType = "IGRecommended"，sourceReliability = 2。
8. 如果提到客戶、商務場合，sourceType 可判斷為 "CustomerMeal" 或 "BusinessContact"。
9. sourceType 只能是以下其中一個：
Neutral, SelfVisited, FriendRecommended, IGRecommended, BlogRecommended, GoogleMapFound, CustomerMeal, BusinessContact, Other
10. 回傳必須是有效 JSON，不要包含 markdown，不要加註解。

請只回傳以下 JSON 欄位：
{
  "restaurantName": "",
  "countryHint": "",
  "cityHint": "",
  "districtHint": "",
  "googleMapsUrl": "",
  "sourceType": "Neutral",
  "sourceName": "",
  "sourceNote": "",
  "sourceReliability": 3,
  "suitableForHints": [],
  "tagHints": []
}

輸入類型：${inputType}
已偵測到的 Google Maps URL：${googleMapsUrl}
使用者輸入：${inputText}`;
}

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmedValue = value.trim();
  const jsonText = trimmedValue
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(jsonText) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OpenAI response was not a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function normalizeParsedRestaurantInput(
  value: Record<string, unknown>,
  detectedGoogleMapsUrl: string,
): ParsedRestaurantInput {
  const countryHint = toStringValue(value.countryHint);
  const cityHint = toStringValue(value.cityHint);
  const districtHint = toStringValue(value.districtHint);

  return {
    cityHint,
    countryHint,
    districtHint,
    googleMapsUrl:
      toStringValue(value.googleMapsUrl) || detectedGoogleMapsUrl || "",
    restaurantName: stripLocationPrefix(toStringValue(value.restaurantName), [
      countryHint,
      cityHint,
      districtHint,
    ]),
    sourceName: toStringValue(value.sourceName),
    sourceNote: toStringValue(value.sourceNote),
    sourceReliability: clampSourceReliability(value.sourceReliability),
    sourceType: normalizeSourceType(value.sourceType),
    suitableForHints: toStringArray(value.suitableForHints),
    tagHints: toStringArray(value.tagHints),
  };
}

function stripLocationPrefix(name: string, locationParts: string[]): string {
  let cleanName = name.trim();
  const orderedLocationParts = locationParts
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const locationPart of orderedLocationParts) {
    cleanName = cleanName
      .replace(new RegExp(`^${escapeRegExp(locationPart)}[\\s,，、-]*`, "i"), "")
      .trim();
  }

  return cleanName || name;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
}

function clampSourceReliability(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return 3;
  }

  return Math.min(5, Math.max(1, Math.round(numberValue)));
}

function normalizeSourceType(value: unknown): ParsedRestaurantInput["sourceType"] {
  const sourceType = toStringValue(value);
  const allowedSourceTypes: ParsedRestaurantInput["sourceType"][] = [
    "Neutral",
    "SelfVisited",
    "FriendRecommended",
    "IGRecommended",
    "BlogRecommended",
    "GoogleMapFound",
    "CustomerMeal",
    "BusinessContact",
    "Other",
  ];

  return allowedSourceTypes.includes(
    sourceType as ParsedRestaurantInput["sourceType"],
  )
    ? (sourceType as ParsedRestaurantInput["sourceType"])
    : "Neutral";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
