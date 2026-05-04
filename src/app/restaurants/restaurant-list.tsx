"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AIConfidence,
  BusinessStatus,
  Restaurant,
  SourceType,
  TodayOpenStatus,
} from "@/types/restaurant";

interface RestaurantsResponse {
  restaurants?: Restaurant[];
  error?: string;
}

const businessStatusLabels: Record<BusinessStatus, string> = {
  Operational: "正常營業",
  TemporarilyClosed: "暫時歇業",
  PermanentlyClosed: "已歇業",
  Unknown: "歇業狀態未知",
};

const todayOpenStatusLabels: Record<TodayOpenStatus, string> = {
  OpenNow: "營業中",
  ClosedNow: "目前未營業",
  ClosedToday: "今日未營業",
  Unknown: "營業時間未知",
};

const sourceTypeLabels: Record<SourceType, string> = {
  Neutral: "一般來源",
  SelfVisited: "自己吃過",
  FriendRecommended: "朋友推薦",
  IGRecommended: "社群看到",
  BlogRecommended: "文章推薦",
  GoogleMapFound: "Google Maps",
  CustomerMeal: "客戶餐",
  BusinessContact: "商務介紹",
  Other: "其他來源",
};

const aiConfidenceLabels: Record<AIConfidence, string> = {
  high: "AI 信心 high",
  medium: "AI 信心 medium",
  low: "AI 信心 low",
};

export function RestaurantList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/restaurants");
      const payload = (await response.json()) as RestaurantsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "讀取餐廳清單失敗");
      }

      setRestaurants(payload.restaurants ?? []);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "讀取餐廳清單失敗",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
        正在讀取餐廳清單...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
        {errorMessage}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-stone-950">目前還沒有餐廳</h2>
        <p className="mt-2 leading-7 text-stone-600">
          Google Sheet 已連線成功。之後完成新增流程後，餐廳會出現在這裡。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id || restaurant.name}
          onRefreshDone={loadRestaurants}
          restaurant={restaurant}
        />
      ))}
    </div>
  );
}

function RestaurantCard({
  onRefreshDone,
  restaurant,
}: {
  onRefreshDone: () => Promise<void>;
  restaurant: Restaurant;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const location = [restaurant.country, restaurant.city, restaurant.district]
    .filter(Boolean)
    .join(" / ");
  const tags = restaurant.tags.slice(0, 4);

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshMessage("");

    try {
      const response = await fetch("/api/refresh-restaurant", {
        body: JSON.stringify({ restaurantId: restaurant.id }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        needsUserSelection?: boolean;
        ok?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "重新檢查失敗");
      }

      if (payload.needsUserSelection) {
        setRefreshMessage("AI 找到多個可能結果，暫時沒有更新。");
        return;
      }

      setRefreshMessage("已重新檢查並更新。");
      await onRefreshDone();
    } catch (error) {
      setRefreshMessage(
        error instanceof Error ? error.message : "重新檢查失敗",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-950">
            {restaurant.name || "未命名餐廳"}
          </h2>
          <p className="text-stone-600">{location || "地區尚未填寫"}</p>
          <p className="text-stone-700">
            {restaurant.cuisine || "料理類型未知"} /{" "}
            {restaurant.priceLevel || "價位未知"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusBadge tone={businessTone(restaurant.businessStatus)}>
            {businessStatusLabels[restaurant.businessStatus]}
          </StatusBadge>
          <StatusBadge tone={todayOpenTone(restaurant.todayOpenStatus)}>
            {todayOpenStatusLabels[restaurant.todayOpenStatus]}
          </StatusBadge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <StatusBadge key={tag} tone="neutral">
            {tag}
          </StatusBadge>
        ))}
        <StatusBadge tone="neutral">
          {sourceTypeLabels[restaurant.sourceType]}
        </StatusBadge>
        <StatusBadge tone="neutral">
          來源可信度 {restaurant.sourceReliability}/5
        </StatusBadge>
        <StatusBadge tone={aiTone(restaurant.aiConfidence)}>
          {aiConfidenceLabels[restaurant.aiConfidence]}
        </StatusBadge>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem
          label="LastVisited"
          value={restaurant.lastVisited || "尚未記錄"}
        />
        <InfoItem label="VisitCount" value={restaurant.visitCount.toString()} />
      </dl>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {restaurant.mapUrl ? (
          <a
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-stone-950 px-4 font-semibold text-white transition hover:bg-stone-800"
            href={restaurant.mapUrl}
            rel="noreferrer"
            target="_blank"
          >
            Google Maps
          </a>
        ) : (
          <button
            className="min-h-11 flex-1 rounded-lg bg-stone-200 px-4 font-semibold text-stone-500"
            disabled
            type="button"
          >
            Google Maps
          </button>
        )}
        <button
          className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100"
          disabled={isRefreshing}
          onClick={handleRefresh}
          type="button"
        >
          {isRefreshing ? "檢查中..." : "重新用 AI 檢查"}
        </button>
      </div>

      {refreshMessage ? (
        <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm font-semibold text-stone-700">
          {refreshMessage}
        </p>
      ) : null}
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-stone-500">{label}</dt>
      <dd className="mt-1 text-stone-800">{value}</dd>
    </div>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const className = {
    bad: "bg-red-100 text-red-800",
    good: "bg-emerald-100 text-emerald-800",
    neutral: "bg-stone-100 text-stone-700",
    warn: "bg-amber-100 text-amber-800",
  }[tone];

  return (
    <span className={`w-fit rounded-lg px-3 py-2 text-sm font-semibold ${className}`}>
      {children}
    </span>
  );
}

function businessTone(status: BusinessStatus): "good" | "warn" | "bad" | "neutral" {
  if (status === "Operational") {
    return "good";
  }

  if (status === "PermanentlyClosed") {
    return "bad";
  }

  if (status === "TemporarilyClosed") {
    return "warn";
  }

  return "neutral";
}

function todayOpenTone(status: TodayOpenStatus): "good" | "warn" | "bad" | "neutral" {
  if (status === "OpenNow") {
    return "good";
  }

  if (status === "ClosedToday") {
    return "bad";
  }

  if (status === "ClosedNow") {
    return "warn";
  }

  return "neutral";
}

function aiTone(confidence: AIConfidence): "good" | "warn" | "bad" | "neutral" {
  if (confidence === "high") {
    return "good";
  }

  if (confidence === "medium") {
    return "warn";
  }

  return "bad";
}
