import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl bg-inverse-bg px-6 py-16 text-inverse-fg sm:px-14 sm:py-20">
        {/* 巨大的半透明印章作為背景裝飾 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 -rotate-12 select-none font-serif text-[15rem] font-black leading-none text-accent/15 sm:-right-2 sm:text-[22rem]"
        >
          審
        </span>

        <div className="relative max-w-2xl">
          <h2 className="font-serif text-3xl font-black leading-tight sm:text-5xl">
            備審交出去，就收不回來。
            <br />
            先在這裡被審一次。
          </h2>
          <p className="mt-5 text-base leading-8 opacity-75">選好校系、上傳資料，約一分鐘後拿到你的審查報告。</p>
          <Link
            href="/simulator"
            className="mt-9 inline-flex items-center gap-2 rounded-md bg-accent px-7 py-4 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 dark:text-black"
          >
            開始模擬
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
