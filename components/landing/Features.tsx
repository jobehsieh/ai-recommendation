/** 功能區：以「印章」作為每個功能的識別符號，呼應品牌語彙。 */
function Seal({ ch }: { ch: string }) {
  return (
    <span
      aria-hidden
      className="grid h-10 w-10 shrink-0 -rotate-3 place-items-center rounded-[5px] border-2 border-accent font-serif text-lg font-black text-accent"
    >
      {ch}
    </span>
  );
}

export default function Features({ programCount }: { programCount: number }) {
  const items = [
    {
      seal: "簡",
      title: "逐校對照簡章",
      body: `內建 116 學年度 ${programCount} 個資工相關校系的審查方式、名額與應繳資料，依你勾選的校系逐一對照，不必自己翻幾百頁 PDF。`,
      wide: true,
    },
    {
      seal: "權",
      title: "權重與得分看得見",
      body: "每份資料在各校書審的估計權重、你的得分與加權貢獻，一張表列清楚，知道分數卡在哪一項。",
    },
    {
      seal: "率",
      title: "機率給區間，不裝精準",
      body: "給的是正取機率區間與信心程度，並直說資料不足、競爭者未知的不確定性。",
    },
    {
      seal: "批",
      title: "像委員一樣批註",
      body: "指出文件裡哪個句子空泛並示範改寫方向，也提醒各校的頁數、語言、簽名等硬性規定。",
      wide: true,
    },
    {
      seal: "缺",
      title: "缺件先抓出來",
      body: "個人資料表沒交、計畫書語言不符、多人專題缺貢獻比例——這些會直接扣分的地方，先幫你標出來。",
    },
    {
      seal: "策",
      title: "志願策略與行動清單",
      body: "衝刺、穩健、保底怎麼配，以及接下來最值得先做的幾件事，依優先順序排好。",
    },
  ];

  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-accent">功能</p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-black leading-tight sm:text-4xl">
          不只給你一個分數，
          <br />
          而是告訴你分數怎麼來的。
        </h2>

        <div className="mt-14 grid gap-4 md:grid-cols-4">
          {items.map((it) => (
            <article
              key={it.title}
              className={`rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/60 ${
                it.wide ? "md:col-span-2" : "md:col-span-1 lg:col-span-1"
              }`}
            >
              <Seal ch={it.seal} />
              <h3 className="mt-5 font-serif text-xl font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
