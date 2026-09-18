import Link from "next/link";

/** 右側示意圖：一段被「朱批」的自傳節錄。內容為虛構，用來示範產品會怎麼指出問題。 */
function AnnotatedDoc() {
  return (
    <div className="relative mx-auto mb-10 w-full max-w-md">
      <div className="rise rotate-[1.2deg] rounded-md border border-border bg-surface p-6 shadow-[0_1px_0_var(--border),0_24px_44px_-22px_rgb(22_32_43/0.45)] sm:p-7" style={{ "--d": "0.15s" } as React.CSSProperties}>
        <div className="font-mono text-[11px] tracking-widest text-muted">自傳（節錄）</div>

        <p className="mt-5 font-serif text-[15px] leading-8">
          <span className="squiggle">我從小就喜歡電腦，覺得人工智慧很厲害</span>，所以選擇資工系。大三時，
          <mark className="hl-good">
            我以 YOLO 完成校園停車位偵測專題，負責資料標註與模型調參，mAP 由 0.71 提升至 0.78
          </mark>
          。
        </p>

        <ul className="mt-5 space-y-2.5 text-[13px] leading-relaxed">
          <li className="border-l-2 border-accent bg-accent-soft py-1.5 pl-3 pr-2">
            <span className="font-semibold text-accent">空泛　</span>
            沒有可驗證的事實，看不出和其他申請者的差異。
          </li>
          <li className="border-l-2 border-good bg-good/10 py-1.5 pl-3 pr-2">
            <span className="font-semibold text-good">具體　</span>
            有分工、有量化成果，建議移到第一段。
          </li>
        </ul>

        <p className="mt-4 font-mono text-[10px] tracking-widest text-muted">範例示意・虛構資料</p>

        <div
          aria-label="模擬評分 72"
          className="stamp absolute -right-3 -top-5 grid h-[76px] w-[76px] place-items-center rounded-md bg-surface text-center leading-tight sm:-right-6"
        >
          <span>
            <span className="block font-mono text-[9px] tracking-widest">模擬評分</span>
            <span className="block font-serif text-3xl font-black">72</span>
          </span>
        </div>
      </div>

      {/* 疊在紙張下緣的機率小卡，製造景深 */}
      <div
        className="rise absolute -bottom-14 -left-2 w-56 rounded-lg border border-border bg-surface p-3.5 shadow-lg sm:-left-8"
        style={{ "--d": "0.45s" } as React.CSSProperties}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted">正取機率（範例）</span>
          <span className="font-serif text-lg font-bold tabular-nums">25–55%</span>
        </div>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-border/70">
          <div className="absolute left-[25%] top-0 h-full w-[30%] rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

export default function Hero({ programCount, schoolCount }: { programCount: number; schoolCount: number }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="paper-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <div>
          <p className="rise font-mono text-xs tracking-[0.22em] text-accent">資工所推甄　·　備審模擬</p>

          <h1
            className="rise mt-5 font-serif text-[2.6rem] font-black leading-[1.15] tracking-tight sm:text-6xl lg:text-[4.2rem]"
            style={{ "--d": "0.08s" } as React.CSSProperties}
          >
            交出備審之前，
            <br />
            先被<span className="text-accent">審</span>一次。
          </h1>

          <p
            className="rise mt-7 max-w-xl text-base leading-8 text-muted sm:text-lg"
            style={{ "--d": "0.16s" } as React.CSSProperties}
          >
            上傳自傳、成績單與研究計畫，AI 依 116 學年度各校資工所簡章與歷年推甄經驗扮演審查委員：
            估算各項資料的權重與錄取機率區間，再逐項告訴你哪裡該改、怎麼改。
          </p>

          <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ "--d": "0.24s" } as React.CSSProperties}>
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5 dark:text-black"
            >
              開始模擬
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/#how"
              className="inline-flex items-center rounded-md border border-border bg-surface px-6 py-3.5 text-base font-medium transition-colors hover:border-accent hover:text-accent"
            >
              了解運作方式
            </Link>
          </div>

          <dl
            className="rise mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6"
            style={{ "--d": "0.32s" } as React.CSSProperties}
          >
            {[
              [`${schoolCount}`, "所學校"],
              [`${programCount}`, "個資工相關校系"],
              ["5", "類備審資料"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-black tabular-nums">{n}</span>
                  <span className="text-sm text-muted">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <AnnotatedDoc />
      </div>
    </section>
  );
}
