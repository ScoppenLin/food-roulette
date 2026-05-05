import type { LocationArea, Restaurant } from "@/types/restaurant";
import { restaurantMatchesLocationArea } from "@/lib/locationAreas";

export interface RouletteFilters {
  allowLaterOpen?: boolean;
  avoidTags?: string[];
  city?: string;
  country?: string;
  district?: string;
  locationArea: LocationArea;
  mealTime?: string;
  openNowOnly?: boolean;
  priceLevel?: string;
  scenario?: string;
  wantTags?: string[];
}

export interface ScoredRestaurant {
  restaurant: Restaurant;
  score: number;
}

export interface RouletteResult {
  candidates: ScoredRestaurant[];
  selected: ScoredRestaurant | null;
}

export function filterRestaurants(
  restaurants: Restaurant[],
  filters: RouletteFilters,
): Restaurant[] {
  return restaurants.filter((restaurant) =>
    isRestaurantAllowed(restaurant, filters),
  );
}

export function scoreRestaurant(
  restaurant: Restaurant,
  filters: RouletteFilters,
  now = new Date(),
): number {
  let score = restaurant.baseWeight;

  if ((restaurant.personalRating ?? 0) >= 4) {
    score += 3;
  }

  if (restaurant.mustTry) {
    score += 5;
  }

  score += countMatches(restaurant.tags, filters.wantTags) * 3;

  if (
    filters.scenario &&
    hasTextMatch([...restaurant.suitableFor, ...restaurant.tags], filters.scenario)
  ) {
    score += 3;
  }

  const daysSinceLastVisit = getDaysSince(restaurant.lastVisited, now);

  if (daysSinceLastVisit !== null) {
    if (daysSinceLastVisit < 7) {
      score -= 5;
    }

    if (daysSinceLastVisit >= 60) {
      score += 4;
    } else if (daysSinceLastVisit >= 30) {
      score += 2;
    }
  }

  if (restaurant.sourceReliability === 5) {
    score += 4;
  } else if (restaurant.sourceReliability === 4) {
    score += 2;
  } else if (restaurant.sourceReliability === 2) {
    score -= 2;
  } else if (restaurant.sourceReliability === 1) {
    score -= 4;
  }

  if (restaurant.sourceType === "SelfVisited") {
    score += 3;
  } else if (restaurant.sourceType === "FriendRecommended") {
    score += 2;
  } else if (restaurant.sourceType === "IGRecommended") {
    score -= 1;
  }

  if (restaurant.rejectCount > 3) {
    score -= 2;
  }

  if (restaurant.aiConfidence === "low") {
    score -= 2;
  }

  if (restaurant.businessStatus === "Unknown") {
    score -= 3;
  }

  if (restaurant.todayOpenStatus === "Unknown") {
    score -= 2;
  }

  if (isOpeningHoursEmpty(restaurant.openingHoursStructured)) {
    score -= 2;
  }

  return Math.max(1, score);
}

export function weightedRandomPick(
  scoredRestaurants: ScoredRestaurant[],
  randomValue = Math.random(),
): ScoredRestaurant | null {
  const totalScore = scoredRestaurants.reduce(
    (sum, candidate) => sum + candidate.score,
    0,
  );

  if (totalScore <= 0) {
    return null;
  }

  let threshold = randomValue * totalScore;

  for (const candidate of scoredRestaurants) {
    threshold -= candidate.score;

    if (threshold <= 0) {
      return candidate;
    }
  }

  return scoredRestaurants.at(-1) ?? null;
}

export function pickRestaurant(
  restaurants: Restaurant[],
  filters: RouletteFilters,
): RouletteResult {
  const candidates = filterRestaurants(restaurants, filters).map((restaurant) => ({
    restaurant,
    score: scoreRestaurant(restaurant, filters),
  }));

  return {
    candidates,
    selected: weightedRandomPick(candidates),
  };
}

function isRestaurantAllowed(
  restaurant: Restaurant,
  filters: RouletteFilters,
): boolean {
  if (restaurant.status !== "Active") {
    return false;
  }

  if (restaurant.avoidNow) {
    return false;
  }

  if (
    restaurant.businessStatus === "PermanentlyClosed" ||
    restaurant.businessStatus === "TemporarilyClosed"
  ) {
    return false;
  }

  if (restaurant.todayOpenStatus === "ClosedToday") {
    return false;
  }

  if (!restaurantMatchesLocationArea(restaurant, filters.locationArea)) {
    return false;
  }

  if (
    restaurant.todayOpenStatus === "ClosedNow" &&
    filters.allowLaterOpen === false
  ) {
    return false;
  }

  if (
    filters.openNowOnly &&
    (restaurant.todayOpenStatus !== "OpenNow" ||
      restaurant.businessStatus !== "Operational")
  ) {
    return false;
  }

  if (hasTextMatch(restaurant.tags, filters.avoidTags)) {
    return false;
  }

  if (!matchesTextFilter(restaurant.country, filters.country)) {
    return false;
  }

  if (!matchesTextFilter(restaurant.city, filters.city)) {
    return false;
  }

  if (!matchesTextFilter(restaurant.district, filters.district)) {
    return false;
  }

  if (!matchesTextFilter(restaurant.priceLevel, filters.priceLevel)) {
    return false;
  }

  if (
    filters.mealTime &&
    !hasTextMatch(restaurant.mealTime, filters.mealTime)
  ) {
    return false;
  }

  if (
    filters.scenario &&
    !hasTextMatch(restaurant.suitableFor, filters.scenario)
  ) {
    return false;
  }

  return true;
}

function matchesTextFilter(value: string | undefined, filter: string | undefined) {
  if (!filter) {
    return true;
  }

  if (!value) {
    return false;
  }

  return normalizeText(value).includes(normalizeText(filter));
}

function hasTextMatch(values: string[], filters: string[] | string | undefined) {
  const normalizedFilters = Array.isArray(filters) ? filters : [filters ?? ""];

  return normalizedFilters.filter(Boolean).some((filter) =>
    values.some((value) => normalizeText(value).includes(normalizeText(filter))),
  );
}

function countMatches(values: string[], filters: string[] | undefined): number {
  if (!filters?.length) {
    return 0;
  }

  return filters.filter((filter) => hasTextMatch(values, filter)).length;
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function getDaysSince(value: string | undefined, now: Date): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((now.getTime() - date.getTime()) / millisecondsPerDay);
}

function isOpeningHoursEmpty(
  openingHours: Restaurant["openingHoursStructured"],
): boolean {
  return !openingHours || Object.keys(openingHours).length === 0;
}
