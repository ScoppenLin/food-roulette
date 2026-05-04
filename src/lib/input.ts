import type { InputType } from "@/types/restaurant";

const GOOGLE_MAPS_URL_PATTERN =
  /https?:\/\/(?:maps\.app\.goo\.gl|(?:www\.)?google\.[^\s/]+\/maps|goo\.gl\/maps)\/[^\s"'<>]+/i;

export function extractGoogleMapsUrl(inputText: string): string | null {
  const match = inputText.match(GOOGLE_MAPS_URL_PATTERN);

  return match?.[0] ?? null;
}

export function detectInputType(inputText: string): InputType {
  const trimmedInput = inputText.trim();
  const googleMapsUrl = extractGoogleMapsUrl(trimmedInput);

  if (!googleMapsUrl) {
    return "Text";
  }

  const textWithoutUrl = trimmedInput.replace(googleMapsUrl, "").trim();

  return textWithoutUrl.length > 0 ? "Mixed" : "GoogleMapsURL";
}

export function splitCommaText(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaText(values?: string[]): string {
  if (!values) {
    return "";
  }

  return values.map((value) => value.trim()).filter(Boolean).join(",");
}
