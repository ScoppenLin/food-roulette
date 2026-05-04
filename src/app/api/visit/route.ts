import { NextRequest, NextResponse } from "next/server";
import {
  findRestaurantRowNumberById,
  getRestaurants,
  updateRestaurantRow,
} from "@/lib/googleSheets";

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

    const now = new Date().toISOString();
    const updatedRestaurant = {
      ...restaurant,
      lastVisited: now,
      updatedAt: now,
      visitCount: restaurant.visitCount + 1,
    };

    await updateRestaurantRow(rowNumber, updatedRestaurant);

    return NextResponse.json({ ok: true, restaurant: updatedRestaurant });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record visit.";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
