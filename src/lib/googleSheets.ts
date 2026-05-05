import { createSign } from "crypto";
import type {
  AIConfidence,
  BusinessStatus,
  InputType,
  LocationArea,
  Restaurant,
  RestaurantStatus,
  SourceType,
  TodayOpenStatus,
} from "@/types/restaurant";
import { joinCommaText, splitCommaText } from "@/lib/input";
import { normalizeLocationAreas } from "@/lib/locationAreas";

const SHEET_NAME = "Restaurants";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export const restaurantSheetHeaders = [
  "ID",
  "Name",
  "OriginalInput",
  "InputType",
  "CountryHint",
  "CityHint",
  "DistrictHint",
  "Country",
  "City",
  "District",
  "Address",
  "Latitude",
  "Longitude",
  "Timezone",
  "Cuisine",
  "PriceLevel",
  "Currency",
  "Tags",
  "SuitableFor",
  "MealTime",
  "OpeningHoursRaw",
  "OpeningHoursStructured",
  "TodayOpenStatus",
  "NextOpenTime",
  "BusinessStatus",
  "BusinessStatusLastChecked",
  "MapURL",
  "OriginalMapURL",
  "GooglePlaceID",
  "Phone",
  "WebsiteURL",
  "PersonalRating",
  "PersonalNote",
  "Status",
  "MustTry",
  "AvoidNow",
  "SourceType",
  "SourceName",
  "SourceNote",
  "SourceReliability",
  "LastVisited",
  "VisitCount",
  "RejectCount",
  "BaseWeight",
  "AI_Summary",
  "AI_Confidence",
  "SourceURLs",
  "LastAIUpdated",
  "CreatedAt",
  "UpdatedAt",
  "LocationAreas",
] as const;

type RestaurantSheetHeader = (typeof restaurantSheetHeaders)[number];
type SheetRow = Record<RestaurantSheetHeader, string>;

interface GoogleSheetsValuesResponse {
  values?: string[][];
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getRestaurants(): Promise<Restaurant[]> {
  const values = await getSheetValues(`${SHEET_NAME}!A:AY`);
  const [headerRow, ...dataRows] = values;

  if (!headerRow) {
    return [];
  }

  return dataRows
    .map((row) => rowToSheetRow(headerRow, row))
    .filter((row) => row.ID || row.Name)
    .map(sheetRowToRestaurant);
}

export async function appendRestaurant(restaurant: Restaurant): Promise<void> {
  await appendSheetValues(`${SHEET_NAME}!A:AY`, [
    restaurantToSheetRow(restaurant),
  ]);
}

export async function updateRestaurantRow(
  rowNumber: number,
  restaurant: Restaurant,
): Promise<void> {
  await updateSheetValues(`${SHEET_NAME}!A${rowNumber}:AY${rowNumber}`, [
    restaurantToSheetRow(restaurant),
  ]);
}

export async function findRestaurantRowNumberById(
  id: string,
): Promise<number | null> {
  const values = await getSheetValues(`${SHEET_NAME}!A:A`);
  const rowIndex = values.findIndex((row) => row[0] === id);

  return rowIndex >= 0 ? rowIndex + 1 : null;
}

async function getSheetValues(range: string): Promise<string[][]> {
  const response = await googleSheetsFetch<GoogleSheetsValuesResponse>(
    `/values/${encodeURIComponent(range)}`,
  );

  return response.values ?? [];
}

async function appendSheetValues(
  range: string,
  values: string[][],
): Promise<void> {
  await googleSheetsFetch(
    `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      body: JSON.stringify({ values }),
      method: "POST",
    },
  );
}

async function updateSheetValues(
  range: string,
  values: string[][],
): Promise<void> {
  await googleSheetsFetch(
    `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      body: JSON.stringify({ values }),
      method: "PUT",
    },
  );
}

