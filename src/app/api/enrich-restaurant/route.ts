import { NextRequest, NextResponse } from "next/server";
import { enrichRestaurant } from "@/lib/openai";
import type { EnrichRestaurantInput } from "@/types/restaurant";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<
      Record<keyof EnrichRestaurantInput, unknown>
    >;
    const input: EnrichRestaurantInput = {
      cityHint: toStringValue(body.cityHint),
      countryHint: toStringValue(body.countryHint),
      districtHint: toStringValue(body.districtHint),
      googleMapsUrl: toStringValue(body.googleMapsUrl),
      originalInput: toStringValue(body.originalInput),
      restaurantName: toStringValue(body.restaurantName),
    };

    if (!input.restaurantName.trim() && !input.googleMapsUrl.trim()) {
      return NextResponse.json(
        { error: "restaurantName or googleMapsUrl is required.", ok: false },
        { status: 400 },
      );
    }

    const enriched = await enrichRestaurant(input);

    return NextResponse.json({ enriched, ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to enrich restaurant.";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
