/**
 * BYOK（自備金鑰）的伺服器端輔助函式。
 *
 * 本服務不持有任何 OpenCode Go 金鑰：金鑰由使用者存在自己的瀏覽器，
 * 每次呼叫 API 時以 `Authorization: Bearer <key>` 帶上，伺服器只在該次請求中轉發給 OpenCode Go，
 * 不寫入資料庫、不寫入日誌，也不會退回讀取環境變數。
 */

// 可列印的 ASCII、不含空白，長度 8–256。
// 目的是擋掉明顯錯誤的輸入，並避免含換行或控制字元的值被放進 HTTP 標頭（標頭注入）。
const API_KEY_PATTERN = /^[\x21-\x7E]{8,256}$/;

/** 從請求標頭讀出金鑰；沒帶或格式不合就回傳 null。 */
export function readApiKey(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const key = match?.[1]?.trim();
  return key && API_KEY_PATTERN.test(key) ? key : null;
}

/** 把文字中出現的金鑰遮蔽掉，避免上游的錯誤訊息把金鑰回顯給前端或寫進日誌。 */
export function redactKey(text: string, key: string): string {
  return key ? text.split(key).join("***") : text;
}

export const MISSING_KEY_MESSAGE = "尚未設定 OpenCode Go API 金鑰，請先到「API 金鑰」設定中輸入你自己的金鑰。";