async function googleSheetsFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const sheetId = getRequiredEnv("GOOGLE_SHEET_ID");
  const accessToken = await getGoogleAccessToken();
  let response: Response;

  try {
    response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      },
    );
  } catch (error) {
    throw new Error(
      `Google Sheets API network request failed: ${formatError(error)}`,
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Sheets API failed with ${response.status}: ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const assertion = createServiceAccountJwt();
  let response: Response;

  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      body: new URLSearchParams({
        assertion,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
  } catch (error) {
    throw new Error(
      `Google token network request failed: ${formatError(error)}`,
    );
  }

  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Google token request failed: ${
        payload.error_description ?? payload.error ?? response.status
      }`,
    );
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };

  return cachedToken.accessToken;
}

function createServiceAccountJwt(): string {
  const serviceAccountEmail = getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = normalizePrivateKey(getRequiredEnv("GOOGLE_PRIVATE_KEY"));
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64UrlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  );
  const encodedClaimSet = base64UrlEncode(
    JSON.stringify({
      aud: GOOGLE_TOKEN_URL,
      exp: now + 3600,
      iat: now,
      iss: serviceAccountEmail,
      scope: GOOGLE_SHEETS_SCOPE,
    }),
  );
  const unsignedJwt = `${encodedHeader}.${encodedClaimSet}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(privateKey);

  return `${unsignedJwt}.${base64UrlEncode(signature)}`;
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.cause
      ? `${error.message}; cause: ${String(error.cause)}`
      : error.message;
  }

  return String(error);
}

function rowToSheetRow(headerRow: string[], row: string[]): SheetRow {
  return restaurantSheetHeaders.reduce((record, header) => {
    const index = headerRow.indexOf(header);
    record[header] = index >= 0 ? (row[index] ?? "") : "";

    return record;
  }, {} as SheetRow);
}

function sheetRowToRestaurant(row: SheetRow): Restaurant {
  return {
    address: emptyToUndefined(row.Address),
    aiConfidence: toAIConfidence(row.AI_Confidence),
    aiSummary: emptyToUndefined(row.AI_Summary),
    avoidNow: toBoolean(row.AvoidNow),
    baseWeight: toNumber(row.BaseWeight, 5),
    businessStatus: toBusinessStatus(row.BusinessStatus),
    businessStatusLastChecked: emptyToUndefined(row.BusinessStatusLastChecked),
    city: emptyToUndefined(row.City),
    cityHint: emptyToUndefined(row.CityHint),
    country: emptyToUndefined(row.Country),
    countryHint: emptyToUndefined(row.CountryHint),
    createdAt: row.CreatedAt,
    cuisine: emptyToUndefined(row.Cuisine),
    currency: emptyToUndefined(row.Currency),
    district: emptyToUndefined(row.District),
    districtHint: emptyToUndefined(row.DistrictHint),
    googlePlaceId: emptyToUndefined(row.GooglePlaceID),
    id: row.ID,
    inputType: toInputType(row.InputType),
    lastAIUpdated: emptyToUndefined(row.LastAIUpdated),
    lastVisited: emptyToUndefined(row.LastVisited),
    latitude: emptyToUndefined(row.Latitude),
    longitude: emptyToUndefined(row.Longitude),
    locationAreas: toLocationAreas(row.LocationAreas),
    mapUrl: emptyToUndefined(row.MapURL),
    mealTime: splitCommaText(row.MealTime),
    mustTry: toBoolean(row.MustTry),
    name: row.Name,
    nextOpenTime: emptyToUndefined(row.NextOpenTime),
    openingHoursRaw: emptyToUndefined(row.OpeningHoursRaw),
    openingHoursStructured: parseOpeningHours(row.OpeningHoursStructured),
    originalInput: row.OriginalInput,
    originalMapUrl: emptyToUndefined(row.OriginalMapURL),
    personalNote: emptyToUndefined(row.PersonalNote),
    personalRating: toOptionalNumber(row.PersonalRating),
    phone: emptyToUndefined(row.Phone),
    priceLevel: emptyToUndefined(row.PriceLevel),
    rejectCount: toNumber(row.RejectCount, 0),
    sourceName: emptyToUndefined(row.SourceName),
    sourceNote: emptyToUndefined(row.SourceNote),
    sourceReliability: toNumber(row.SourceReliability, 3),
    sourceType: toSourceType(row.SourceType),
    sourceUrls: parseSourceUrls(row.SourceURLs),
    status: toRestaurantStatus(row.Status),
    suitableFor: splitCommaText(row.SuitableFor),
    tags: splitCommaText(row.Tags),
    timezone: emptyToUndefined(row.Timezone),
    todayOpenStatus: toTodayOpenStatus(row.TodayOpenStatus),
    updatedAt: row.UpdatedAt,
    visitCount: toNumber(row.VisitCount, 0),
    websiteUrl: emptyToUndefined(row.WebsiteURL),
  };
}

function restaurantToSheetRow(restaurant: Restaurant): string[] {
  return [
    restaurant.id,
    restaurant.name,
    restaurant.originalInput,
    restaurant.inputType,
    restaurant.countryHint ?? "",
    restaurant.cityHint ?? "",
    restaurant.districtHint ?? "",
    restaurant.country ?? "",
    restaurant.city ?? "",
    restaurant.district ?? "",
    restaurant.address ?? "",
    restaurant.latitude ?? "",
    restaurant.longitude ?? "",
    restaurant.timezone ?? "",
    restaurant.cuisine ?? "",
    restaurant.priceLevel ?? "",
    restaurant.currency ?? "",
    joinCommaText(restaurant.tags),
    joinCommaText(restaurant.suitableFor),
    joinCommaText(restaurant.mealTime),
    restaurant.openingHoursRaw ?? "",
    JSON.stringify(restaurant.openingHoursStructured ?? {}),
    restaurant.todayOpenStatus,
    restaurant.nextOpenTime ?? "",
    restaurant.businessStatus,
    restaurant.businessStatusLastChecked ?? "",
    restaurant.mapUrl ?? "",
    restaurant.originalMapUrl ?? "",
    restaurant.googlePlaceId ?? "",
    restaurant.phone ?? "",
    restaurant.websiteUrl ?? "",
    restaurant.personalRating?.toString() ?? "",
    restaurant.personalNote ?? "",
    restaurant.status,
    booleanToSheetValue(restaurant.mustTry),
    booleanToSheetValue(restaurant.avoidNow),
    restaurant.sourceType,
    restaurant.sourceName ?? "",
    restaurant.sourceNote ?? "",
    restaurant.sourceReliability.toString(),
    restaurant.lastVisited ?? "",
    restaurant.visitCount.toString(),
    restaurant.rejectCount.toString(),
    restaurant.baseWeight.toString(),
    restaurant.aiSummary ?? "",
    restaurant.aiConfidence,
    joinCommaText(restaurant.sourceUrls),
    restaurant.lastAIUpdated ?? "",
    restaurant.createdAt,
    restaurant.updatedAt,
    joinCommaText(restaurant.locationAreas),
  ];
}

function emptyToUndefined(value: string): string | undefined {
  return value || undefined;
}

function booleanToSheetValue(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

function toBoolean(value: string): boolean {
  return value.toUpperCase() === "TRUE";
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: string): number | undefined {
  return value ? toNumber(value, 0) : undefined;
}

function parseOpeningHours(value: string): Restaurant["openingHoursStructured"] {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as Restaurant["openingHoursStructured"];
  } catch {
    return {};
  }
}

function parseSourceUrls(value: string): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : splitCommaText(value);
  } catch {
    return splitCommaText(value);
  }
}

