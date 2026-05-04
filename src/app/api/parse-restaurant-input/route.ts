import { NextRequest, NextResponse } from "next/server";
import { parseRestaurantInput } from "@/lib/openai";
import type { InputType } from "@/types/restaurant";

export const runtime = "nodejs";

const allowedInputTypes: InputType[] = [
  "Text",
  "GoogleMapsURL",
  "Mixed",
  "Manual",
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      inputText?: unknown;
      inputType?: unknown;
    };
    const inputText = typeof body.inputText === "string" ? body.inputText : "";
    const inputType = normalizeInputType(body.inputType);

    if (!inputText.trim()) {
      return NextResponse.json(
        { error: "inputText is required.", ok: false },
        { status: 400 },
      );
    }

    const parsed = await parseRestaurantInput({
      inputText,
      inputType,
    });

    return NextResponse.json({ ok: true, parsed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse input.";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

function normalizeInputType(value: unknown): InputType {
  return allowedInputTypes.includes(value as InputType)
    ? (value as InputType)
    : "Text";
}
