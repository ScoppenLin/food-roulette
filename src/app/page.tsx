import { RoulettePanel } from "./roulette/roulette-panel";

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-24">
      <section className="space-y-7">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-700">
            Food Roulette
          </p>
          <h1 className="text-5xl font-bold leading-tight tracking-normal text-stone-950 sm:text-6xl">
            今天吃什麼？
          </h1>
          <p className="max-w-xl text-xl leading-9 text-stone-700">
            按一下就抽。想指定地點、價位或口味，再展開條件微調。
          </p>
        </div>

        <RoulettePanel />
      </section>
    </main>
  );
}
