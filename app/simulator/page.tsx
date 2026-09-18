import type { Metadata } from "next";
import Simulator from "@/components/Simulator";

export const metadata: Metadata = { title: "開始模擬" };

export default function SimulatorPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-12 border-b border-border pb-8">
        <p className="font-mono text-xs tracking-[0.22em] text-accent">審查模擬</p>
        <h1 className="mt-3 font-serif text-3xl font-black tracking-tight sm:text-4xl">交件之前，先被審一次。</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          選好想報的校系、上傳備審資料，AI 會依 116 學年度簡章的審查方式模擬審查：
          估算各項資料的權重與錄取機率區間，並給出逐項改善建議。
        </p>
      </header>
      <Simulator />
    </div>
  );
}
