import Link from "next/link";
import { RestaurantInputForm } from "./restaurant-input-form";

const examples = [
  "東京銀座 Sushi Arai，朋友推薦，適合商務晚餐",
  "曼谷這家看起來不錯，IG 看到的 https://maps.app.goo.gl/xxxxx",
  "台北東區那家牛肉麵，上次客戶推薦，可以午餐",
];

export default function AddPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link className="text-sm font-semibold text-emerald-700" href="/">
        Food Roulette
      </Link>

      <section className="mt-8 space-y-7">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-normal text-stone-950">
            新增餐廳
          </h1>
          <p className="text-lg leading-8 text-stone-700">
            不用填表格。直接輸入一句話，或貼上 Google Maps 連結，AI
            會幫你整理成餐廳資料。
          </p>
        </div>

        <RestaurantInputForm />

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-stone-950">輸入範例</h2>
          <div className="grid gap-3">
            {examples.map((example) => (
              <p
                className="rounded-lg border border-stone-200 bg-white p-4 leading-7 text-stone-700 shadow-sm"
                key={example}
              >
                「{example}」
              </p>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
