import { NextRequest, NextResponse } from "next/server";
import { getRestaurants } from "@/lib/googleSheets";
import { pickRestaurant, type RouletteFilters } from "@/lib/roulette";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const filters = normalizeFilters(body);
    const restaurants = await getRestaurants();
    const result = pickRestaurant(restaurants, filters);

    if (!result.selected) {
      return NextResponse.json({
        candidates: [],
        ok: true,
        selected: null,
      });
    }

    return NextResponse.json({
      candidates: result.candidates,
      ok: true,
      selected: result.selected,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pick restaurant";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

function normalizeFilters(body: Record<string, unknown>): RouletteFilters {
  return {
    allowLaterOpen: toBoolean(body.allowLaterOpen, true),
    avoidTags: toStringArray(body.avoidTags),
    city: toStringValue(body.city),
    country: toStringValue(body.country),
    district: toStringValue(body.district),
    mealTime: toStringValue(body.mealTime),
    openNowOnly: toBoolean(body.openNowOnly, false),
    priceLevel: toStringValue(body.priceLevel),
    scenario: toStringValue(body.scenario),
    wantTags: toStringArray(body.wantTags),
  };
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
