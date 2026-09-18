const LIMITS = [
  {
    title: "機率是估計，不是預言",
    body: "來自簡章與個案經驗的推估，沒有官方錄取統計可以校準；當年報名人數與競爭者強度，也沒有人知道。",
  },
  {
    title: "歷年經驗只是個案",
    body: "網路蒐集的心得樣本小、有倖存者偏差，只用來校準相對高低，並在報告中標示為非官方。",
  },
  {
    title: "不替你編造資料",
    body: "文件裡沒寫的 GPA、名次、獎項，AI 不會替你補上；資料缺漏就降低信心並明說。",
  },
  {
    title: "目前不支援 OCR",
    body: "掃描檔與圖片讀不到文字，請改傳含文字層的 PDF，或直接貼上文字。",
  },
];

export default function Transparency() {
  return (
    <section className="border-y border-border bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-accent">透明度</p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-black leading-tight sm:text-4xl">
          我們把限制，寫在前面。
        </h2>

        <div className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {LIMITS.map((l) => (
            <div key={l.title} className="border-t border-foreground pt-5">
              <h3 className="font-serif text-lg font-bold">{l.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{l.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-surface p-6 sm:p-8">
          <h3 className="font-serif text-lg font-bold">關於你的資料</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
            你上傳的內容只在單次分析中處理，本服務不寫入資料庫、也不留存。分析時，文件內容會被送至第三方 AI 模型服務進行處理，
            該服務如何保存資料由其自身政策決定。請避免上傳身分證字號、住址等與審查無關的個資。
            你的 OpenCode API 金鑰只存在你自己瀏覽器的 localStorage；每次分析時隨請求送到本站伺服器並轉發給 OpenCode Go，
            本服務不會儲存或記錄它，也不提供任何內建金鑰。
          </p>
        </div>
      </div>
    </section>
  );
}
