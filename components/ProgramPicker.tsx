"use client";

import { PROGRAMS } from "@/data/programs";
import type { Program } from "@/lib/types";

export const MAX_SELECTED = 8;

function stageSummary(p: Program) {
  return p.stages
    .map((s) => `${s.name.replace(/[（(].*?[）)]/g, "").trim()} ${s.weightPct === null ? "比例未公開" : `${s.weightPct}%`}`)
    .join("　＋　");
}

const groups = PROGRAMS.reduce<{ school: string; items: Program[] }[]>((acc, p) => {
  const g = acc.find((x) => x.school === p.schoolName);
  if (g) g.items.push(p);
  else acc.push({ school: p.schoolName, items: [p] });
  return acc;
}, []);

export default function ProgramPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const atMax = selected.length >= MAX_SELECTED;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        已選 <span className="font-semibold text-foreground">{selected.length}</span> / {MAX_SELECTED} 個
        <span className="ml-2">（選越多，分析時間越長；建議 3–5 個）</span>
      </p>
      {groups.map((g) => (
        <fieldset key={g.school} disabled={disabled}>
          <legend className="mb-2 text-sm font-semibold">{g.school}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.items.map((p) => {
              const checked = selected.includes(p.id);
              const locked = !checked && atMax;
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    checked
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:border-accent/60"
                  } ${locked || disabled ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    checked={checked}
                    disabled={locked || disabled}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium leading-snug">{p.name}</span>
                    <span className="mt-1 block text-xs text-muted">{p.quota}</span>
                    <span className="mt-1 block text-xs text-muted">{stageSummary(p)}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
