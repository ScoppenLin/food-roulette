import { RoulettePanel } from "./roulette-panel";

export default function RoulettePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-24">
      <section className="space-y-7">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-normal text-stone-950">
            餐廳輪盤
          </h1>
          <p className="text-lg leading-8 text-stone-700">
            直接按下去就會抽一家。想指定地點、價位或口味時，再加條件。
          </p>
        </div>

        <RoulettePanel />
      </section>
    </main>
  );
}
