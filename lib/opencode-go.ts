import { redactKey } from "./api-key";

// OpenCode Go 的 OpenAI 相容端點（https://opencode.ai/docs/go/）。
// 只支援「OpenAI 相容」系列的模型（本服務固定使用 deepseek-v4.1-flash）。
export const BASE_URL = process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/inference/go/openai/v1";
export const MODEL = process.env.OPENCODE_GO_MODEL ?? "deepseek-v4.1-flash";

// OpenCode Go 要求用戶端「表明身分」並帶上穩定的 session id，以便路由與 prompt 快取；
// 缺少 x-opencode-session 會被回 400。詳見官方文件「Where can I use it?」。
const USER_AGENT = "ai-recommendation/1.0";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamStats {
  contentChars: number;
  reasoningChars: number;
}

export interface ChatResult {
  content: string;
  finishReason: string | null;
}

/** 前端可依 code 決定要不要引導使用者重新設定金鑰。 */
export type AiErrorCode = "invalid_api_key";

export class AiError extends Error {
  constructor(
    message: string,
    readonly code?: AiErrorCode,
  ) {
    super(message);
  }
}

const INVALID_KEY_MESSAGE =
  "OpenCode Go 拒絕了這把 API 金鑰（可能填錯、已撤銷，或方案未開通）。請到「API 金鑰」重新設定。";

interface StreamChunk {
  choices?: {
    delta?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
}

/** 依上游的 HTTP 狀態把失敗轉成使用者看得懂的錯誤；401/403 一律視為金鑰問題。 */
async function toUpstreamError(res: Response, apiKey: string): Promise<AiError> {
  if (res.status === 401 || res.status === 403) return new AiError(INVALID_KEY_MESSAGE, "invalid_api_key");
  const detail = redactKey(await res.text().catch(() => ""), apiKey);
  return new AiError(`OpenCode Go 回應錯誤（HTTP ${res.status}）：${detail.slice(0, 300)}`);
}

/** OpenCode Go 需要的標頭：表明身分的 User-Agent，以及穩定路由用的 session id。 */
function providerHeaders(apiKey: string, sessionId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "x-opencode-session": sessionId,
  };
}

/**
 * 呼叫 OpenCode Go 的 OpenAI 相容 chat/completions（串流），累積回應內容。
 * 使用的是「使用者自備」的 apiKey（OpenCode Go 金鑰，oc_sk_…）。
 * sessionId 用來讓同一段對話使用同一個 session（利於路由與快取）；未提供時退回隨機值。
 */
export async function chatStream(
  messages: ChatMessage[],
  opts: {
    apiKey: string;
    sessionId?: string;
    signal?: AbortSignal;
    maxTokens?: number;
    onStats?: (s: StreamStats) => void;
  },
): Promise<ChatResult> {
  const sessionId = opts.sessionId || crypto.randomUUID();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: providerHeaders(opts.apiKey, sessionId),
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      response_format: { type: "json_object" },
      max_tokens: opts.maxTokens ?? 32000,
    }),
  });

  if (!res.ok || !res.body) throw await toUpstreamError(res, opts.apiKey);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const stats: StreamStats = { contentChars: 0, reasoningChars: 0 };
  let content = "";
  let finishReason: string | null = null;
  let buffer = "";

  const handleLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    let chunk: StreamChunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      return;
    }
    if (chunk.error) {
      throw new AiError(redactKey(chunk.error.message ?? "OpenCode Go 串流錯誤", opts.apiKey));
    }
    const choice = chunk.choices?.[0];
    if (!choice) return;
    const d = choice.delta;
    if (d?.content) {
      content += d.content;
      stats.contentChars += d.content.length;
    }
    const reasoning = d?.reasoning ?? d?.reasoning_content;
    if (reasoning) stats.reasoningChars += reasoning.length;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    opts.onStats?.(stats);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, nl).trim());
      buffer = buffer.slice(nl + 1);
    }
  }
  if (buffer.trim()) handleLine(buffer.trim());

  return { content, finishReason };
}

/** 驗證金鑰是否有效：送一個 max_tokens 極小的對話請求，花費可忽略。 */
export async function verifyKey(apiKey: string, opts: { sessionId?: string; signal?: AbortSignal } = {}): Promise<void> {
  const sessionId = opts.sessionId || crypto.randomUUID();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: providerHeaders(apiKey, sessionId),
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ping" }], max_tokens: 16 }),
  });
  if (!res.ok) throw await toUpstreamError(res, apiKey);
  await res.body?.cancel();
}
