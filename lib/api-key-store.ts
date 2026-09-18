/**
 * 瀏覽器端的金鑰儲存（BYOK）。只能在瀏覽器使用。
 *
 * - 金鑰存在 localStorage，只留在使用者自己的瀏覽器；只有在呼叫本站 API 時才會隨請求送出。
 * - 設計成可搭配 React 的 useSyncExternalStore：任何元件改了金鑰，其他元件與其他分頁都會同步更新。
 * - 若瀏覽器封鎖 localStorage（隱私模式、被停用），退回只存在記憶體，關掉頁面就消失，
 *   並讓呼叫端知道「沒有成功持久化」以便提示使用者。
 */

const STORAGE_KEY = "ai-recommendation:opencode-api-key";

const listeners = new Set<() => void>();
let memoryKey: string | null = null;

function notify() {
  listeners.forEach((l) => l());
}

/** 取得目前的金鑰；沒有則為 null。回傳值為字串或 null，供 useSyncExternalStore 比較是否變動。 */
export function getStoredKey(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryKey;
  } catch {
    return memoryKey;
  }
}

/** 儲存金鑰。回傳 false 代表 localStorage 不可用，金鑰只暫存在記憶體（重新整理後會消失）。 */
export function setStoredKey(key: string): boolean {
  memoryKey = key;
  let persisted = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    persisted = false;
  }
  notify();
  return persisted;
}

export function clearStoredKey(): void {
  memoryKey = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage 不可用時，記憶體已清空即可 */
  }
  notify();
}

export function subscribeStoredKey(callback: () => void): () => void {
  listeners.add(callback);
  // 其他分頁修改 localStorage 時會觸發 storage 事件（同一分頁內的修改不會，所以上面另有 notify）
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** 顯示用的遮罩版本，例如 sk-…a1b2；避免把完整金鑰印在畫面上。 */
export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 3)}…${key.slice(-4)}`;
}
