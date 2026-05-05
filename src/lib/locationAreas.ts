import type { LocationArea, Restaurant } from "@/types/restaurant";

export const locationAreaOptions = [
  "台中家附近",
  "汐止家附近",
  "公司附近",
  "台北市區",
  "台中市郊",
  "台北市郊",
] as const satisfies readonly LocationArea[];

export const defaultLocationArea: LocationArea = "台中家附近";

export function isLocationArea(value: string): value is LocationArea {
  return locationAreaOptions.includes(value as LocationArea);
}

export function normalizeLocationAreas(values: string[]): LocationArea[] {
  return values.filter(isLocationArea);
}

export function restaurantMatchesLocationArea(
  restaurant: Restaurant,
  locationArea: LocationArea,
): boolean {
  const explicitAreas = restaurant.locationAreas ?? [];

  if (explicitAreas.length > 0) {
    return explicitAreas.includes(locationArea);
  }

  return inferLocationAreas(restaurant).includes(locationArea);
}

export function inferLocationAreas(restaurant: Restaurant): LocationArea[] {
  const text = normalizeText(
    [
      restaurant.country,
      restaurant.city,
      restaurant.district,
      restaurant.address,
      ...restaurant.tags,
    ].join(" "),
  );
  const areas = new Set<LocationArea>();

  if (text.includes("台中")) {
    areas.add("台中家附近");
  }

  if (text.includes("汐止")) {
    areas.add("汐止家附近");
    areas.add("台北市郊");
  }

  if (
    text.includes("台北") ||
    text.includes("臺北") ||
    text.includes("東區") ||
    text.includes("大安") ||
    text.includes("信義") ||
    text.includes("中山") ||
    text.includes("松山")
  ) {
    areas.add("台北市區");
  }

  if (
    text.includes("新北") ||
    text.includes("基隆") ||
    text.includes("坪林") ||
    text.includes("淡水") ||
    text.includes("三峽") ||
    text.includes("鶯歌")
  ) {
    areas.add("台北市郊");
  }

  if (
    text.includes("清水") ||
    text.includes("沙鹿") ||
    text.includes("大甲") ||
    text.includes("豐原") ||
    text.includes("后里") ||
    text.includes("霧峰")
  ) {
    areas.add("台中市郊");
  }

  if (text.includes("公司附近")) {
    areas.add("公司附近");
  }

  return Array.from(areas);
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}
