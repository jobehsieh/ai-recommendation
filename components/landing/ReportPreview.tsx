/** 報告預覽：用示意資料說明報告長什麼樣子。所有數值皆為虛構，並在畫面上明確標示。 */

const PROGRAMS = [
  { label: "衝刺校系", low: 10, high: 30, tier: "偏低", bar: "bg-orange-500", badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  { label: "穩健校系", low: 25, high: 55, tier: "五五波", bar: "bg-amber-500", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { label: "保底校系", low: 55, high: 80, tier: "偏高", bar: "bg-lime-500", badge: "bg-lime-500/15 text-lime-700 dark:text-lime-300" },
];

const DOCS = [
  { label: "在學成績單", w: 38, s: 78 },
  { label: "有利審查資料", w: 26, s: 68 },
  { label: "學習／研究計畫", w: 16, s: 48 },
  { label: "個人資料表", w: 12, s: null },
  { label: "自傳", w: 8, s: 30 },
];

export default function ReportPreview() {
  const total = DOCS.reduce((sum, d) => sum + (d.w * (d.s ?? 0)) / 100, 0);

  return (
    <section className="border-y border-border bg-surface-2/40">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-accent">報告預覽</p>
          <h2 className="mt-4 font-serif text-3xl font-black leading-tight sm:text-4xl">
            分數，
            <br />
            拆到每一份資料。
          </h2>
          <p className="mt-6 max-w-md text-base leading-8 text-muted">
            你會看到每個校系的機率區間與信心程度；展開後，是這些資料各占多少權重、你拿到幾分、貢獻多少。
            缺件會直接標成「缺件」並以 0 分計，讓你一眼看出最划算的補強方向。
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-accent">▸</span>權重由 AI 依該校簡章的審查項目與歷年經驗估計
            </li>
            <li className="flex gap-2">
              <span className="text-accent">▸</span>加權分數由程式依權重與得分計算，不是 AI 心算
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_24px_50px_-28px_rgb(22_32_43/0.5)] sm:p-6">
          <p className="mb-4 font-mono text-[11px] tracking-widest text-muted">範例畫面・數值為虛構</p>

          <div className="space-y-4">
            {PROGRAMS.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.badge}`}>{p.tier}</span>
                    <span className="w-20 text-right font-serif text-lg font-bold tabular-nums">
                      {p.low}–{p.high}%
                    </span>
                  </span>
                </div>
                <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-border/70">
                  <div
                    className={`absolute top-0 h-full rounded-full ${p.bar}`}
                    style={{ left: `${p.low}%`, width: `${p.high - p.low}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <table className="mt-7 w-full text-sm">
            <caption className="mb-2 text-left text-xs font-semibold text-muted">
              書審各項資料的估計權重與得分（加權估計 {total.toFixed(1)} / 100）
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-1.5 font-medium">資料</th>
                <th className="py-1.5 font-medium">權重</th>
                <th className="py-1.5 font-medium">得分</th>
                <th className="py-1.5 text-right font-medium">貢獻</th>
              </tr>
            </thead>
            <tbody>
              {DOCS.map((d) => (
                <tr key={d.label} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5">{d.label}</td>
                  <td className="py-1.5 tabular-nums">{d.w}%</td>
                  <td className="py-1.5 tabular-nums">
                    {d.s === null ? <span className="text-amber-600">缺件</span> : d.s}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted">{((d.w * (d.s ?? 0)) / 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
