import Link from "next/link";
import Logo from "./Logo";
import { NAV } from "./SiteHeader";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-2/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            資工所推甄備審的模擬審查工具。依公開簡章與歷年推甄經驗，在你交件之前先被審一次。
          </p>
        </div>

        <nav aria-label="頁尾選單">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">產品</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-accent">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/simulator" className="font-semibold text-accent hover:underline">
                開始模擬 →
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">聲明</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            本服務為獨立工具，與任何學校或招生單位無關。審查方式整理自 116 學年度公開簡章，實際規定請以各校官方公告為準；
            錄取機率為 AI 推估，非官方統計。
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted sm:px-6">
          <span>© 2026 AI 推甄審查模擬器</span>
          <span className="font-mono">以簡章為據，以經驗為輔</span>
        </div>
      </div>
    </footer>
  );
}