function toLocationAreas(value: string): LocationArea[] {
  return normalizeLocationAreas(splitCommaText(value));
}

function toInputType(value: string): InputType {
  return isOneOf<InputType>(value, ["Text", "GoogleMapsURL", "Mixed", "Manual"])
    ? value
    : "Manual";
}

function toTodayOpenStatus(value: string): TodayOpenStatus {
  return isOneOf<TodayOpenStatus>(value, [
    "OpenNow",
    "ClosedNow",
    "ClosedToday",
    "Unknown",
  ])
    ? value
    : "Unknown";
}

function toBusinessStatus(value: string): BusinessStatus {
  return isOneOf<BusinessStatus>(value, [
    "Operational",
    "TemporarilyClosed",
    "PermanentlyClosed",
    "Unknown",
  ])
    ? value
    : "Unknown";
}

function toSourceType(value: string): SourceType {
  return isOneOf<SourceType>(value, [
    "Neutral",
    "SelfVisited",
    "FriendRecommended",
    "IGRecommended",
    "BlogRecommended",
    "GoogleMapFound",
    "CustomerMeal",
    "BusinessContact",
    "Other",
  ])
    ? value
    : "Neutral";
}

function toRestaurantStatus(value: string): RestaurantStatus {
  return isOneOf<RestaurantStatus>(value, ["Active", "Pause", "Blacklist"])
    ? value
    : "Active";
}

function toAIConfidence(value: string): AIConfidence {
  return isOneOf<AIConfidence>(value, ["high", "medium", "low"])
    ? value
    : "low";
}

function isOneOf<T extends string>(
  value: string,
  allowedValues: readonly T[],
): value is T {
  return allowedValues.includes(value as T);
}
