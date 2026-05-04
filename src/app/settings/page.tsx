import Link from "next/link";

const checks = [
  "Google Sheet 連線狀態",
  "OpenAI API 測試",
  "環境變數檢查結果",
];

export default function SettingsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link className="text-sm font-semibold text-emerald-700" href="/">
        Food Roulette
      </Link>

      <section className="mt-8 space-y-7">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-normal text-stone-950">
            設定
          </h1>
          <p className="text-lg leading-8 text-stone-700">
            這裡會放 API 測試、環境變數檢查與 PWA 安裝說明。
          </p>
        </div>

        <div className="grid gap-3">
          {checks.map((check) => (
            <div
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
              key={check}
            >
              <span className="font-semibold text-stone-800">{check}</span>
              <span className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-600">
                尚未設定
              </span>
            </div>
          ))}
        </div>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-stone-950">iPhone PWA 安裝</h2>
          <ol className="mt-4 space-y-3 text-base leading-7 text-stone-700">
            <li>1. 用 Safari 打開本網站</li>
            <li>2. 點擊分享</li>
            <li>3. 選擇「加入主畫面」</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
