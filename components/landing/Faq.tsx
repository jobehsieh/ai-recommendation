const FAQS = [
  {
    q: "需要自備 API 金鑰嗎？要花錢嗎？",
    a: "需要。本服務採自備金鑰（BYOK），不提供內建額度：請在右上角「API 金鑰」貼上你自己的 OpenCode Go 金鑰，審查會消耗你自己的額度，本服務不收費。金鑰只存在你瀏覽器的 localStorage，隨每次分析請求送到本站並轉發給 OpenCode Go，不會被儲存或記錄。",
  },
  {
    q: "會留存我的備審資料嗎？",
    a: "本服務不寫入資料庫也不留存，內容只在單次分析中處理。但分析時文件內容會送至第三方 AI 模型服務（OpenCode Go），其保存政策由該服務決定，建議避免上傳與審查無關的個資。",
  },
  {
    q: "錄取機率準嗎？",
    a: "它是依簡章與個案經驗做的推估，並非官方統計，所以只給區間與信心程度。當年報名人數與競爭者強度都是未知的，請把它當成「準備方向的參考」，而不是結果的保證。",
  },
  {
    q: "支援哪些學校？",
    a: "目前涵蓋台大、清大、陽明交大、成大、中央的資工相關校系，依 116 學年度簡章整理。完整清單見上方「涵蓋校系」。",
  },
  {
    q: "要等多久？",
    a: "通常約一分鐘。選的校系越多，AI 撰寫的內容越長，等待時間也越久；最長 5 分鐘會逾時，可減少校系後重試。",
  },
  {
    q: "支援什麼檔案格式？",
    a: "PDF（需含文字層）、Word（.docx）、TXT、Markdown，單檔 12MB 內；也可以直接貼上文字。掃描檔與圖片目前無法辨識。",
  },
  {
    q: "五份資料都要上傳嗎？",
    a: "不用，至少提供一項就能分析。但沒提供的項目會被視為缺件並影響評分，就像真的少交一樣。",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-accent">常見問題</p>
          <h2 className="mt-4 font-serif text-3xl font-black leading-tight sm:text-4xl">
            交件前，
            <br />
            你可能想先知道的事。
          </h2>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-lg font-bold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden
                  className="shrink-0 font-sans text-2xl font-light text-accent transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
