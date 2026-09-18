import Link from "next/link";
import Logo from "./Logo";

export const NAV = [
  { href: "/#features", label: "功能" },
  { href: "/#how", label: "使用流程" },
  { href: "/#coverage", label: "涵蓋校系" },
  { href: "/#faq", label: "常見問題" },
];

const CTA_CLASS =
  "inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:text-black";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="回到首頁">
          <Logo />
        </Link>

        <nav aria-label="主選單" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-muted transition-colors hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/simulator" className={CTA_CLASS}>
            開始模擬
          </Link>

          {/* 手機選單：用原生 <details>，不需要任何 JavaScript */}
          <details className="relative md:hidden">
            <summary
              aria-label="開啟選單"
              className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md border border-border [&::-webkit-details-marker]:hidden"
            >
              <span aria-hidden className="text-lg leading-none">
                ≡
              </span>
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2 text-sm hover:bg-surface-2">
                  {n.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
