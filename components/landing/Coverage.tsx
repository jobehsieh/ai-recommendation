import { PROGRAMS } from "@/data/programs";
import type { Program } from "@/lib/types";

/** 由各校系的審查階段名稱推得該校的審查形式標籤（不手寫，避免與資料檔不一致）。 */
function reviewTags(items: Program[]) {
  const tags = new Set<string>();
  for (const p of items) {
    for (const s of p.stages) {
      if (/審查/.test(s.name)) tags.add("書面審查");
      if (/口試/.test(s.name)) tags.add("口試");
      if (/面試/.test(s.name)) tags.add("面試");
      if (/筆試/.test(s.name)) tags.add("筆試");
    }
  }
  return [...tags];
}

export default function Coverage() {
  const schools = PROGRAMS.reduce<{ name: string; items: Program[] }[]>((acc, p) => {
    const g = acc.find((x) => x.name === p.schoolName);
    if (g) g.items.push(p);
    else acc.push({ name: p.schoolName, items: [p] });
    return acc;
  }, []);

  return (
    <section id="coverage" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-accent">涵蓋校系</p>
        <h2 className="mt-4 font-serif text-3xl font-black sm:text-4xl">
          {schools.length} 所學校，{PROGRAMS.length} 個校系。
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          審查方式、名額與應繳資料，皆整理自各校 116 學年度碩士班甄試簡章。
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((s) => (
            <article key={s.name} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-xl font-bold">{s.name}</h3>
                <span className="font-mono text-xs text-muted">{s.items.length} 個校系</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reviewTags(s.items).map((t) => (
                  <span key={t} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                    {t}
                  </span>
                ))}
              </div>
              <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm leading-relaxed text-muted">
                {s.items.map((p) => (
                  <li key={p.id} className="flex gap-2">
                    <span aria-hidden className="text-accent">
                      ·
                    </span>
                    {p.name}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
