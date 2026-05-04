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
