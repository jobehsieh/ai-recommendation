"use client";

import { getProgram } from "@/data/programs";
import {
  DOC_KEYS,
  DOC_LABELS,
  type DocumentFeedback,
  type ProgramAssessment,
  type RecommendationResult,
} from "@/lib/types";

const TIER_STYLE: Record<ProgramAssessment["tier"], { badge: string; bar: string }> = {
  極低: { badge: "bg-red-500/15 text-red-700 dark:text-red-300", bar: "bg-red-500" },
  偏低: { badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300", bar: "bg-orange-500" },
  五五波: { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" },
  偏高: { badge: "bg-lime-500/15 text-lime-700 dark:text-lime-300", bar: "bg-lime-500" },
  很高: { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" },
};

const CONFIDENCE_LABEL = { low: "信心：低", medium: "信心：中", high: "信心：高" } as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-surface p-4 sm:p-5 ${className}`}>{children}</div>;
}

function BulletList({ items, tone }: { items: string[]; tone?: "good" | "bad" | "todo" }) {
  if (!items.length) return <p className="text-xs text-muted">（無）</p>;
  const mark = tone === "good" ? "＋" : tone === "bad" ? "－" : "→";
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-500" : "text-accent";
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className={`shrink-0 font-bold ${color}`}>{mark}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function ProbabilityBar({ p }: { p: ProgramAssessment }) {
  const style = TIER_STYLE[p.tier];
  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-border/70" role="img"
        aria-label={`錄取機率約 ${p.probabilityLow}% 到 ${p.probabilityHigh}%`}>
        <div
          className={`absolute top-0 h-full rounded-full ${style.bar}`}
          style={{ left: `${p.probabilityLow}%`, width: `${p.probabilityHigh - p.probabilityLow}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function ProgramCard({ p }: { p: ProgramAssessment }) {
  const style = TIER_STYLE[p.tier];
  const meta = getProgram(p.programId);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">{p.schoolName}</p>
          <h4 className="font-semibold leading-snug">{p.programName}</h4>
          {meta && (
            <p className="mt-1 text-xs text-muted">
              {meta.stages
                .map((s) => `${s.name.replace(/[（(].*?[）)]/g, "")} ${s.weightPct === null ? "比例未公開" : `${s.weightPct}%`}`)
                .join(" ＋ ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-serif text-3xl font-black tabular-nums">
            {p.probabilityLow}–{p.probabilityHigh}
            <span className="text-base">%</span>
          </p>
          <div className="mt-1 flex justify-end gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>{p.tier}</span>
            <span className="rounded-full bg-border/60 px-2 py-0.5 text-xs text-muted">{CONFIDENCE_LABEL[p.confidence]}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ProbabilityBar p={p} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <caption className="mb-2 text-left text-xs font-semibold text-muted">
            書審各項資料的估計權重與得分（書審加權估計 {p.weightedReviewScore} / 100）
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-1.5 pr-2 font-medium">資料</th>
              <th className="py-1.5 pr-2 font-medium">權重</th>
              <th className="py-1.5 pr-2 font-medium">得分</th>
              <th className="py-1.5 text-right font-medium">貢獻</th>
            </tr>
          </thead>
          <tbody>
            {DOC_KEYS.map((k) => {
              const w = p.documentWeights[k];
              const s = p.documentScores[k];
              return (
                <tr key={k} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-2">{DOC_LABELS[k]}</td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border/70">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${w}%` }} />
                      </div>
                      <span className="w-9 tabular-nums">{w}%</span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{s === null ? <span className="text-amber-600">缺件</span> : s}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted">
                    {((w * (s ?? 0)) / 100).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h5 className="mb-1.5 text-xs font-semibold text-muted">加分因素</h5>
          <BulletList items={p.keyDrivers} tone="good" />
        </div>
        <div>
          <h5 className="mb-1.5 text-xs font-semibold text-muted">風險</h5>
          <BulletList items={p.risks} tone="bad" />
        </div>
      </div>

      {p.weightRationale && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-accent">為何這樣配置權重？</summary>
          <p className="mt-2 leading-relaxed text-muted">{p.weightRationale}</p>
        </details>
      )}
    </Card>
  );
}

function DocCard({ d, programNames }: { d: DocumentFeedback; programNames: Record<string, string> }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">{DOC_LABELS[d.docKey]}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted">{d.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          {d.provided && d.score !== null ? (
            <>
              <p className="font-serif text-3xl font-black tabular-nums">{d.score}</p>
              <p className="text-[10px] text-muted">/ 100</p>
            </>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              未提供
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <h5 className="mb-1.5 text-xs font-semibold text-muted">優點</h5>
          <BulletList items={d.strengths} tone="good" />
        </div>
        <div>
          <h5 className="mb-1.5 text-xs font-semibold text-muted">待改進</h5>
          <BulletList items={d.weaknesses} tone="bad" />
        </div>
        <div>
          <h5 className="mb-1.5 text-xs font-semibold text-muted">改善建議</h5>
          <BulletList items={d.suggestions} tone="todo" />
        </div>
      </div>

      {d.programSpecific.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-accent">
            各校所的格式與規定提醒（{d.programSpecific.length}）
          </summary>
          <ul className="mt-2 space-y-1.5">
            {d.programSpecific.map((x, i) => (
              <li key={i} className="text-muted">
                <span className="font-medium text-foreground">{programNames[x.programId] ?? x.programId}：</span>
                {x.note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

export default function ResultView({ result }: { result: RecommendationResult }) {
  const programs = [...result.programs].sort(
    (a, b) => b.probabilityLow + b.probabilityHigh - (a.probabilityLow + a.probabilityHigh),
  );
  const programNames = Object.fromEntries(result.programs.map((p) => [p.programId, `${p.schoolName} ${p.programName}`]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 className="font-serif text-3xl font-black">審查模擬結果</h2>
        <p className="text-xs text-muted">
          模型：{result.model}　·　{new Date(result.generatedAt).toLocaleString("zh-TW")}
        </p>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold">提醒</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <h3 className="mb-2 font-serif text-xl font-bold">總評</h3>
        <p className="text-sm leading-relaxed">{result.overallSummary}</p>
        {result.applicantSnapshot.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-1.5 text-xs font-semibold text-muted">AI 從你的資料中讀到的重點</h4>
            <ul className="flex flex-wrap gap-1.5">
              {result.applicantSnapshot.map((s, i) => (
                <li key={i} className="rounded-md bg-background px-2 py-1 text-xs leading-snug">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.strategyNote && (
          <div className="mt-4 rounded-lg bg-accent/10 p-3 text-sm leading-relaxed">
            <span className="font-semibold">志願策略：</span>
            {result.strategyNote}
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h3 className="font-serif text-2xl font-black">各校所錄取機率與權重</h3>
        <p className="text-xs text-muted">機率為「正取（含直接錄取）」的估計區間，依機率高低排序。</p>
        {programs.map((p) => (
          <ProgramCard key={p.programId} p={p} />
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-2xl font-black">各項資料的評分與改善建議</h3>
        {result.documents.map((d) => (
          <DocCard key={d.docKey} d={d} programNames={programNames} />
        ))}
      </section>

      {result.actionPlan.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-serif text-2xl font-black">優先行動清單</h3>
          <Card>
            <ol className="space-y-3">
              {result.actionPlan.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white dark:text-black">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="leading-relaxed">{a.action}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      預期效益：{a.impact}　·　難度：{a.effort}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}

      <p className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
        免責聲明：本結果由 AI 依 116 學年度簡章與網路蒐集的個案經驗推估，並非官方錄取統計。各校當年報名人數、
        競爭者強度與委員評分標準皆未公開，估計必然帶有誤差，請僅作為備審準備的參考，並以各校官方簡章為準。
      </p>
    </div>
  );
}
