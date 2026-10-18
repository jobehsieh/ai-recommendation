/**
 * 瀏覽器端的 session id（給 OpenCode Go 的 `x-opencode-session` 標頭用）。
 *
 * OpenCode Go 要求每個對話帶上穩定的 session id，以便路由與 prompt 快取；
 * 缺少會被回 400。這裡讓同一個瀏覽器維持同一個隨機 id（存 localStorage），
 * 只是一個隨機字串，不含任何可識別個人的資訊。
 */

const STORAGE_KEY = "ai-recommendation:session-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** 取得（必要時建立）本瀏覽器穩定的 session id。 */
export function getSessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = randomId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage 被封鎖時退回一次性 id（仍可通過上游要求，只是沒有跨請求快取）
    return randomId();
  }
}
