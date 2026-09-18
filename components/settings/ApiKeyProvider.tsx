"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { clearStoredKey, getStoredKey, setStoredKey, subscribeStoredKey } from "@/lib/api-key-store";
import SettingsDialog from "./SettingsDialog";

interface ApiKeyContextValue {
  /** 目前儲存的金鑰；尚未設定為 null。伺服器端渲染時一律為 null，hydrate 後才會是實際值。 */
  apiKey: string | null;
  /** 是否已在瀏覽器完成 hydrate。false 時 apiKey 的 null 不代表「未設定」，UI 應顯示中性狀態，避免閃爍。 */
  ready: boolean;
  /** 開啟金鑰設定視窗；reason 會顯示在視窗頂端（例如「金鑰無效，請重新輸入」）。 */
  openSettings: (reason?: string) => void;
  closeSettings: () => void;
  /** 儲存金鑰，回傳是否成功寫入 localStorage（false 代表只暫存在記憶體）。 */
  saveKey: (key: string) => boolean;
  removeKey: () => void;
  dialogOpen: boolean;
  dialogReason: string | null;
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function useApiKey(): ApiKeyContextValue {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error("useApiKey 必須在 <ApiKeyProvider> 內使用");
  return ctx;
}

export default function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore：伺服器端與 hydrate 階段使用第三個參數（null），
  // 完成 hydrate 後才切換成真正的 localStorage 值，因此不會產生 hydration 不一致。
  const apiKey = useSyncExternalStore(subscribeStoredKey, getStoredKey, () => null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [dialog, setDialog] = useState<{ open: boolean; reason: string | null }>({ open: false, reason: null });

  const openSettings = useCallback((reason?: string) => setDialog({ open: true, reason: reason ?? null }), []);
  const closeSettings = useCallback(() => setDialog({ open: false, reason: null }), []);

  const value = useMemo<ApiKeyContextValue>(
    () => ({
      apiKey,
      ready,
      openSettings,
      closeSettings,
      saveKey: setStoredKey,
      removeKey: clearStoredKey,
      dialogOpen: dialog.open,
      dialogReason: dialog.reason,
    }),
    [apiKey, ready, openSettings, closeSettings, dialog],
  );

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
      <SettingsDialog />
    </ApiKeyContext.Provider>
  );
}
