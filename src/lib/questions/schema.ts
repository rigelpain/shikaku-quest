import { z } from "zod";

/** 大分類 */
export const MAJORS = ["テクノロジ系", "マネジメント系", "ストラテジ系"] as const;
export const MajorSchema = z.enum(MAJORS);
export type Major = z.infer<typeof MajorSchema>;

/** 中分類（大分類ごと） */
export const MIDDLES_BY_MAJOR = {
  テクノロジ系: [
    "基礎理論",
    "アルゴリズムとプログラミング",
    "コンピュータ構成要素",
    "システム構成要素",
    "ソフトウェア",
    "ハードウェア",
    "ユーザーインタフェース",
    "情報メディア",
    "データベース",
    "ネットワーク",
    "セキュリティ",
    "システム開発技術",
    "ソフトウェア開発管理技術",
  ],
  マネジメント系: ["プロジェクトマネジメント", "サービスマネジメント", "システム監査"],
  ストラテジ系: [
    "システム戦略",
    "システム企画",
    "経営戦略マネジメント",
    "技術戦略マネジメント",
    "ビジネスインダストリ",
    "企業活動",
    "法務",
  ],
} as const satisfies Record<Major, readonly string[]>;

export const MIDDLES = [
  ...MIDDLES_BY_MAJOR["テクノロジ系"],
  ...MIDDLES_BY_MAJOR["マネジメント系"],
  ...MIDDLES_BY_MAJOR["ストラテジ系"],
] as const;
export const MiddleSchema = z.enum(MIDDLES);
export type Middle = z.infer<typeof MiddleSchema>;

export function majorOfMiddle(middle: Middle): Major {
  for (const major of MAJORS) {
    if ((MIDDLES_BY_MAJOR[major] as readonly string[]).includes(middle)) return major;
  }
  throw new Error(`unknown middle: ${middle}`);
}

export const CERTS = ["fe", "ap", "sc", "sg"] as const;
export const CertSchema = z.enum(CERTS);
export type Cert = z.infer<typeof CertSchema>;

export const SectionSchema = z.enum(["a", "b"]);
export type Section = z.infer<typeof SectionSchema>;

export const SeasonSchema = z.enum(["春期", "秋期"]).nullable();
export type Season = z.infer<typeof SeasonSchema>;

export const KindSchema = z.enum(["公開問題", "サンプル問題", "過去問題"]);
export type Kind = z.infer<typeof KindSchema>;

export const LICENSE = "IPA: 出典明記で許諾不要" as const;

/** 問 id: `${setId}-q${2桁}` */
export const QUESTION_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-q\d{2,3}$/;
/** citation: "出典：... 問N" */
export const CITATION_RE = /^出典：.+ 問\d+$/;

export const QuestionSchema = z
  .object({
    id: z.string().regex(QUESTION_ID_RE),
    number: z.number().int().positive(),
    /** 問題文。Markdown 可。擬似言語やコードは ```text フェンス、表は Markdown 表 */
    text: z.string().min(1),
    /** 先頭の「ア」「イ」… を除いた本文。科目A/午前は 4 つ、科目B は 2〜10 個 */
    choices: z.array(z.string()).min(2).max(10),
    /** 正答の index（ア=0, イ=1, ウ=2, エ=3, オ=4 …） */
    answer: z.number().int().min(0),
    major: MajorSchema,
    middle: MiddleSchema,
    tags: z.array(z.string()).optional(),
    /** 図・画像がないと解けない場合 true */
    hasFigure: z.boolean(),
    figureNote: z.string().optional(),
    /** 図の画像。public/data/ からの相対パス（scripts/ipa/figures.ts が生成し parse.ts が埋める）。例 "figures/fe-r8-koukai-a-q06.png" */
    figureImage: z.string().regex(/^figures\/[a-z0-9-]+\.png$/).optional(),
    /** 2〜5 文。正答の理由と、主な誤答が違う理由 */
    explanation: z.string().optional(),
    explanationSource: z.literal("ai").optional(),
    /** 常に false で出力 */
    explanationVerified: z.boolean().optional(),
    /** 例 "出典：令和8年度 基本情報技術者試験 公開問題 科目A 問1" */
    citation: z.string().regex(CITATION_RE),
    pdfPage: z.number().int().positive().optional(),
  })
  .refine((q) => q.answer < q.choices.length, { message: "answer must be < choices.length", path: ["answer"] })
  .refine((q) => majorOfMiddle(q.middle) === q.major, { message: "middle does not belong to major", path: ["middle"] })
  .refine((q) => q.explanation === undefined || q.explanationSource === "ai", {
    message: "explanationSource must be 'ai' when explanation is present",
    path: ["explanationSource"],
  })
  .refine((q) => q.explanationVerified !== true, { message: "explanationVerified must be false", path: ["explanationVerified"] })
  .refine((q) => q.figureImage === undefined || q.hasFigure, { message: "figureImage requires hasFigure", path: ["figureImage"] });
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionSetSchema = z
  .object({
    /** 例 "fe-r8-koukai-a", "fe-sample-b", "ap-r7-spring-am" */
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    cert: CertSchema,
    /** a=科目A/午前, b=科目B/午後 */
    section: SectionSchema,
    title: z.string().min(1),
    era: z.string().min(1),
    season: SeasonSchema.optional(),
    kind: KindSchema,
    sourceUrl: z.string().url(),
    answerUrl: z.string().url().optional(),
    license: z.literal(LICENSE),
    generatedAt: z.string().datetime({ offset: true }),
    questions: z.array(QuestionSchema).min(1),
  })
  .refine((s) => s.questions.every((q) => q.id.startsWith(`${s.id}-q`)), { message: "question ids must be prefixed by set id", path: ["questions"] })
  .refine((s) => new Set(s.questions.map((q) => q.id)).size === s.questions.length, { message: "question ids must be unique", path: ["questions"] })
  .refine((s) => s.section === "b" || s.questions.every((q) => q.choices.length === 4), { message: "section a questions must have 4 choices", path: ["questions"] });
export type QuestionSet = z.infer<typeof QuestionSetSchema>;

export const QuestionIndexEntrySchema = z.object({
  id: z.string(),
  cert: CertSchema,
  section: SectionSchema,
  title: z.string(),
  era: z.string(),
  season: z.string().nullable().optional(),
  kind: KindSchema,
  count: z.number().int().nonnegative(),
  withExplanations: z.number().int().nonnegative(),
  /** 例 "fe/fe-r8-koukai-a.json" */
  file: z.string().regex(/^(fe|ap|sc|sg)\/[a-z0-9-]+\.json$/),
});
export type QuestionIndexEntry = z.infer<typeof QuestionIndexEntrySchema>;

export const QuestionIndexSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  sets: z.array(QuestionIndexEntrySchema),
});
export type QuestionIndex = z.infer<typeof QuestionIndexSchema>;

/** 選択肢ラベル（ア=0 …） */
export const CHOICE_LABELS = ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ"] as const;
export function choiceLabel(index: number): string {
  return CHOICE_LABELS[index] ?? String(index);
}
export function choiceIndex(label: string): number {
  return (CHOICE_LABELS as readonly string[]).indexOf(label);
}
