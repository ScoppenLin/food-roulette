import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
      <section className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-5">
          <p className="text-sm font-semibold text-emerald-700">Food Roulette</p>
          <h1 className="text-5xl font-bold leading-tight tracking-normal text-stone-950 sm:text-6xl">
            今天吃什麼？
          </h1>
          <p className="max-w-xl text-xl leading-9 text-stone-700">
            不用再糾結。
            <br />
            讓命運幫你選一家，
            <br />
            但用 AI 幫你排除不合理的選項。
          </p>
        </div>

        <nav className="grid gap-3 font-semibold">
          <Link
            className="flex min-h-24 items-center justify-center rounded-lg bg-emerald-700 px-6 text-2xl text-white shadow-sm transition hover:bg-emerald-800"
            href="/roulette"
          >
            開始輪盤
          </Link>
          <div className="grid gap-3 text-base sm:grid-cols-2">
            <Link
              className="flex min-h-14 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-stone-950 shadow-sm transition hover:bg-stone-50"
              href="/add"
            >
              新增餐廳
            </Link>
            <Link
              className="flex min-h-14 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-stone-950 shadow-sm transition hover:bg-stone-50"
              href="/restaurants"
            >
              餐廳清單
            </Link>
          </div>
        </nav>
      </section>
    </main>
  );
}
