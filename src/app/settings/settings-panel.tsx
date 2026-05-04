"use client";

import { useState } from "react";

interface OpenAITestResponse {
  error?: string;
  message?: string;
  model?: string;
  ok: boolean;
}

export function SettingsPanel() {
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [openAIResult, setOpenAIResult] = useState("");
  const [openAIError, setOpenAIError] = useState("");

  async function handleTestOpenAI() {
    setIsTestingOpenAI(true);
    setOpenAIResult("");
    setOpenAIError("");

    try {
      const response = await fetch("/api/test-openai", {
        method: "POST",
      });
      const payload = (await response.json()) as OpenAITestResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "OpenAI API 測試失敗");
      }

      setOpenAIResult(`${payload.model}: ${payload.message}`);
    } catch (error) {
      setOpenAIError(
        error instanceof Error ? error.message : "OpenAI API 測試失敗",
      );
    } finally {
      setIsTestingOpenAI(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <span className="font-semibold text-stone-800">Google Sheet 連線狀態</span>
        <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
          已在 /api/restaurants 測試
        </span>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-stone-800">OpenAI API 測試</span>
          <button
            className="min-h-11 rounded-lg bg-stone-950 px-4 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            disabled={isTestingOpenAI}
            onClick={handleTestOpenAI}
            type="button"
          >
            {isTestingOpenAI ? "測試中..." : "測試 OpenAI"}
          </button>
        </div>
        {openAIResult ? (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            {openAIResult}
          </p>
        ) : null}
        {openAIError ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">
            {openAIError}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <span className="font-semibold text-stone-800">環境變數檢查結果</span>
        <span className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-600">
          只在 server side 使用
        </span>
      </div>
    </div>
  );
}
