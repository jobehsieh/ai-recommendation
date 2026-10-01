import { MISSING_KEY_MESSAGE, readApiKey } from "@/lib/api-key";
import { GeminiError, verifyKey } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/key/verify —— 讓使用者在儲存金鑰前先確認它有效。
 * 金鑰從 Authorization 標頭讀取，只轉發給 Google Gemini，不儲存、不記錄。
 */
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };

  const apiKey = readApiKey(request);
  if (!apiKey) {
    return Response.json({ ok: false, code: "missing_api_key", error: MISSING_KEY_MESSAGE }, { status: 401, headers });
  }

  try {
    await verifyKey(apiKey, AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]));
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    if (e instanceof GeminiError && e.code === "invalid_api_key") {
      return Response.json({ ok: false, code: e.code, error: e.message }, { status: 401, headers });
    }
    // 其他情況（網路問題、上游暫時故障、逾時）與金鑰本身無關，回 502 讓前端顯示「無法驗證」
    const message = e instanceof Error ? e.message : "未知錯誤";
    return Response.json({ ok: false, error: `無法驗證金鑰：${message}` }, { status: 502, headers });
  }
}
