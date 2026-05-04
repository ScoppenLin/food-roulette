import { NextResponse } from "next/server";
import { getRestaurants } from "@/lib/googleSheets";

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
