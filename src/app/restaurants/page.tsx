import { RestaurantList } from "./restaurant-list";

export default function RestaurantsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-24">
      <section className="space-y-7">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-normal text-stone-950">
            餐廳清單
          </h1>
          <p className="text-lg leading-8 text-stone-700">
            從 Google Sheet 讀取餐廳資料，快速查看營業狀態、來源可信度與
            AI 信心分數。
          </p>
        </div>

        <RestaurantList />
      </section>
    </main>
  );
}
