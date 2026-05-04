import Link from "next/link";

const filters = [
  "國家",
  "城市",
  "區域",
  "用餐時段",
  "今天想吃的類型",
  "今天不想吃的類型",
  "價位",
  "情境",
];

export default function RoulettePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link className="text-sm font-semibold text-emerald-700" href="/">
        Food Roulette
      </Link>

      <section className="mt-8 space-y-7">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-normal text-stone-950">
            餐廳輪盤
          </h1>
          <p className="text-lg leading-8 text-stone-700">
            先選今天的條件，再讓輪盤從你的餐廳資料庫挑出合適的一家。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {filters.map((filter) => (
            <label className="space-y-2" key={filter}>
              <span className="text-sm font-semibold text-stone-700">
                {filter}
              </span>
              <input
                className="min-h-12 w-full rounded-lg border border-stone-300 bg-white px-4 text-base shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                placeholder={`輸入${filter}`}
              />
            </label>
          ))}
        </div>

        <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="flex items-center gap-3 text-base font-medium text-stone-800">
            <input className="size-5 accent-emerald-700" type="checkbox" />
            只抽目前有營業
          </label>
          <label className="flex items-center gap-3 text-base font-medium text-stone-800">
            <input className="size-5 accent-emerald-700" type="checkbox" />
            允許稍晚營業
          </label>
        </div>

        <button className="min-h-14 w-full rounded-lg bg-emerald-700 px-5 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800">
          今天吃什麼？
        </button>
      </section>
    </main>
  );
}
