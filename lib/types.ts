export const DOC_KEYS = [
  "autobiography",
  "profile",
  "studyPlan",
  "transcript",
  "extras",
] as const;

export type DocKey = (typeof DOC_KEYS)[number];

export const DOC_LABELS: Record<DocKey, string> = {
  autobiography: "自傳",
  profile: "個人資料表",
  studyPlan: "學習／研究計劃書",
  transcript: "在學成績單",
  extras: "有利審查資料",
};

export interface ReviewStage {
  name: string;
  /** 官方簡章明列的占總成績比例（%）；簡章未列則為 null */
  weightPct: number | null;
  method: string;
}

export interface Program {
  id: string;
  school: "ntu" | "nthu" | "nycu" | "ncku" | "ncu";
  schoolName: string;
  name: string;
  code?: string;
  quota: string;
  stages: ReviewStage[];
  required: string[];
  reviewFocus: string[];
  notes: string[];
  source: string;
}

export type ProgressEvent =
  | { type: "progress"; stage: "parsing" | "analyzing"; message: string; chars?: number }
  | { type: "result"; data: RecommendationResult }
  | { type: "error"; message: string };

export interface ProgramAssessment {
  programId: string;
  programName: string;
  schoolName: string;
  tier: "極低" | "偏低" | "五五波" | "偏高" | "很高";
  probabilityLow: number;
  probabilityHigh: number;
  confidence: "low" | "medium" | "high";
  /** 各審查資料對此校所書審的估計權重（總和 100） */
  documentWeights: Record<DocKey, number>;
  /** 各資料對此校所的估計得分 0–100；未提供則為 null */
  documentScores: Record<DocKey, number | null>;
  /** 由程式依權重與得分計算的書審估計分數（0–100） */
  weightedReviewScore: number;
  weightRationale: string;
  keyDrivers: string[];
  risks: string[];
}

export interface DocumentFeedback {
  docKey: DocKey;
  provided: boolean;
  score: number | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  programSpecific: { programId: string; note: string }[];
}

export interface ActionItem {
  priority: number;
  action: string;
  impact: string;
  effort: "低" | "中" | "高";
}

export interface RecommendationResult {
  model: string;
  generatedAt: string;
  overallSummary: string;
  applicantSnapshot: string[];
  strategyNote: string;
  programs: ProgramAssessment[];
  documents: DocumentFeedback[];
  actionPlan: ActionItem[];
  warnings: string[];
}
