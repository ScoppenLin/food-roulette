"use client";

import { useMemo, useState } from "react";
import { detectInputType, extractGoogleMapsUrl } from "@/lib/input";
import { locationAreaOptions } from "@/lib/locationAreas";
import type {
  EnrichedRestaurant,
  EnrichRestaurantResult,
  LocationArea,
  ParsedRestaurantInput,
  Restaurant,
  RestaurantCandidate,
} from "@/types/restaurant";

const inputTypeLabels = {
  Text: "Text",
  GoogleMapsURL: "GoogleMapsURL",
  Mixed: "Mixed",
  Manual: "Manual",
};

type FormStatus = "idle" | "analyzing" | "ready" | "saving" | "saved" | "error";

interface PreviewState {
  enriched: EnrichedRestaurant | null;
  candidates: RestaurantCandidate[];
  parsed: ParsedRestaurantInput | null;
}

export function RestaurantInputForm() {
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [preview, setPreview] = useState<PreviewState>({
    candidates: [],
    enriched: null,
    parsed: null,
  });
  const [savedRestaurant, setSavedRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [locationAreas, setLocationAreas] = useState<LocationArea[]>([]);

  const inputType = useMemo(() => detectInputType(inputText), [inputText]);
  const googleMapsUrl = useMemo(
    () => extractGoogleMapsUrl(inputText),
    [inputText],
  );
  const canAnalyze = inputText.trim().length > 0 && status !== "analyzing";
  const canSave =
    Boolean(preview.enriched && preview.parsed) &&
    locationAreas.length > 0 &&
    status !== "saving";

  async function handleAnalyze() {
    if (!canAnalyze) {
      return;
    }

    setStatus("analyzing");
    setErrorMessage("");
    setSavedRestaurant(null);
    setPreview({ candidates: [], enriched: null, parsed: null });

    try {
      const parsed = await postJson<{
        ok: true;
        parsed: ParsedRestaurantInput;
      }>("/api/parse-restaurant-input", {
        inputText,
        inputType,
      });
      const enrichedResponse = await postJson<{
        enriched: EnrichRestaurantResult;
        ok: true;
      }>("/api/enrich-restaurant", {
        cityHint: parsed.parsed.cityHint,
        countryHint: parsed.parsed.countryHint,
        districtHint: parsed.parsed.districtHint,
        googleMapsUrl: parsed.parsed.googleMapsUrl,
        originalInput: inputText,
        restaurantName: parsed.parsed.restaurantName,
      });

      if ("needsUserSelection" in enrichedResponse.enriched) {
        setPreview({
          candidates: enrichedResponse.enriched.candidates,
          enriched: null,
          parsed: parsed.parsed,
        });
      } else {
        setPreview({
          candidates: [],
          enriched: enrichedResponse.enriched,
          parsed: parsed.parsed,
        });
      }

      setStatus("ready");
    } catch (error) {
      setErrorMessage(formatError(error));
      setStatus("error");
    }
  }

  async function handleSave() {
    if (!preview.enriched || !preview.parsed || !canSave) {
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      const result = await postJson<{ ok: true; restaurant: Restaurant }>(
        "/api/restaurants",
        {
          enriched: preview.enriched,
          inputType,
          locationAreas,
          originalInput: inputText,
          parsed: preview.parsed,
        },
      );

      setSavedRestaurant(result.restaurant);
      setStatus("saved");
    } catch (error) {
      setErrorMessage(formatError(error));
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setErrorMessage("");
    setSavedRestaurant(null);
    setPreview({ candidates: [], enriched: null, parsed: null });
  }

  function toggleLocationArea(locationArea: LocationArea) {
    setLocationAreas((currentAreas) =>
      currentAreas.includes(locationArea)
        ? currentAreas.filter((area) => area !== locationArea)
        : [...currentAreas, locationArea],
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label
          className="block text-sm font-semibold text-stone-700"
          htmlFor="restaurant-input"
        >
          餐廳線索
        </label>
        <textarea
          className="min-h-48 w-full resize-y rounded-lg border border-stone-300 bg-white p-4 text-lg leading-8 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
          disabled={status === "analyzing" || status === "saving"}
          id="restaurant-input"
          onChange={(event) => {
            setInputText(event.target.value);
            handleReset();
          }}
          placeholder="例如：東京銀座 Sushi Arai，朋友推薦，適合商務晚餐"
          value={inputText}
        />

        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-stone-600">
              偵測輸入類型
            </span>
            <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
              {inputTypeLabels[inputType]}
            </span>
          </div>
          {googleMapsUrl ? (
            <p className="mt-3 break-all text-sm leading-6 text-stone-600">
              Google Maps URL：{googleMapsUrl}
            </p>
          ) : null}
        </div>

        <button
          className="min-h-14 w-full rounded-lg bg-stone-950 px-5 text-lg font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={!canAnalyze}
          onClick={handleAnalyze}
          type="button"
        >
          {status === "analyzing" ? "AI 建檔中..." : "AI 幫我建檔"}
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {preview.candidates.length > 0 ? (
        <CandidateList candidates={preview.candidates} onReset={handleReset} />
      ) : null}

      {preview.enriched && preview.parsed ? (
        <PreviewCard
          enriched={preview.enriched}
          googleMapsUrl={
            preview.enriched.mapUrl ||
            preview.enriched.originalMapUrl ||
            preview.parsed.googleMapsUrl
          }
          isSaved={status === "saved"}
          isSaving={status === "saving"}
          locationAreas={locationAreas}
          onReset={handleReset}
          onToggleLocationArea={toggleLocationArea}
          onSave={handleSave}
          onReanalyze={handleAnalyze}
          sourceReliability={preview.parsed.sourceReliability}
          sourceType={preview.parsed.sourceType}
        />
      ) : null}

      {savedRestaurant ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
          已新增：{savedRestaurant.name}
        </p>
      ) : null}
    </div>
  );
}

function PreviewCard({
  enriched,
  googleMapsUrl,
  isSaved,
  isSaving,
  locationAreas,
  onReanalyze,
  onReset,
  onSave,
  onToggleLocationArea,
  sourceReliability,
  sourceType,
}: {
  enriched: EnrichedRestaurant;
  googleMapsUrl: string;
  isSaved: boolean;
  isSaving: boolean;
  locationAreas: LocationArea[];
  onReanalyze: () => void;
  onReset: () => void;
  onSave: () => void;
  onToggleLocationArea: (locationArea: LocationArea) => void;
  sourceReliability: number;
  sourceType: string;
}) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">AI 建檔預覽</p>
          <h2 className="mt-2 text-3xl font-bold text-stone-950">
            {enriched.name}
          </h2>
          <p className="mt-2 text-stone-600">
            {[enriched.country, enriched.city, enriched.district]
              .filter(Boolean)
              .join(" / ") || "地點待確認"}
          </p>
        </div>
        <span className="w-fit rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
          {isSaved ? "已新增" : "AI 結果"}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreviewItem label="料理類型" value={enriched.cuisine || "待確認"} />
        <PreviewItem label="價位" value={enriched.priceLevel || "待確認"} />
        <PreviewItem
          label="適合情境"
          value={enriched.suitableFor.join(", ") || "待確認"}
        />
        <PreviewItem
          label="營業狀態"
          value={`${enriched.businessStatus} / ${enriched.todayOpenStatus}`}
        />
        <PreviewItem
          label="資料來源可信度"
          value={`${sourceType} ${sourceReliability}/5`}
        />
        <PreviewItem label="AI 信心分數" value={enriched.aiConfidence} />
      </dl>

      {enriched.aiSummary ? (
        <p className="mt-5 rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-700">
          {enriched.aiSummary}
        </p>
      ) : null}

      <section className="mt-5 rounded-lg border border-stone-200 p-4">
        <h3 className="text-base font-bold text-stone-950">這家餐廳屬於哪裡？</h3>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          至少選一個，輪盤會用這個做硬性篩選。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {locationAreaOptions.map((locationArea) => (
            <button
              className={`min-h-11 rounded-lg border px-3 text-sm font-bold transition ${
                locationAreas.includes(locationArea)
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-stone-300 bg-white text-stone-950 hover:bg-stone-50"
              }`}
              key={locationArea}
              onClick={() => onToggleLocationArea(locationArea)}
              type="button"
            >
              {locationArea}
            </button>
          ))}
        </div>
        {locationAreas.length === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800">
            請先選擇至少一個生活圈，才可以新增。
          </p>
        ) : null}
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50"
          href={googleMapsUrl || "https://maps.google.com"}
          rel="noreferrer"
          target="_blank"
        >
          Google Maps
        </a>
        <button
          className="min-h-12 flex-1 rounded-lg bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-200"
          disabled={isSaved || isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "新增中..." : "確認新增"}
        </button>
        <button
          className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50"
          disabled={isSaving}
          onClick={onReanalyze}
          type="button"
        >
          重新分析
        </button>
        <button
          className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50"
          disabled={isSaving}
          onClick={onReset}
          type="button"
        >
          取消
        </button>
      </div>
    </section>
  );
}

function CandidateList({
  candidates,
  onReset,
}: {
  candidates: RestaurantCandidate[];
  onReset: () => void;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">需要確認餐廳</p>
          <h2 className="mt-2 text-2xl font-bold text-stone-950">
            AI 找到多個可能結果
          </h2>
        </div>
        <button
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50"
          onClick={onReset}
          type="button"
        >
          重新輸入
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {candidates.map((candidate) => (
          <div
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            key={`${candidate.name}-${candidate.address}`}
          >
            <h3 className="font-bold text-stone-950">{candidate.name}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {[candidate.country, candidate.city, candidate.district]
                .filter(Boolean)
                .join(" / ")}
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {candidate.address}
            </p>
            {candidate.mapUrl ? (
              <a
                className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-950"
                href={candidate.mapUrl}
                rel="noreferrer"
                target="_blank"
              >
                Google Maps
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
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
