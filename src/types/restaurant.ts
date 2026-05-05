export type InputType = "Text" | "GoogleMapsURL" | "Mixed" | "Manual";

export type TodayOpenStatus =
  | "OpenNow"
  | "ClosedNow"
  | "ClosedToday"
  | "Unknown";

export type BusinessStatus =
  | "Operational"
  | "TemporarilyClosed"
  | "PermanentlyClosed"
  | "Unknown";

export type SourceType =
  | "Neutral"
  | "SelfVisited"
  | "FriendRecommended"
  | "IGRecommended"
  | "BlogRecommended"
  | "GoogleMapFound"
  | "CustomerMeal"
  | "BusinessContact"
  | "Other";

export type RestaurantStatus = "Active" | "Pause" | "Blacklist";

export type AIConfidence = "high" | "medium" | "low";

export type LocationArea =
  | "台中家附近"
  | "汐止家附近"
  | "公司附近"
  | "台北市區"
  | "台中市郊"
  | "台北市郊";

export interface OpeningHoursPeriod {
  open: string;
  close: string;
}

export interface Restaurant {
  id: string;
  name: string;
  originalInput: string;
  inputType: InputType;

  countryHint?: string;
  cityHint?: string;
  districtHint?: string;

  country?: string;
  city?: string;
  district?: string;
  locationAreas: LocationArea[];
  address?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;

  cuisine?: string;
  priceLevel?: string;
  currency?: string;
  tags: string[];
  suitableFor: string[];
  mealTime: string[];

  openingHoursRaw?: string;
  openingHoursStructured?: Record<string, OpeningHoursPeriod[]>;
  todayOpenStatus: TodayOpenStatus;
  nextOpenTime?: string;
  businessStatus: BusinessStatus;
  businessStatusLastChecked?: string;

  mapUrl?: string;
  originalMapUrl?: string;
  googlePlaceId?: string;
  phone?: string;
  websiteUrl?: string;

  personalRating?: number;
  personalNote?: string;
  status: RestaurantStatus;
  mustTry: boolean;
  avoidNow: boolean;

  sourceType: SourceType;
  sourceName?: string;
  sourceNote?: string;
  sourceReliability: number;

  lastVisited?: string;
  visitCount: number;
  rejectCount: number;
  baseWeight: number;

  aiSummary?: string;
  aiConfidence: AIConfidence;
  sourceUrls: string[];
  lastAIUpdated?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ParsedRestaurantInput {
  restaurantName: string;
  countryHint: string;
  cityHint: string;
  districtHint: string;
  googleMapsUrl: string;
  sourceType: SourceType;
  sourceName: string;
  sourceNote: string;
  sourceReliability: number;
  suitableForHints: string[];
  tagHints: string[];
}

export interface EnrichRestaurantInput {
  restaurantName: string;
  countryHint: string;
  cityHint: string;
  districtHint: string;
  googleMapsUrl: string;
  originalInput: string;
}

export interface RestaurantCandidate {
  name: string;
  country: string;
  city: string;
  district: string;
  address: string;
  mapUrl: string;
}

export interface EnrichedRestaurant {
  name: string;
  country: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  timezone: string;
  cuisine: string;
  priceLevel: string;
  currency: string;
  tags: string[];
  suitableFor: string[];
  mealTime: string[];
  openingHoursRaw: string;
  openingHoursStructured: Record<string, OpeningHoursPeriod[]>;
  todayOpenStatus: TodayOpenStatus;
  nextOpenTime: string;
  businessStatus: BusinessStatus;
  businessStatusLastChecked: string;
  mapUrl: string;
  originalMapUrl: string;
  googlePlaceId: string;
  phone: string;
  websiteUrl: string;
  aiSummary: string;
  aiConfidence: AIConfidence;
  sourceUrls: string[];
}

export type EnrichRestaurantResult =
  | EnrichedRestaurant
  | {
      candidates: RestaurantCandidate[];
      needsUserSelection: true;
    };
