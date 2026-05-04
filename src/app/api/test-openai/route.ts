import { NextResponse } from "next/server";
import { testOpenAIConnection } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await testOpenAIConnection();

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI API test failed";

    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
