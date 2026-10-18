import { getProgram } from "@/data/programs";
import { chatStream, MODEL, type ChatMessage } from "./opencode-go";
import { buildMessages, type DocInput } from "./prompt";
import { ModelOutputSchema, extractJson, type ModelOutput } from "./schema";
import {
  DOC_KEYS,
  DOC_LABELS,
  type DocKey,
  type DocumentFeedback,
  type ProgramAssessment,
  type RecommendationResult,
} from "./types";

export interface RecommendationInput {
  programIds: string[];
  docs: Record<DocKey, DocInput>;
  notes: string;
  warnings: string[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function tierOf(mid: number): ProgramAssessment["tier"] {
  if (mid < 10) return "極低";
  if (mid < 35) return "偏低";
  if (mid < 60) return "五五波";
  if (mid < 80) return "偏高";
  return "很高";
}

/** 權重正規化到總和 100；模型全給 0 時退回平均。 */
function normalizeWeights(w: Record<DocKey, number>): Record<DocKey, number> {
  const clean = Object.fromEntries(DOC_KEYS.map((k) => [k, Math.max(0, w[k] ?? 0)])) as Record<DocKey, number>;
  const sum = DOC_KEYS.reduce((s, k) => s + clean[k], 0);
  if (sum <= 0) return Object.fromEntries(DOC_KEYS.map((k) => [k, 20])) as Record<DocKey, number>;
  const scaled = Object.fromEntries(DOC_KEYS.map((k) => [k, Math.round((clean[k] / sum) * 100)])) as Record<
    DocKey,
    number
  >;
  // 修正四捨五入誤差，使總和恰為 100
  const diff = 100 - DOC_KEYS.reduce((s, k) => s + scaled[k], 0);
  const maxKey = DOC_KEYS.reduce((a, b) => (scaled[b] > scaled[a] ? b : a));
  scaled[maxKey] += diff;
  return scaled;
}

function postProcess(out: ModelOutput, input: RecommendationInput): RecommendationResult {
  const programs: ProgramAssessment[] = [];
  let usedFallback = false;
  for (const id of input.programIds) {
    const p = getProgram(id);
    const a = out.programs.find((x) => x.programId === id);
    if (!p || !a) continue;

    let low = clamp(Math.round(Math.min(a.probabilityLow, a.probabilityHigh)), 1, 95);
    let high = clamp(Math.round(Math.max(a.probabilityLow, a.probabilityHigh)), 1, 95);
    const minWidth = a.confidence === "low" ? 20 : 10;
    if (high - low < minWidth) {
      const mid = (low + high) / 2;
      low = clamp(Math.round(mid - minWidth / 2), 1, 95 - minWidth);
      high = low + minWidth;
    }

    const weights = normalizeWeights(a.documentWeights);
    const scores = Object.fromEntries(
      DOC_KEYS.map((k) => {
        // 使用者沒提供的資料，分數以 null 呈現，計入加權時視為 0
        if (!input.docs[k].provided) return [k, null];
        // 模型漏填該校所的個別分數時，退回該文件的整體分數，避免被悄悄算成 0
        const own = a.documentScores[k];
        const fallback = out.documents.find((d) => d.docKey === k)?.score ?? null;
        if (own === null && fallback !== null) usedFallback = true;
        const s = own ?? fallback;
        return [k, s === null ? null : clamp(Math.round(s), 0, 100)];
      }),
    ) as Record<DocKey, number | null>;
    const weighted = DOC_KEYS.reduce((s, k) => s + (weights[k] * (scores[k] ?? 0)) / 100, 0);

    programs.push({
      programId: id,
      programName: p.name,
      schoolName: p.schoolName,
      tier: tierOf((low + high) / 2),
      probabilityLow: low,
      probabilityHigh: high,
      confidence: a.confidence,
      documentWeights: weights,
      documentScores: scores,
      weightedReviewScore: Math.round(weighted * 10) / 10,
      weightRationale: a.weightRationale,
      keyDrivers: a.keyDrivers,
      risks: a.risks,
    });
  }

  const documents: DocumentFeedback[] = DOC_KEYS.map((k) => {
    const d = out.documents.find((x) => x.docKey === k);
    const provided = input.docs[k].provided;
    return {
      docKey: k,
      provided,
      score: provided && d?.score != null ? clamp(Math.round(d.score), 0, 100) : null,
      summary: d?.summary || (provided ? "" : `尚未提供「${DOC_LABELS[k]}」，此項會被視為缺件。`),
      strengths: d?.strengths ?? [],
      weaknesses: d?.weaknesses ?? [],
      suggestions: d?.suggestions ?? [],
      programSpecific: (d?.programSpecific ?? []).filter((x) => input.programIds.includes(x.programId)),
    };
  });

  return {
    model: MODEL,
    generatedAt: new Date().toISOString(),
    overallSummary: out.overallSummary,
    applicantSnapshot: out.applicantSnapshot,
    strategyNote: out.strategyNote,
    programs,
    documents,
    actionPlan: [...out.actionPlan].sort((a, b) => a.priority - b.priority),
    warnings: usedFallback
      ? [...input.warnings, "AI 未針對部分校所分別評分，加權分數改以各文件的整體分數估算，僅供參考。"]
      : input.warnings,
  };
}

export async function runRecommendation(
  input: RecommendationInput,
  opts: {
    apiKey: string;
    sessionId?: string;
    signal?: AbortSignal;
    onProgress?: (message: string, chars: number) => void;
  },
): Promise<RecommendationResult> {
  const messages: ChatMessage[] = buildMessages(input.programIds, input.docs, input.notes);
  const startedAt = Date.now();
  let lastEmit = 0;

  const call = (msgs: ChatMessage[]) =>
    chatStream(msgs, {
      apiKey: opts.apiKey,
      sessionId: opts.sessionId,
      signal: opts.signal,
      onStats: (s) => {
        const now = Date.now();
        if (now - lastEmit < 1000) return;
        lastEmit = now;
        const sec = Math.round((now - startedAt) / 1000);
        const phase = s.contentChars > 0 ? "撰寫報告" : "推理思考中";
        opts.onProgress?.(`AI ${phase}…（已 ${sec} 秒，輸出 ${s.contentChars} 字）`, s.contentChars);
      },
    });

  let { content, finishReason } = await call(messages);
  if (finishReason === "length") {
    throw new Error("AI 輸出被長度上限截斷，請減少同時評估的校所數量或縮短上傳內容後重試。");
  }

  for (let attempt = 0; ; attempt++) {
    try {
      const parsed = ModelOutputSchema.parse(extractJson(content));
      if (!parsed.programs.length) throw new Error("programs 為空");
      return postProcess(parsed, input);
    } catch (e) {
      if (attempt >= 1) {
        throw new Error(`AI 回傳格式無法解析：${e instanceof Error ? e.message : String(e)}`);
      }
      opts.onProgress?.("回傳格式有誤，正在請 AI 修正…", 0);
      ({ content, finishReason } = await call([
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content: `你上一則回覆無法被解析（${e instanceof Error ? e.message : String(e)}）。請重新輸出完整、合法、符合格式的 JSON 物件，不要有任何其他文字。`,
        },
      ]));
      if (finishReason === "length") throw new Error("AI 輸出被長度上限截斷。");
    }
  }
}
