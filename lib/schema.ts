import { z } from "zod";
import { DOC_KEYS } from "./types";

const num = z.coerce.number().finite();
const nullableNum = z.union([num, z.null()]).default(null);
const strArr = z.array(z.string()).default([]);

const documentWeights = z
  .object({
    autobiography: num.default(0),
    profile: num.default(0),
    studyPlan: num.default(0),
    transcript: num.default(0),
    extras: num.default(0),
  })
  .prefault({});

const documentScores = z
  .object({
    autobiography: nullableNum,
    profile: nullableNum,
    studyPlan: nullableNum,
    transcript: nullableNum,
    extras: nullableNum,
  })
  .prefault({});

export const ModelOutputSchema = z.object({
  overallSummary: z.string().default(""),
  applicantSnapshot: strArr,
  strategyNote: z.string().default(""),
  programs: z.array(
    z.object({
      programId: z.string(),
      probabilityLow: num,
      probabilityHigh: num,
      confidence: z.enum(["low", "medium", "high"]).catch("low"),
      documentWeights,
      documentScores,
      weightRationale: z.string().default(""),
      keyDrivers: strArr,
      risks: strArr,
    }),
  ),
  documents: z
    .array(
      z.object({
        docKey: z.enum(DOC_KEYS),
        provided: z.boolean().default(true),
        score: nullableNum,
        summary: z.string().default(""),
        strengths: strArr,
        weaknesses: strArr,
        suggestions: strArr,
        programSpecific: z
          .array(z.object({ programId: z.string(), note: z.string() }))
          .default([]),
      }),
    )
    .default([]),
  actionPlan: z
    .array(
      z.object({
        priority: num.default(99),
        action: z.string(),
        impact: z.string().default(""),
        effort: z.enum(["低", "中", "高"]).catch("中"),
      }),
    )
    .default([]),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;

/** 從模型輸出中取出第一個完整 JSON 物件（容忍前後多餘文字與程式碼圍欄）。 */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("回應中找不到 JSON 物件");
  return JSON.parse(raw.slice(start, end + 1));
}
