"use client";

import { useMemo, useState } from "react";
import { detectInputType, extractGoogleMapsUrl } from "@/lib/input";

const inputTypeLabels = {
  Text: "Text",
  GoogleMapsURL: "GoogleMapsURL",
  Mixed: "Mixed",
  Manual: "Manual",
};

export function RestaurantInputForm() {
  const [inputText, setInputText] = useState("");
  const [hasPreview, setHasPreview] = useState(false);

  const inputType = useMemo(() => detectInputType(inputText), [inputText]);
  const googleMapsUrl = useMemo(
    () => extractGoogleMapsUrl(inputText),
    [inputText],
  );
  const canAnalyze = inputText.trim().length > 0;

  function handleAnalyze() {
    if (!canAnalyze) {
      return;
    }

    setHasPreview(true);
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
          id="restaurant-input"
          onChange={(event) => {
            setInputText(event.target.value);
            setHasPreview(false);
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
          AI 幫我建檔
        </button>
      </div>

      {hasPreview ? <MockPreviewCard googleMapsUrl={googleMapsUrl} /> : null}
    </div>
  );
}

function MockPreviewCard({ googleMapsUrl }: { googleMapsUrl: string | null }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">AI 建檔預覽</p>
          <h2 className="mt-2 text-3xl font-bold text-stone-950">
            Sushi Arai
          </h2>
          <p className="mt-2 text-stone-600">日本 / 東京 / 銀座</p>
        </div>
        <span className="w-fit rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
          mock 結果
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreviewItem label="料理類型" value="壽司" />
        <PreviewItem label="價位" value="$$$$" />
        <PreviewItem label="適合情境" value="商務餐, 晚餐, 約會" />
        <PreviewItem label="營業狀態" value="營業狀態待 AI 確認" />
        <PreviewItem label="資料來源可信度" value="朋友推薦 4/5" />
        <PreviewItem label="AI 信心分數" value="medium" />
      </dl>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50"
          href={googleMapsUrl ?? "https://maps.google.com"}
          rel="noreferrer"
          target="_blank"
        >
          Google Maps
        </a>
        <button className="min-h-12 flex-1 rounded-lg bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800">
          確認新增
        </button>
        <button className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50">
          重新分析
        </button>
        <button className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-950 transition hover:bg-stone-50">
          取消
        </button>
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
