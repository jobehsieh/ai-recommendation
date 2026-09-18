import { randomUUID } from "node:crypto";

const BASE_URL = process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/zen/go/v1";
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

export class OpenCodeError extends Error {}

interface StreamChunk {
  choices?: {
    delta?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
}

/**
 * 呼叫 OpenCode Go 的 OpenAI 相容 chat/completions（串流），累積回應內容。
 * 依官方要求送出穩定的 x-opencode-session 與自訂 User-Agent。
 */
export async function chatStream(
  messages: ChatMessage[],
  opts: {
    sessionId?: string;
    signal?: AbortSignal;
    maxTokens?: number;
    onStats?: (s: StreamStats) => void;
  } = {},
): Promise<ChatResult> {
  const apiKey = process.env.OpenCode_GO_KEY;
  if (!apiKey) {
    throw new OpenCodeError("伺服器未設定環境變數 OpenCode_GO_KEY，請檢查 .env.local。");
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new OpenCodeError(`OpenCode Go 回應錯誤（HTTP ${res.status}）：${detail.slice(0, 300)}`);
  }

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
    if (chunk.error) throw new OpenCodeError(chunk.error.message ?? "OpenCode Go 串流錯誤");
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
