import { SettingsPanel } from "./settings-panel";

export default function SettingsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-24">
      <section className="space-y-7">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-normal text-stone-950">
            設定
          </h1>
          <p className="text-lg leading-8 text-stone-700">
            這裡會放 API 測試、環境變數檢查與 PWA 安裝說明。
          </p>
        </div>

        <SettingsPanel />

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
