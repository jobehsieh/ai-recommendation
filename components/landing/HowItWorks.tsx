const STEPS = [
  {
    n: "01",
    title: "選擇校系",
    body: "從台大、清大、陽明交大、成大、中央的資工相關校系中，勾選你想報的，一次最多 8 個。",
  },
  {
    n: "02",
    title: "上傳備審資料",
    body: "自傳、個人資料表、學習／研究計畫、成績單、有利審查資料。支援 PDF、Word、文字檔，也能直接貼上文字。",
  },
  {
    n: "03",
    title: "取得審查報告",
    body: "通常約一分鐘。你會看到機率區間、權重與得分表、逐項資料的批註建議，以及依優先順序排好的行動清單。",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-accent">使用流程</p>
        <h2 className="mt-4 font-serif text-3xl font-black sm:text-4xl">三個步驟，一份審查報告。</h2>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s) => (
            <li key={s.n} className="relative border-t-2 border-foreground pt-6">
              <span className="font-serif text-6xl font-black leading-none text-accent/90">{s.n}</span>
              <h3 className="mt-5 font-serif text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 rounded-xl border border-border bg-surface p-5 text-sm leading-7 text-muted">
          <span className="font-semibold text-foreground">第一次使用？</span>
          本服務採自備金鑰（BYOK）：請先在右上角的「API 金鑰」貼上你自己的 Google Gemini 金鑰。
          它只會存在你瀏覽器的 localStorage，審查用的是你自己的額度。
        </p>
      </div>
    </section>
  );
}
