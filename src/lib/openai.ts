import { extractGoogleMapsUrl } from "@/lib/input";
import type {
  AIConfidence,
  BusinessStatus,
  EnrichedRestaurant,
  EnrichRestaurantInput,
  EnrichRestaurantResult,
  InputType,
  OpeningHoursPeriod,
  ParsedRestaurantInput,
  RestaurantCandidate,
  TodayOpenStatus,
} from "@/types/restaurant";

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

type JsonRecord = Record<string, unknown>;

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

export async function enrichRestaurant(
  input: EnrichRestaurantInput,
): Promise<EnrichRestaurantResult> {
  const model = process.env.OPENAI_ENRICH_MODEL || DEFAULT_TEST_MODEL;
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify({
      input: buildEnrichRestaurantPrompt(input),
      max_output_tokens: 1800,
      model,
      tools: [{ type: "web_search_preview" }],
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

  return normalizeEnrichRestaurantResult(parsed);
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

function buildEnrichRestaurantPrompt(input: EnrichRestaurantInput): string {
  return `你是一個全球餐廳資料補全助手。

任務：
根據使用者輸入的餐廳名稱、國家提示、城市提示、區域提示、Google Maps URL 與原始輸入，上網查詢公開資料，並回傳結構化 JSON。

規則：
1. 支援全球餐廳，不限台灣。
2. 如果使用者提供 Google Maps URL，優先以該 URL 作為識別線索。
3. 如果使用者提供 countryHint、cityHint、districtHint，請優先使用這些線索避免找錯分店。
4. 如果餐廳有多家分店，且無法明確判斷是哪一家，不要硬猜，請回傳 needsUserSelection: true 和 candidates。
5. 需要查詢餐廳是否仍在營業。
6. 如果公開資料明確顯示永久歇業，businessStatus 回傳 PermanentlyClosed。
7. 如果只是找不到資料，不要推論為歇業，請回傳 Unknown。
8. 需要查詢營業時間，並盡量轉換成 openingHoursStructured。
9. 如果營業時間無法可靠解析，openingHoursStructured 回傳空物件，todayOpenStatus 回傳 Unknown。
10. 價位請使用 $, $$, $$$, $$$$。
11. tags、suitableFor、mealTime 優先使用繁體中文。
12. mealTime 只能使用 早餐、午餐、晚餐、宵夜。
13. 不要亂產生 GooglePlaceID；若無法可靠取得，留空。
14. sourceUrls 請列出主要資料來源。
15. 回傳必須是有效 JSON，不要包含 markdown，不要加註解。

如果可以明確辨識餐廳，請只回傳以下 JSON 欄位：
{
  "name": "",
  "country": "",
  "city": "",
  "district": "",
  "address": "",
  "latitude": "",
  "longitude": "",
  "timezone": "",
  "cuisine": "",
  "priceLevel": "",
  "currency": "",
  "tags": [],
  "suitableFor": [],
  "mealTime": [],
  "openingHoursRaw": "",
  "openingHoursStructured": {},
  "todayOpenStatus": "Unknown",
  "nextOpenTime": "",
  "businessStatus": "Unknown",
  "businessStatusLastChecked": "",
  "mapUrl": "",
  "originalMapUrl": "",
  "googlePlaceId": "",
  "phone": "",
  "websiteUrl": "",
  "aiSummary": "",
  "aiConfidence": "medium",
  "sourceUrls": []
}

如果無法明確判斷是哪一家，請只回傳：
{
  "needsUserSelection": true,
  "candidates": [
    {
      "name": "",
      "country": "",
      "city": "",
      "district": "",
      "address": "",
      "mapUrl": ""
    }
  ]
}

餐廳名稱：${input.restaurantName}
國家提示：${input.countryHint}
城市提示：${input.cityHint}
區域提示：${input.districtHint}
Google Maps URL：${input.googleMapsUrl}
原始輸入：${input.originalInput}`;
}

function parseJsonObject(value: string): JsonRecord {
  const trimmedValue = value.trim();
  const jsonText = trimmedValue
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(jsonText) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OpenAI response was not a JSON object.");
  }

  return parsed as JsonRecord;
}

function normalizeParsedRestaurantInput(
  value: JsonRecord,
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

function normalizeEnrichRestaurantResult(value: JsonRecord): EnrichRestaurantResult {
  if (value.needsUserSelection === true) {
    return {
      candidates: toCandidates(value.candidates),
      needsUserSelection: true,
    };
  }

  return normalizeEnrichedRestaurant(value);
}

function normalizeEnrichedRestaurant(value: JsonRecord): EnrichedRestaurant {
  return {
    address: toStringValue(value.address),
    aiConfidence: normalizeAIConfidence(value.aiConfidence),
    aiSummary: toStringValue(value.aiSummary),
    businessStatus: normalizeBusinessStatus(value.businessStatus),
    businessStatusLastChecked: toStringValue(value.businessStatusLastChecked),
    city: toStringValue(value.city),
    country: toStringValue(value.country),
    cuisine: toStringValue(value.cuisine),
    currency: toStringValue(value.currency),
    district: toStringValue(value.district),
    googlePlaceId: toStringValue(value.googlePlaceId),
    latitude: toStringValue(value.latitude),
    longitude: toStringValue(value.longitude),
    mapUrl: toStringValue(value.mapUrl),
    mealTime: normalizeMealTime(value.mealTime),
    name: toStringValue(value.name),
    nextOpenTime: toStringValue(value.nextOpenTime),
    openingHoursRaw: toStringValue(value.openingHoursRaw),
    openingHoursStructured: toOpeningHoursStructured(
      value.openingHoursStructured,
    ),
    originalMapUrl: toStringValue(value.originalMapUrl),
    phone: toStringValue(value.phone),
    priceLevel: normalizePriceLevel(value.priceLevel),
    sourceUrls: toStringArray(value.sourceUrls),
    suitableFor: toStringArray(value.suitableFor),
    tags: toStringArray(value.tags),
    timezone: toStringValue(value.timezone),
    todayOpenStatus: normalizeTodayOpenStatus(value.todayOpenStatus),
    websiteUrl: toStringValue(value.websiteUrl),
  };
}

function toCandidates(value: unknown): RestaurantCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((candidate): candidate is JsonRecord =>
      Boolean(candidate) &&
      typeof candidate === "object" &&
      !Array.isArray(candidate),
    )
    .map((candidate) => ({
      address: toStringValue(candidate.address),
      city: toStringValue(candidate.city),
      country: toStringValue(candidate.country),
      district: toStringValue(candidate.district),
      mapUrl: toStringValue(candidate.mapUrl),
      name: toStringValue(candidate.name),
    }));
}

function toOpeningHoursStructured(
  value: unknown,
): Record<string, OpeningHoursPeriod[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, OpeningHoursPeriod[]> = {};

  for (const [day, periods] of Object.entries(value)) {
    if (!Array.isArray(periods)) {
      continue;
    }

    const normalizedPeriods = periods
      .filter((period): period is JsonRecord =>
        Boolean(period) && typeof period === "object" && !Array.isArray(period),
      )
      .map((period) => ({
        close: toStringValue(period.close),
        open: toStringValue(period.open),
      }))
      .filter((period) => period.open || period.close);

    if (normalizedPeriods.length > 0) {
      normalized[day] = normalizedPeriods;
    }
  }

  return normalized;
}

function normalizeTodayOpenStatus(value: unknown): TodayOpenStatus {
  const status = toStringValue(value);
  const allowedStatuses: TodayOpenStatus[] = [
    "OpenNow",
    "ClosedNow",
    "ClosedToday",
    "Unknown",
  ];

  return allowedStatuses.includes(status as TodayOpenStatus)
    ? (status as TodayOpenStatus)
    : "Unknown";
}

function normalizeBusinessStatus(value: unknown): BusinessStatus {
  const status = toStringValue(value);
  const allowedStatuses: BusinessStatus[] = [
    "Operational",
    "TemporarilyClosed",
    "PermanentlyClosed",
    "Unknown",
  ];

  return allowedStatuses.includes(status as BusinessStatus)
    ? (status as BusinessStatus)
    : "Unknown";
}

function normalizeAIConfidence(value: unknown): AIConfidence {
  const confidence = toStringValue(value);
  const allowedConfidence: AIConfidence[] = ["high", "medium", "low"];

  return allowedConfidence.includes(confidence as AIConfidence)
    ? (confidence as AIConfidence)
    : "medium";
}

function normalizePriceLevel(value: unknown): string {
  const priceLevel = toStringValue(value);

  return ["$", "$$", "$$$", "$$$$"].includes(priceLevel) ? priceLevel : "";
}

function normalizeMealTime(value: unknown): string[] {
  const allowedMealTime = ["早餐", "午餐", "晚餐", "宵夜"];

  return toStringArray(value).filter((mealTime) =>
    allowedMealTime.includes(mealTime),
  );
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
