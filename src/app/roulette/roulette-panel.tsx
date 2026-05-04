"use client";

import { useState } from "react";
import type { Restaurant } from "@/types/restaurant";

interface RouletteFormState {
  allowLaterOpen: boolean;
  avoidTags: string;
  city: string;
  country: string;
  district: string;
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
  const [candidateCount, setCandidateCount] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "picking" | "picked" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const isBusy = status === "picking" || status === "saving";

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
        mealTime: formState.mealTime,
        openNowOnly: formState.openNowOnly,
        priceLevel: formState.priceLevel,
        scenario: formState.scenario,
        wantTags: formState.wantTags,
      });

      setCandidateCount(result.candidates.length);
      setSelected(result.selected);
      setStatus(result.selected ? "picked" : "idle");
      setMessage(result.selected ? "" : "目前沒有符合條件的餐廳。");
    } catch (error) {
      setMessage(formatError(error));
      setStatus("error");
    }
  }

  async function handleVisit() {
    if (!selected) {
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      await postJson("/api/visit", {
        restaurantId: selected.restaurant.id,
      });
      setStatus("saved");
      setMessage(`已記錄今天吃：${selected.restaurant.name}`);
    } catch (error) {
      setMessage(formatError(error));
      setStatus("error");
    }
  }

  async function handleReject() {
    if (!selected) {
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      await postJson("/api/reject", {
        restaurantId: selected.restaurant.id,
      });
      await handlePick();
    } catch (error) {
      setMessage(formatError(error));
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <button
        className="min-h-16 w-full rounded-lg bg-emerald-700 px-5 text-xl font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
        disabled={isBusy}
        onClick={handlePick}
        type="button"
      >
        {status === "picking" ? "抽選中..." : "今天吃什麼？"}
      </button>

      <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-base font-bold text-stone-900">
          可選條件
        </summary>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField
            label="國家"
            onChange={(country) =>
              setFormState((state) => ({ ...state, country }))
            }
            placeholder="例如：日本"
            value={formState.country}
          />
          <TextField
            label="城市"
            onChange={(city) => setFormState((state) => ({ ...state, city }))}
            placeholder="例如：東京"
            value={formState.city}
          />
          <TextField
            label="區域"
            onChange={(district) =>
              setFormState((state) => ({ ...state, district }))
            }
            placeholder="例如：銀座"
            value={formState.district}
          />
          <TextField
            label="用餐時段"
            onChange={(mealTime) =>
              setFormState((state) => ({ ...state, mealTime }))
            }
            placeholder="早餐、午餐、晚餐、宵夜"
            value={formState.mealTime}
          />
          <TextField
            label="今天想吃的類型"
            onChange={(wantTags) =>
              setFormState((state) => ({ ...state, wantTags }))
            }
            placeholder="例如：壽司, 商務晚餐"
            value={formState.wantTags}
          />
          <TextField
            label="今天不想吃的類型"
            onChange={(avoidTags) =>
              setFormState((state) => ({ ...state, avoidTags }))
            }
            placeholder="例如：拉麵, 辣"
            value={formState.avoidTags}
          />
          <TextField
            label="價位"
            onChange={(priceLevel) =>
              setFormState((state) => ({ ...state, priceLevel }))
            }
            placeholder="$、$$、$$$、$$$$"
            value={formState.priceLevel}
          />
          <TextField
            label="情境"
            onChange={(scenario) =>
              setFormState((state) => ({ ...state, scenario }))
            }
            placeholder="例如：商務、約會、朋友聚餐"
            value={formState.scenario}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CheckField
            checked={formState.openNowOnly}
            label="只抽目前有營業"
            onChange={(openNowOnly) =>
              setFormState((state) => ({ ...state, openNowOnly }))
            }
          />
          <CheckField
            checked={formState.allowLaterOpen}
            label="允許稍晚營業"
            onChange={(allowLaterOpen) =>
              setFormState((state) => ({ ...state, allowLaterOpen }))
            }
          />
        </div>
      </details>

      {message ? (
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold leading-6 text-stone-700 shadow-sm">
          {message}
        </p>
      ) : null}

      {selected ? (
        <ResultCard
          candidateCount={candidateCount}
          isBusy={isBusy}
          onPick={handlePick}
          onReject={handleReject}
          onVisit={handleVisit}
          selected={selected}
        />
      ) : null}
    </div>
  );
}

function ResultCard({
  candidateCount,
  isBusy,
  onPick,
  onReject,
  onVisit,
  selected,
}: {
  candidateCount: number;
  isBusy: boolean;
  onPick: () => void;
  onReject: () => void;
  onVisit: () => void;
  selected: ScoredRestaurant;
}) {
  const restaurant = selected.restaurant;
  const mapUrl = restaurant.mapUrl || restaurant.originalMapUrl;

  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-emerald-700">今天推薦你吃</p>
      <h2 className="mt-2 text-3xl font-bold text-stone-950">
        {restaurant.name}
      </h2>
      <p className="mt-2 leading-7 text-stone-600">
        {[restaurant.cuisine, restaurant.priceLevel, restaurant.city]
          .filter(Boolean)
          .join(" / ") || "餐廳資料待補"}
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <ResultItem label="推薦分數" value={`${selected.score}`} />
        <ResultItem label="候選餐廳" value={`${candidateCount} 家`} />
        <ResultItem
          label="營業狀態"
          value={`${restaurant.businessStatus} / ${restaurant.todayOpenStatus}`}
        />
        <ResultItem
          label="資料來源"
          value={`${restaurant.sourceType} ${restaurant.sourceReliability}/5`}
        />
      </dl>

      {restaurant.aiSummary ? (
        <p className="mt-5 rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-700">
          {restaurant.aiSummary}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="min-h-12 flex-1 rounded-lg bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
          disabled={isBusy}
          onClick={onVisit}
          type="button"
        >
          今天吃這家
        </button>
        <button
          className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100"
          disabled={isBusy}
          onClick={onReject}
          type="button"
        >
          重新抽，不要這家
        </button>
        <button
          className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100"
          disabled={isBusy}
          onClick={onPick}
          type="button"
        >
          再抽一次
        </button>
        {mapUrl ? (
          <a
            className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50"
            href={mapUrl}
            rel="noreferrer"
            target="_blank"
          >
            Google Maps
          </a>
        ) : null}
      </div>
    </section>
  );
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

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <dt className="text-sm font-semibold text-stone-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold leading-7 text-stone-900">
        {value}
      </dd>
    </div>
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
