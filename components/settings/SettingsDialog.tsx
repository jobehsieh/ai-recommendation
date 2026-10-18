"use client";

import { useEffect, useRef, useState } from "react";
import { maskKey } from "@/lib/api-key-store";
import { getSessionId } from "@/lib/session-id";
import { useApiKey } from "./ApiKeyProvider";

type Phase =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "error"; message: string; canForce: boolean };

const KEY_FORMAT = /^[\x21-\x7E]{8,256}$/;

/** 金鑰設定視窗（BYOK）。使用原生 <dialog>，自帶焦點管理、Esc 關閉與遮罩。 */
export default function SettingsDialog() {
  const { apiKey, dialogOpen, dialogReason, closeSettings, saveKey, removeKey } = useApiKey();
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [notice, setNotice] = useState<string | null>(null);

  // 依 context 的開關狀態同步原生 dialog；每次開啟都重置表單，避免殘留上次輸入或錯誤
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dialogOpen && !d.open) {
      setValue("");
      setShow(false);
      setPhase({ kind: "idle" });
      setNotice(null);
      d.showModal();
    } else if (!dialogOpen && d.open) {
      d.close();
    }
  }, [dialogOpen]);

  const trimmed = value.trim();
  const formatOk = KEY_FORMAT.test(trimmed);

  function persist(key: string) {
    const persisted = saveKey(key);
    if (persisted) {
      closeSettings();
    } else {
      // localStorage 被瀏覽器封鎖：金鑰仍可在這個分頁使用，但不會被記住
      setNotice("瀏覽器封鎖了 localStorage，金鑰只暫存在這個頁面，重新整理後需要再輸入一次。");
      setPhase({ kind: "idle" });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formatOk) return;
    setPhase({ kind: "verifying" });
    try {
      const res = await fetch("/api/key/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${trimmed}`, "x-opencode-session": getSessionId() },
      });
      if (res.ok) return persist(trimmed);
      const body = await res.json().catch(() => null);
      if (res.status === 401) {
        // 金鑰確定被 OpenCode Go 拒絕：不儲存，讓使用者修正
        setPhase({ kind: "error", message: body?.error ?? "金鑰無效。", canForce: false });
      } else {
        // 網路或上游暫時故障，與金鑰本身無關：允許使用者略過驗證直接儲存
        setPhase({ kind: "error", message: body?.error ?? `無法驗證（HTTP ${res.status}）。`, canForce: true });
      }
    } catch {
      setPhase({ kind: "error", message: "無法連線到伺服器，暫時無法驗證金鑰。", canForce: true });
    }
  }

  const verifying = phase.kind === "verifying";

  return (
    <dialog
      ref={ref}
      onClose={closeSettings}
      // 點擊遮罩（dialog 本身，而非內容）時關閉
      onClick={(e) => e.target === ref.current && closeSettings()}
      aria-labelledby="key-dialog-title"
      // m-auto：Tailwind 的 preflight 會把 margin 歸零，需要手動讓 modal 置中
      className="m-auto max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-accent">設定</p>
            <h2 id="key-dialog-title" className="mt-1 font-serif text-2xl font-black">
              OpenCode Go API 金鑰
            </h2>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="關閉"
            className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-md text-xl text-muted hover:bg-surface-2 hover:text-foreground"
          >
            ×
          </button>
        </div>

        {dialogReason && (
          <p role="alert" className="mt-4 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
            {dialogReason}
          </p>
        )}

        <p className="mt-4 text-sm leading-7 text-muted">
          本服務採<strong className="font-semibold text-foreground">自備金鑰（BYOK）</strong>
          ：審查使用的是你自己的 OpenCode Go 額度，我們不提供也不保管金鑰。還沒有的話，可以到{" "}
          <a
            href="https://opencode.ai/console"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            OpenCode Go
          </a>{" "}
          取得。
        </p>

        {apiKey && (
          <p className="mt-4 flex items-center gap-2 text-sm">
            <span aria-hidden className="h-2 w-2 rounded-full bg-good" />
            目前已設定：<code className="font-mono text-xs">{maskKey(apiKey)}</code>
          </p>
        )}

        <label htmlFor="api-key-input" className="mt-5 block text-sm font-medium">
          {apiKey ? "更換為新的金鑰" : "貼上你的金鑰"}
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="api-key-input"
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (phase.kind === "error") setPhase({ kind: "idle" });
            }}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            placeholder="oc_sk_…"
            disabled={verifying}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="shrink-0 rounded-lg border border-border px-3 text-sm text-muted hover:border-accent hover:text-foreground"
          >
            {show ? "隱藏" : "顯示"}
          </button>
        </div>

        {trimmed && !formatOk && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            格式看起來不對：金鑰應為 8 個字元以上、不含空白與中文。
          </p>
        )}

        {phase.kind === "error" && (
          <div role="alert" className="mt-3 rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {phase.message}
            {phase.canForce && (
              <button
                type="button"
                onClick={() => persist(trimmed)}
                className="ml-2 font-semibold underline underline-offset-2"
              >
                略過驗證，直接儲存
              </button>
            )}
          </div>
        )}

        {notice && (
          <p role="status" className="mt-3 rounded-lg border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {notice}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!formatOk || verifying}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-black"
          >
            {verifying ? "驗證中…" : "驗證並儲存"}
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={() => {
                removeKey();
                closeSettings();
              }}
              className="rounded-md border border-border px-4 py-2.5 text-sm hover:border-red-400 hover:text-red-500"
            >
              清除金鑰
            </button>
          )}
          <button
            type="button"
            onClick={closeSettings}
            className="rounded-md px-4 py-2.5 text-sm text-muted hover:text-foreground"
          >
            取消
          </button>
        </div>

        <ul className="mt-6 space-y-1.5 border-t border-border pt-5 text-xs leading-relaxed text-muted">
          <li>· 金鑰只存在<strong className="font-medium text-foreground">這個瀏覽器的 localStorage</strong>，不會存到我們的伺服器。</li>
          <li>· 每次分析時，金鑰會隨請求送到本站伺服器並轉發給 OpenCode Go，我們不會儲存或記錄它。</li>
          <li>· 共用電腦請用完後按「清除金鑰」；同一個瀏覽器上的其他網站腳本無法讀取，但瀏覽器擴充功能可能可以。</li>
          <li>· 「驗證」會用你的額度發出一則極短的測試訊息，花費可忽略。</li>
        </ul>
      </form>
    </dialog>
  );
}
