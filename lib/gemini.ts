import { redactKey } from "./api-key";

export const BASE_URL = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

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
export type GeminiErrorCode = "invalid_api_key";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly code?: GeminiErrorCode,
  ) {
    super(message);
  }
}

const INVALID_KEY_MESSAGE =
  "Google Gemini 拒絕了這把 API 金鑰（可能填錯、已撤銷，或未啟用 Gemini API）。請到「API 金鑰」重新設定。";

interface StreamChunk {
  choices?: {
    delta?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
}

/** 依上游的 HTTP 狀態把失敗轉成使用者看得懂的錯誤；401/403 一律視為金鑰問題。 */
async function toUpstreamError(res: Response, apiKey: string): Promise<GeminiError> {
  if (res.status === 401 || res.status === 403) return new GeminiError(INVALID_KEY_MESSAGE, "invalid_api_key");
  const detail = redactKey(await res.text().catch(() => ""), apiKey);
  return new GeminiError(`Gemini 回應錯誤（HTTP ${res.status}）：${detail.slice(0, 300)}`);
}

/**
 * 呼叫 Google Gemini 的 OpenAI 相容 chat/completions（串流），累積回應內容。
 * 使用的是「使用者自備」的 apiKey（Google AI Studio 金鑰）。
 */
export async function chatStream(
  messages: ChatMessage[],
  opts: {
    apiKey: string;
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
      throw new GeminiError(redactKey(chunk.error.message ?? "Gemini 串流錯誤", opts.apiKey));
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
export async function verifyKey(apiKey: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ping" }], max_tokens: 16 }),
  });
  if (!res.ok) throw await toUpstreamError(res, apiKey);
  await res.body?.cancel();
}
