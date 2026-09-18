import { randomUUID } from "node:crypto";
import { redactKey } from "./api-key";

export const BASE_URL = process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/zen/go/v1";
export const MODEL = process.env.OPENCODE_GO_MODEL ?? "deepseek-v4.1-flash";

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
export type OpenCodeErrorCode = "invalid_api_key";

export class OpenCodeError extends Error {
  constructor(
    message: string,
    readonly code?: OpenCodeErrorCode,
  ) {
    super(message);
  }
}

const INVALID_KEY_MESSAGE =
  "OpenCode Go 拒絕了這把 API 金鑰（可能填錯、已撤銷，或帳號沒有 Go 方案）。請到「API 金鑰」重新設定。";

interface StreamChunk {
  choices?: {
    delta?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
}

/** 依上游的 HTTP 狀態把失敗轉成使用者看得懂的錯誤；401/403 一律視為金鑰問題。 */
async function toUpstreamError(res: Response, apiKey: string): Promise<OpenCodeError> {
  if (res.status === 401 || res.status === 403) return new OpenCodeError(INVALID_KEY_MESSAGE, "invalid_api_key");
  const detail = redactKey(await res.text().catch(() => ""), apiKey);
  return new OpenCodeError(`OpenCode Go 回應錯誤（HTTP ${res.status}）：${detail.slice(0, 300)}`);
}

/**
 * 呼叫 OpenCode Go 的 OpenAI 相容 chat/completions（串流），累積回應內容。
 * 使用的是「使用者自備」的 apiKey；依官方要求送出穩定的 x-opencode-session 與自訂 User-Agent。
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
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "x-opencode-session": opts.sessionId ?? randomUUID(),
      "User-Agent": "ai-recommendation/0.1",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      response_format: { type: "json_object" },
      max_tokens: opts.maxTokens ?? 16000,
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
      throw new OpenCodeError(redactKey(chunk.error.message ?? "OpenCode Go 串流錯誤", opts.apiKey));
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

/**
 * 驗證金鑰是否有效。
 * 注意：OpenCode 的 /models 是公開端點（無效金鑰也回 200），不能拿來驗證；
 * 這裡改送一個 max_tokens 極小的對話請求，只有真正的金鑰才會通過，花費可忽略。
 */
export async function verifyKey(apiKey: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "x-opencode-session": randomUUID(),
      "User-Agent": "ai-recommendation/0.1",
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
  });
  if (!res.ok) throw await toUpstreamError(res, apiKey);
  await res.body?.cancel();
}
