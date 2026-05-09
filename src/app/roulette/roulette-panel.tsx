"use client";

import { useEffect, useState } from "react";
import {
  defaultLocationArea,
  isLocationArea,
  locationAreaOptions,
} from "@/lib/locationAreas";
import type { LocationArea, Restaurant } from "@/types/restaurant";

interface RouletteFormState {
  allowLaterOpen: boolean;
  avoidTags: string;
  city: string;
  country: string;
  district: string;
  locationArea: LocationArea;
  mealTime: string;
  openNowOnly: boolean;
  priceLevel: string;
  scenario: string;
  wantTags: string;
}

interface ScoredRestaurant {
  restaurant: Restaurant;
  score: number;
}

interface RouletteResponse {
  candidates: ScoredRestaurant[];
  ok: true;
  selected: ScoredRestaurant | null;
}

const initialFormState: RouletteFormState = {
  allowLaterOpen: true,
  avoidTags: "",
  city: "",
  country: "",
  district: "",
  locationArea: defaultLocationArea,
  mealTime: "",
  openNowOnly: false,
  priceLevel: "",
  scenario: "",
  wantTags: "",
};

export function RoulettePanel() {
  const [formState, setFormState] =
    useState<RouletteFormState>(initialFormState);
  const [selected, setSelected] = useState<ScoredRestaurant | null>(null);
  const [status, setStatus] = useState<"idle" | "picking" | "picked" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const isBusy = status === "picking";

  useEffect(() => {
    const savedLocationArea = window.localStorage.getItem(
      "food-roulette-location-area",
    );

    if (savedLocationArea && isLocationArea(savedLocationArea)) {
      setFormState((state) => ({ ...state, locationArea: savedLocationArea }));
    }
  }, []);

  function updateLocationArea(locationArea: LocationArea) {
    setFormState((state) => ({ ...state, locationArea }));
    window.localStorage.setItem("food-roulette-location-area", locationArea);
  }

  async function handlePick() {
    setStatus("picking");
    setMessage("");

    try {
      const result = await postJson<RouletteResponse>("/api/roulette", {
        allowLaterOpen: formState.allowLaterOpen,
        avoidTags: formState.avoidTags,
        city: formState.city,
        country: formState.country,
        district: formState.district,
        locationArea: formState.locationArea,
        mealTime: formState.mealTime,
        openNowOnly: formState.openNowOnly,
        priceLevel: formState.priceLevel,
        scenario: formState.scenario,
        wantTags: formState.wantTags,
      });

      setSelected(result.selected);
      setStatus(result.selected ? "picked" : "idle");
      setMessage(result.selected ? "" : "目前沒有符合條件的餐廳。");
    } catch (error) {
      setMessage(formatError(error));
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      {selected ? (
        <ResultCard isBusy={isBusy} onPick={handlePick} selected={selected} />
      ) : (
        <button
          className="min-h-32 w-full rounded-lg bg-emerald-700 px-6 text-3xl font-black leading-tight text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400 sm:min-h-36 sm:text-4xl"
          disabled={isBusy}
          onClick={handlePick}
          type="button"
        >
          {status === "picking" ? "正在抽..." : "今天吃什麼？"}
        </button>
      )}

      {status === "picking" ? <PickingAnimation /> : null}

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-stone-950">現在的位置</h2>
          <span className="text-sm font-semibold text-emerald-700">
            {formState.locationArea}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {locationAreaOptions.map((locationArea) => (
            <button
              className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition ${
                formState.locationArea === locationArea
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-stone-300 bg-white text-stone-950 hover:bg-stone-50"
              }`}
              key={locationArea}
              onClick={() => updateLocationArea(locationArea)}
              type="button"
            >
              {locationArea}
            </button>
          ))}
        </div>
      </section>

      <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-base font-bold text-stone-900">
          可選條件
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField label="國家" onChange={(country) => setFormState((state) => ({ ...state, country }))} placeholder="例如：日本" value={formState.country} />
          <TextField label="城市" onChange={(city) => setFormState((state) => ({ ...state, city }))} placeholder="例如：東京" value={formState.city} />
          <TextField label="區域" onChange={(district) => setFormState((state) => ({ ...state, district }))} placeholder="例如：銀座" value={formState.district} />
          <TextField label="用餐時段" onChange={(mealTime) => setFormState((state) => ({ ...state, mealTime }))} placeholder="早餐、午餐、晚餐、宵夜" value={formState.mealTime} />
          <TextField label="今天想吃的類型" onChange={(wantTags) => setFormState((state) => ({ ...state, wantTags }))} placeholder="例如：壽司, 商務晚餐" value={formState.wantTags} />
          <TextField label="今天不想吃的類型" onChange={(avoidTags) => setFormState((state) => ({ ...state, avoidTags }))} placeholder="例如：拉麵, 辣" value={formState.avoidTags} />
          <TextField label="價位" onChange={(priceLevel) => setFormState((state) => ({ ...state, priceLevel }))} placeholder="$、$$、$$$、$$$$" value={formState.priceLevel} />
          <TextField label="情境" onChange={(scenario) => setFormState((state) => ({ ...state, scenario }))} placeholder="例如：商務、約會、朋友聚餐" value={formState.scenario} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CheckField checked={formState.openNowOnly} label="只抽目前有營業" onChange={(openNowOnly) => setFormState((state) => ({ ...state, openNowOnly }))} />
          <CheckField checked={formState.allowLaterOpen} label="允許稍晚營業" onChange={(allowLaterOpen) => setFormState((state) => ({ ...state, allowLaterOpen }))} />
        </div>
      </details>

      {message ? (
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold leading-6 text-stone-700 shadow-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function PickingAnimation() {
  const cards = ["料理類型", "營業狀態", "距離", "心情", "價位"];

  return (
    <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
        <div className="food-wheel relative size-40 shrink-0 rounded-full border-8 border-white shadow-[0_18px_45px_rgba(20,83,45,0.16)]">
          <div className="absolute left-1/2 top-[-0.55rem] h-0 w-0 -translate-x-1/2 border-x-[0.65rem] border-t-[1.2rem] border-x-transparent border-t-stone-950" />
          <div className="absolute inset-10 rounded-full border-4 border-white bg-stone-950 shadow-inner" />
          <div className="absolute inset-[4.4rem] rounded-full bg-white" />
        </div>
        <div className="w-full space-y-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">正在幫你篩選</p>
            <p className="mt-1 text-lg font-black text-stone-950">
              讓命運轉一下，順便排除不合理的選項。
            </p>
          </div>
          <div className="shuffle-stage relative h-24 overflow-hidden">
            {cards.map((card, index) => (
              <div
                className="shuffle-card absolute left-0 top-2 flex min-h-16 w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-4 text-base font-bold text-stone-900 shadow-sm"
                key={card}
                style={{ animationDelay: `${index * 0.16}s` }}
              >
                <span>{card}</span>
                <span className="text-emerald-700">檢查中</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultCard({
  isBusy,
  onPick,
  selected,
}: {
  isBusy: boolean;
  onPick: () => void;
  selected: ScoredRestaurant;
}) {
  const restaurant = selected.restaurant;
  const mapUrl = restaurant.mapUrl || restaurant.originalMapUrl;
  const location = compactStrings([
    restaurant.country,
    restaurant.city,
    restaurant.district,
  ]).join(" · ");
  const headlineFacts = compactStrings([
    restaurant.cuisine,
    restaurant.priceLevel,
    location,
  ]);
  const openStatus = formatOpenStatus(restaurant);
  const sourceDetails = compactStrings([
    restaurant.sourceNote,
    restaurant.personalNote,
  ]);
  const detailLinks = [
    restaurant.websiteUrl ? { href: restaurant.websiteUrl, label: "官方網站" } : null,
    mapUrl ? { href: mapUrl, label: "Google Maps" } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  const hasDetails =
    Boolean(
      restaurant.address ||
        restaurant.phone ||
        restaurant.openingHoursRaw ||
        restaurant.nextOpenTime,
    ) ||
    restaurant.mealTime.length > 0 ||
    restaurant.suitableFor.length > 0 ||
    restaurant.tags.length > 0 ||
    sourceDetails.length > 0 ||
    detailLinks.length > 0;

  return (
    <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
      <div className="space-y-4 bg-emerald-700 p-6 text-white">
        <p className="text-base font-semibold text-emerald-50">今天推薦你吃</p>
        <h2 className="text-4xl font-bold leading-tight tracking-normal">
          {restaurant.name}
        </h2>
        {headlineFacts.length > 0 ? (
          <p className="text-lg font-medium leading-8 text-emerald-50">
            {headlineFacts.join(" / ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <HighlightItem label="營業狀態" value={openStatus} />
          {restaurant.address ? (
            <HighlightItem label="位置" value={restaurant.address} />
          ) : location ? (
            <HighlightItem label="位置" value={location} />
          ) : null}
        </div>

        {restaurant.aiSummary ? (
          <section className="rounded-lg bg-stone-50 p-4">
            <h3 className="text-lg font-bold text-stone-950">推薦理由</h3>
            <p className="mt-2 text-base leading-8 text-stone-700">
              {restaurant.aiSummary}
            </p>
          </section>
        ) : null}

        {hasDetails ? (
          <section className="space-y-4 rounded-lg border border-stone-200 p-4">
            <h3 className="text-lg font-bold text-stone-950">你會用到的資訊</h3>
            <dl className="grid gap-4 text-base leading-7 text-stone-700">
              <DetailRow label="營業時間" value={restaurant.openingHoursRaw} />
              <DetailRow label="下次營業" value={restaurant.nextOpenTime} />
              <DetailRow label="電話" value={restaurant.phone} />
              <DetailList label="適合" values={restaurant.suitableFor} />
              <DetailList label="時段" values={restaurant.mealTime} />
              <DetailList label="特色" values={restaurant.tags.slice(0, 6)} />
              <DetailList label="附註" values={sourceDetails} />
            </dl>

            {detailLinks.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {detailLinks.map((link) => (
                  <a
                    className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 px-4 text-base font-bold text-stone-900 transition hover:bg-stone-50"
                    href={link.href}
                    key={`${link.label}-${link.href}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <button
          className="min-h-14 w-full rounded-lg bg-emerald-700 px-5 text-lg font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
          disabled={isBusy}
          onClick={onPick}
          type="button"
        >
          再抽一次
        </button>
      </div>
    </section>
  );
}

function HighlightItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <dt className="text-sm font-bold text-stone-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold leading-7 text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
      <dt className="font-semibold text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-900">{value}</dd>
    </div>
  );
}

function DetailList({ label, values }: { label: string; values: string[] }) {
  const visibleValues = values.filter(Boolean);

  if (visibleValues.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
      <dt className="font-semibold text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-900">{visibleValues.join("、")}</dd>
    </div>
  );
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function formatOpenStatus(restaurant: Restaurant): string {
  if (restaurant.businessStatus === "PermanentlyClosed") {
    return "已歇業";
  }

  if (restaurant.businessStatus === "TemporarilyClosed") {
    return "暫時休息";
  }

  switch (restaurant.todayOpenStatus) {
    case "OpenNow":
      return "現在有營業";
    case "ClosedNow":
      return "現在未營業";
    case "ClosedToday":
      return "今天休息";
    case "Unknown":
      return "營業狀態待確認";
  }
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      <input
        className="min-h-12 w-full rounded-lg border border-stone-300 bg-white px-4 text-base shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function CheckField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg bg-stone-50 p-3 text-base font-medium text-stone-800">
      <input
        checked={checked}
        className="size-5 accent-emerald-700"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `Request failed with ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "發生未知錯誤。";
}
