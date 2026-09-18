"use client";

import { useEffect, useRef, useState } from "react";
import { DOC_KEYS, DOC_LABELS, type DocKey, type ProgressEvent, type RecommendationResult } from "@/lib/types";
import ProgramPicker from "./ProgramPicker";
import ResultView from "./ResultView";
import UploadCard from "./UploadCard";

const DOC_HINTS: Record<DocKey, string> = {
  autobiography: "各校多限 1–2 頁（清大限中文 1 頁）。",
  profile: "各系所網站下載的指定格式「個人資料表」。",
  studyPlan: "學習／研究計劃書（清大需英文、限 2 頁）。",
  transcript: "含總平均與班排／系排名次；有名次證明書一併貼上更準確。",
  extras: "專題報告、競賽、CPE、證照、實習、論文、英文成績等。",
};

type Status = "idle" | "running" | "done" | "error";

const emptyRecord = <T,>(v: () => T) => Object.fromEntries(DOC_KEYS.map((k) => [k, v()])) as Record<DocKey, T>;

export default function Simulator() {
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<DocKey, File[]>>(() => emptyRecord(() => []));
  const [texts, setTexts] = useState<Record<DocKey, string>>(() => emptyRecord(() => ""));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const running = status === "running";
  const hasInput = DOC_KEYS.some((k) => files[k].length > 0 || texts[k].trim().length > 0);
  const canSubmit = !running && selected.length > 0 && hasInput;

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (status === "done") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status]);

  async function submit() {
    const fd = new FormData();
    selected.forEach((id) => fd.append("programs", id));
    for (const k of DOC_KEYS) {
      files[k].forEach((f) => fd.append(`file:${k}`, f));
      if (texts[k].trim()) fd.append(`text:${k}`, texts[k]);
    }
    fd.append("notes", notes);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("running");
    setError("");
    setResult(null);
    setElapsed(0);
    setProgress("上傳資料中…");

    let finished = false;
    try {
      const res = await fetch("/api/recommendation?stream=1", { method: "POST", body: fd, signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `伺服器回應錯誤（HTTP ${res.status}）`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const handle = (e: ProgressEvent) => {
        if (e.type === "progress") setProgress(e.message);
        else if (e.type === "error") throw new Error(e.message);
        else {
          finished = true;
          setResult(e.data);
          setStatus("done");
        }
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handle(JSON.parse(line) as ProgressEvent);
        }
      }
      if (!finished) throw new Error("連線中斷，未收到分析結果，請重試。");
    } catch (e) {
      if (ctrl.signal.aborted) {
        setStatus("idle");
        return;
      }
      setError(e instanceof Error ? e.message : "發生未知錯誤");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="s1">
        <h2 id="s1" className="mb-4 flex items-baseline gap-3 font-serif text-2xl font-black">
          <span className="font-mono text-sm font-medium text-accent">01</span>
          選擇想評估的校系
        </h2>
        <ProgramPicker selected={selected} onChange={setSelected} disabled={running} />
      </section>

      <section aria-labelledby="s2">
        <h2 id="s2" className="mb-1 flex items-baseline gap-3 font-serif text-2xl font-black">
          <span className="font-mono text-sm font-medium text-accent">02</span>
          上傳備審資料
        </h2>
        <p className="mb-3 text-sm text-muted">
          至少提供一項即可分析，但缺少的項目會被視為缺件並影響評分。資料只用於本次分析，不會被儲存。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOC_KEYS.map((k) => (
            <UploadCard
              key={k}
              label={DOC_LABELS[k]}
              hint={DOC_HINTS[k]}
              files={files[k]}
              text={texts[k]}
              disabled={running}
              onFiles={(f) => setFiles((s) => ({ ...s, [k]: f }))}
              onText={(t) => setTexts((s) => ({ ...s, [k]: t }))}
            />
          ))}
          <div className="rounded-xl border border-border bg-surface p-4 sm:col-span-2">
            <h3 className="font-serif text-base font-bold">補充說明（選填）</h3>
            <p className="mt-0.5 text-xs text-muted">
              例如推薦信是否已備妥、系排名／GPA、有無聯繫過教授、想進的研究方向。
            </p>
            <textarea
              value={notes}
              disabled={running}
              maxLength={3000}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
      </section>

      <section aria-live="polite" className="space-y-3 border-t border-border pt-8">
        <h2 className="mb-1 flex items-baseline gap-3 font-serif text-2xl font-black">
          <span className="font-mono text-sm font-medium text-accent">03</span>
          送出審查
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-accent px-6 py-3 text-base font-semibold text-white shadow-[0_10px_24px_-12px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none dark:text-black"
          >
            {running ? "分析中…" : "開始審查模擬"}
          </button>
          {running && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="rounded-lg border border-border px-4 py-2.5 text-sm hover:border-red-400 hover:text-red-500"
            >
              取消
            </button>
          )}
          {!running && !canSubmit && (
            <span className="text-sm text-muted">
              {selected.length === 0 ? "請先選擇校系" : "請至少上傳或貼上一項資料"}
            </span>
          )}
        </div>

        {running && (
          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span>{progress}</span>
            </div>
            <p className="mt-1 text-xs text-muted">已進行 {elapsed} 秒，通常需要 30 秒到 3 分鐘，請勿關閉頁面。</p>
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="rounded-lg border border-red-400/60 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <p className="font-semibold">分析失敗</p>
            <p className="mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        )}
      </section>

      {result && (
        <div ref={resultRef} className="scroll-mt-6">
          <ResultView result={result} />
        </div>
      )}
    </div>
  );
}
