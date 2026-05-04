import type { EnrichedRestaurant, Restaurant } from "@/types/restaurant";

export function mergeEnrichedRestaurant(
  restaurant: Restaurant,
  enriched: EnrichedRestaurant,
  now = new Date().toISOString(),
): Restaurant {
  return {
    ...restaurant,
    address: enriched.address || restaurant.address,
    aiConfidence: enriched.aiConfidence,
    aiSummary: enriched.aiSummary || restaurant.aiSummary,
    businessStatus: enriched.businessStatus,
    businessStatusLastChecked: enriched.businessStatusLastChecked || now,
    city: enriched.city || restaurant.city,
    country: enriched.country || restaurant.country,
    cuisine: enriched.cuisine || restaurant.cuisine,
    currency: enriched.currency || restaurant.currency,
    district: enriched.district || restaurant.district,
    googlePlaceId: enriched.googlePlaceId || restaurant.googlePlaceId,
    lastAIUpdated: now,
    latitude: enriched.latitude || restaurant.latitude,
    longitude: enriched.longitude || restaurant.longitude,
    mapUrl: enriched.mapUrl || restaurant.mapUrl,
    mealTime: mergeStringLists(restaurant.mealTime, enriched.mealTime),
    name: enriched.name || restaurant.name,
    nextOpenTime: enriched.nextOpenTime || restaurant.nextOpenTime,
    openingHoursRaw: enriched.openingHoursRaw || restaurant.openingHoursRaw,
    openingHoursStructured: enriched.openingHoursStructured,
    originalMapUrl: enriched.originalMapUrl || restaurant.originalMapUrl,
    phone: enriched.phone || restaurant.phone,
    priceLevel: enriched.priceLevel || restaurant.priceLevel,
    sourceUrls: mergeStringLists(restaurant.sourceUrls, enriched.sourceUrls),
    suitableFor: mergeStringLists(restaurant.suitableFor, enriched.suitableFor),
    tags: mergeStringLists(restaurant.tags, enriched.tags),
    timezone: enriched.timezone || restaurant.timezone,
    todayOpenStatus: enriched.todayOpenStatus,
    updatedAt: now,
    websiteUrl: enriched.websiteUrl || restaurant.websiteUrl,
  };
}

function mergeStringLists(first: string[], second: string[]): string[] {
  return Array.from(new Set([...first, ...second].filter(Boolean)));
}
