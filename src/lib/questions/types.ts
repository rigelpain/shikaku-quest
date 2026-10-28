// 問題データの型。zod スキーマ（./schema.ts）と同じ形。public/data/questions 配下の JSON が実体。
import type { Major } from "@/content/categories";

export interface Question {
  id: string;
  number: number;
  text: string;
  choices: string[];
  answer: number;
  major: Major;
  middle: string;
  tags?: string[];
  hasFigure: boolean;
  figureNote?: string;
  explanation?: string;
  explanationSource?: "ai";
  explanationVerified?: boolean;
  citation: string;
  pdfPage?: number;
}

export interface QuestionSet {
  id: string;
  cert: "fe" | "ap" | "sc" | "sg";
  section: "a" | "b";
  title: string;
  era: string;
  season?: "春期" | "秋期" | null;
  kind: "公開問題" | "サンプル問題" | "過去問題";
  sourceUrl: string;
  answerUrl?: string;
  license: string;
  generatedAt: string;
  questions: Question[];
}

export interface QuestionIndexEntry {
  id: string;
  cert: QuestionSet["cert"];
  section: "a" | "b";
  title: string;
  era: string;
  season?: string | null;
  kind: QuestionSet["kind"];
  count: number;
  withExplanations: number;
  file: string;
}

export interface QuestionIndex {
  generatedAt: string;
  sets: QuestionIndexEntry[];
}

export const CHOICE_LABELS = ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ"] as const;
