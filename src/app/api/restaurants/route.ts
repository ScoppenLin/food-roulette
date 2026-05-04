import { NextRequest, NextResponse } from "next/server";
import { appendRestaurant, getRestaurants } from "@/lib/googleSheets";
import type {
  EnrichedRestaurant,
  InputType,
  ParsedRestaurantInput,
  Restaurant,
} from "@/types/restaurant";

export const runtime = "nodejs";

export async function GET() {
  try {
    const restaurants = await getRestaurants();

    return NextResponse.json({ restaurants });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read restaurants";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      enriched?: unknown;
      inputType?: unknown;
      originalInput?: unknown;
      parsed?: unknown;
    };
    const parsed = normalizeParsedRestaurantInput(body.parsed);
    const enriched = normalizeEnrichedRestaurant(body.enriched);
    const originalInput = toStringValue(body.originalInput);
    const inputType = normalizeInputType(body.inputType);

    if (!enriched.name && !parsed.restaurantName) {
      return NextResponse.json(
        { error: "Restaurant name is required.", ok: false },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const restaurant: Restaurant = {
      address: enriched.address || undefined,
      aiConfidence: enriched.aiConfidence,
      aiSummary: enriched.aiSummary || undefined,
      avoidNow: false,
      baseWeight: 5,
      businessStatus: enriched.businessStatus,
      businessStatusLastChecked:
        enriched.businessStatusLastChecked || undefined,
      city: enriched.city || undefined,
      cityHint: parsed.cityHint || undefined,
      country: enriched.country || undefined,
      countryHint: parsed.countryHint || undefined,
      createdAt: now,
      cuisine: enriched.cuisine || undefined,
      currency: enriched.currency || undefined,
      district: enriched.district || undefined,
      districtHint: parsed.districtHint || undefined,
      googlePlaceId: enriched.googlePlaceId || undefined,
      id: crypto.randomUUID(),
      inputType,
      lastAIUpdated: now,
      latitude: enriched.latitude || undefined,
      longitude: enriched.longitude || undefined,
      mapUrl: enriched.mapUrl || parsed.googleMapsUrl || undefined,
      mealTime: enriched.mealTime,
      mustTry: false,
      name: enriched.name || parsed.restaurantName,
      nextOpenTime: enriched.nextOpenTime || undefined,
      openingHoursRaw: enriched.openingHoursRaw || undefined,
      openingHoursStructured: enriched.openingHoursStructured,
      originalInput,
      originalMapUrl:
        enriched.originalMapUrl || parsed.googleMapsUrl || undefined,
      personalNote: undefined,
      personalRating: undefined,
      phone: enriched.phone || undefined,
      priceLevel: enriched.priceLevel || undefined,
      rejectCount: 0,
      sourceName: parsed.sourceName || undefined,
      sourceNote: parsed.sourceNote || undefined,
      sourceReliability: parsed.sourceReliability,
      sourceType: parsed.sourceType,
      sourceUrls: enriched.sourceUrls,
      status: "Active",
      suitableFor: mergeStringLists(
        enriched.suitableFor,
        parsed.suitableForHints,
      ),
      tags: mergeStringLists(enriched.tags, parsed.tagHints),
      timezone: enriched.timezone || undefined,
      todayOpenStatus: enriched.todayOpenStatus,
      updatedAt: now,
      visitCount: 0,
      websiteUrl: enriched.websiteUrl || undefined,
    };

    await appendRestaurant(restaurant);

    return NextResponse.json({ ok: true, restaurant });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add restaurant";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

function normalizeParsedRestaurantInput(value: unknown): ParsedRestaurantInput {
  const record = toRecord(value);
  const sourceType = toStringValue(record.sourceType);

  return {
    cityHint: toStringValue(record.cityHint),
    countryHint: toStringValue(record.countryHint),
    districtHint: toStringValue(record.districtHint),
    googleMapsUrl: toStringValue(record.googleMapsUrl),
    restaurantName: toStringValue(record.restaurantName),
    sourceName: toStringValue(record.sourceName),
    sourceNote: toStringValue(record.sourceNote),
    sourceReliability: clampNumber(record.sourceReliability, 3, 1, 5),
    sourceType: isOneOf(sourceType, [
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
      ? sourceType
      : "Neutral",
    suitableForHints: toStringArray(record.suitableForHints),
    tagHints: toStringArray(record.tagHints),
  };
}

function normalizeEnrichedRestaurant(value: unknown): EnrichedRestaurant {
  const record = toRecord(value);
  const aiConfidence = toStringValue(record.aiConfidence);
  const businessStatus = toStringValue(record.businessStatus);
  const todayOpenStatus = toStringValue(record.todayOpenStatus);

  return {
    address: toStringValue(record.address),
    aiConfidence: isOneOf(aiConfidence, ["high", "medium", "low"])
      ? aiConfidence
      : "medium",
    aiSummary: toStringValue(record.aiSummary),
    businessStatus: isOneOf(businessStatus, [
      "Operational",
      "TemporarilyClosed",
      "PermanentlyClosed",
      "Unknown",
    ])
      ? businessStatus
      : "Unknown",
    businessStatusLastChecked: toStringValue(record.businessStatusLastChecked),
    city: toStringValue(record.city),
    country: toStringValue(record.country),
    cuisine: toStringValue(record.cuisine),
    currency: toStringValue(record.currency),
    district: toStringValue(record.district),
    googlePlaceId: toStringValue(record.googlePlaceId),
    latitude: toStringValue(record.latitude),
    longitude: toStringValue(record.longitude),
    mapUrl: toStringValue(record.mapUrl),
    mealTime: toStringArray(record.mealTime),
    name: toStringValue(record.name),
    nextOpenTime: toStringValue(record.nextOpenTime),
    openingHoursRaw: toStringValue(record.openingHoursRaw),
    openingHoursStructured: toOpeningHoursStructured(
      record.openingHoursStructured,
    ),
    originalMapUrl: toStringValue(record.originalMapUrl),
    phone: toStringValue(record.phone),
    priceLevel: toStringValue(record.priceLevel),
    sourceUrls: toStringArray(record.sourceUrls),
    suitableFor: toStringArray(record.suitableFor),
    tags: toStringArray(record.tags),
    timezone: toStringValue(record.timezone),
    todayOpenStatus: isOneOf(todayOpenStatus, [
      "OpenNow",
      "ClosedNow",
      "ClosedToday",
      "Unknown",
    ])
      ? todayOpenStatus
      : "Unknown",
    websiteUrl: toStringValue(record.websiteUrl),
  };
}

function normalizeInputType(value: unknown): InputType {
  const inputType = toStringValue(value);

  return isOneOf(inputType, ["Text", "GoogleMapsURL", "Mixed", "Manual"])
    ? inputType
    : "Manual";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

function toOpeningHoursStructured(
  value: unknown,
): Restaurant["openingHoursStructured"] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Restaurant["openingHoursStructured"])
    : {};
}

function mergeStringLists(first: string[], second: string[]): string[] {
  return Array.from(new Set([...first, ...second].filter(Boolean)));
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function isOneOf<T extends string>(
  value: string,
  allowedValues: readonly T[],
): value is T {
  return allowedValues.includes(value as T);
}
