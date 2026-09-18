"use client";

import { useApiKey } from "./ApiKeyProvider";

/** 標頭上的「API 金鑰」按鈕：以圓點顯示目前是否已設定，點擊開啟設定視窗。 */
export default function ApiKeyButton({ className = "" }: { className?: string }) {
  const { apiKey, ready, openSettings } = useApiKey();

  // 尚未 hydrate 時不知道使用者有沒有設定，先顯示中性色，避免「未設定」一閃而過
  const dot = !ready ? "bg-border" : apiKey ? "bg-good" : "bg-amber-500";
  const label = !ready ? "API 金鑰" : apiKey ? "API 金鑰：已設定" : "API 金鑰：尚未設定";

  return (
    <button
      type="button"
      onClick={() => openSettings()}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-accent hover:text-accent ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      API 金鑰
    </button>
  );
}
