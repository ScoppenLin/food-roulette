import Link from "next/link";

export function AppNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-[#f7f4ef]/95 px-4 py-3 shadow-[0_-10px_30px_rgba(28,25,23,0.08)] backdrop-blur sm:top-0 sm:bottom-auto sm:border-b sm:border-t-0 sm:shadow-[0_10px_30px_rgba(28,25,23,0.06)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <Link
          className="text-sm font-black tracking-normal text-stone-950"
          href="/"
        >
          Food Roulette
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold">
          <Link
            className="rounded-lg bg-emerald-700 px-3 py-2 text-white shadow-sm transition hover:bg-emerald-800"
            href="/add"
          >
            新增餐廳
          </Link>
        </div>
      </div>
    </nav>
  );
}
