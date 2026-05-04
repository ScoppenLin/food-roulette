import { NextRequest, NextResponse } from "next/server";
import {
  findRestaurantRowNumberById,
  getRestaurants,
  updateRestaurantRow,
} from "@/lib/googleSheets";
import { enrichRestaurant } from "@/lib/openai";
import { mergeEnrichedRestaurant } from "@/lib/restaurantMerge";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { restaurantId?: unknown };
    const restaurantId =
      typeof body.restaurantId === "string" ? body.restaurantId : "";

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required.", ok: false },
        { status: 400 },
      );
    }

    const restaurants = await getRestaurants();
    const restaurant = restaurants.find((item) => item.id === restaurantId);
    const rowNumber = await findRestaurantRowNumberById(restaurantId);

    if (!restaurant || !rowNumber) {
      return NextResponse.json(
        { error: "Restaurant not found.", ok: false },
        { status: 404 },
      );
    }

    const enriched = await enrichRestaurant({
      cityHint: restaurant.cityHint ?? restaurant.city ?? "",
      countryHint: restaurant.countryHint ?? restaurant.country ?? "",
      districtHint: restaurant.districtHint ?? restaurant.district ?? "",
      googleMapsUrl: restaurant.originalMapUrl ?? restaurant.mapUrl ?? "",
      originalInput: restaurant.originalInput,
      restaurantName: restaurant.name,
    });

    if ("needsUserSelection" in enriched) {
      return NextResponse.json({
        candidates: enriched.candidates,
        needsUserSelection: true,
        ok: true,
      });
    }

    const updatedRestaurant = mergeEnrichedRestaurant(restaurant, enriched);

    await updateRestaurantRow(rowNumber, updatedRestaurant);

    return NextResponse.json({ ok: true, restaurant: updatedRestaurant });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh restaurant.";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
