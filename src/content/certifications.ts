// 資格カタログ（静的データ）。試験日程・制度は 2026-10-28 時点の IPA 公開情報に基づく。
export type CertCategory = "情報処理技術者" | "ベンダー資格" | "ものづくり";

export interface ScheduleItem {
  /** 例: "2026年度 後期" */
  label: string;
  /** 例: "申込" "科目A" "科目B" "修了試験" */
  phase: string;
  from: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  note?: string;
}

export interface Certification {
  id: string;
  name: string;
  short: string;
  org: string;
  category: CertCategory;
  /** IPA の試験区分レベル（1〜4） */
  level?: number;
  fee?: string;
  format: string;
  passCriteria?: string;
  /** 現行制度と、分かっている範囲の次制度 */
  system?: { current: string; next?: string };
  exemptions?: string[];
  schedule: ScheduleItem[];
  links: { official: string; apply?: string; pastQuestions?: string; syllabus?: string };
  /** 先に取っておくと有利な資格 id */
  recommendedAfter?: string[];
  /** 問題データ（public/data/questions）を持つか */
  hasQuestionBank: boolean;
  /** 登録候補（種類は後で決める） */
  placeholder?: boolean;
  tags: string[];
}

export const CERTIFICATIONS: Certification[] = [
  {
    id: "fe",
    name: "基本情報技術者試験",
    short: "基本情報",
    org: "IPA",
    category: "情報処理技術者",
    level: 2,
    fee: "7,500円",
    format: "CBT（通年）。科目A 90分・四肢択一60問、科目B 100分・多肢選択20問（アルゴリズム16問＋セキュリティ4問）",
    passCriteria: "科目A・科目Bとも 1,000点満点中 600点以上（IRT）",
    system: {
      current: "現行CBTは 2026年12月28日以降いったん休止（会場により12月27日より前に休止）",
      next: "2027年春頃に新制度で再開予定（通年実施は継続、科目A免除制度は継続予定）",
    },
    exemptions: [
      "科目A免除: IPA認定講座を受講し修了試験に合格すると、免除有効期間の開始日から1年間 科目Aが免除。申込時に「修了認定者管理番号」を入力",
      "再受験は前回受験日の翌日から30日を超えた日以降。申込・日程変更は受験日の3日前まで、キャンセル・返金は不可",
    ],
    schedule: [
      { label: "2026年度", phase: "現行CBT 最終受験日", from: "2026-12-27", note: "12月28日以降は休止。新制度は2027年春頃" },
    ],
    links: {
      official: "https://www.ipa.go.jp/shiken/kubun/fe.html",
      apply: "https://cbt-s.com/examinee/examination/fe.html",
      pastQuestions: "https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/index.html",
      syllabus: "https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kpe-att/syllabus_fe_ver9_2.pdf",
    },
    hasQuestionBank: true,
    tags: ["IPA", "レベル2", "CBT"],
  },
  {
    id: "ap",
    name: "応用情報技術者試験",
    short: "応用情報",
    org: "IPA",
    category: "情報処理技術者",
    level: 3,
    fee: "7,500円",
    format: "2026年度からCBT。科目A 150分・四肢択一80問、科目B 150分・記述式（問1セキュリティ必須＋問2〜11から4問）",
    passCriteria: "科目A・科目Bとも 100点満点中 60点以上。科目Aが基準未満なら科目Bは採点されない",
    system: {
      current: "現行形式は 2026年度 後期が最後の見込み",
      next: "2027年夏〜秋頃から高度試験と統合した「プロフェッショナルデジタルスキル試験（仮称）」へ移行予定",
    },
    exemptions: ["合格すると 情報処理安全確保支援士 の科目A-1 が2年間免除"],
    schedule: [
      { label: "2026年度 前期", phase: "申込", from: "2026-10-06", to: "2026-11-07", note: "17時まで" },
      { label: "2026年度 前期", phase: "科目A", from: "2026-10-28", to: "2026-11-10" },
      { label: "2026年度 前期", phase: "科目B", from: "2026-11-24", to: "2026-12-06" },
      { label: "2026年度 後期", phase: "申込", from: "2027-01-27", to: "2027-02-16" },
      { label: "2026年度 後期", phase: "科目A", from: "2027-02-06", to: "2027-02-19" },
      { label: "2026年度 後期", phase: "科目B", from: "2027-03-03", to: "2027-03-15" },
    ],
    links: {
      official: "https://www.ipa.go.jp/shiken/kubun/ap.html",
      apply: "https://www.ipa.go.jp/shiken/2026/ap_koudo_sc_kikan.html",
      pastQuestions: "https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html",
      syllabus: "https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kq5-att/syllabus_ap_ver7_2.pdf",
    },
    recommendedAfter: ["fe"],
    hasQuestionBank: true,
    tags: ["IPA", "レベル3", "CBT"],
  },
  {
    id: "sc",
    name: "情報処理安全確保支援士試験",
    short: "支援士",
    org: "IPA",
    category: "情報処理技術者",
    level: 4,
    fee: "7,500円（非課税）",
    format: "2026年度からCBT。科目A-1 50分30問、科目A-2 40分25問（四肢択一）、科目B 150分・記述式4問中2問",
    passCriteria: "各科目 100点満点中 60点以上。科目A-1/A-2 が基準未満なら科目Bは採点されない",
    system: {
      current: "現行形式は 2026年度 後期が最後の見込み",
      next: "2027年夏〜秋頃から新制度（科目A-1 45分30問、A-2 35分25問、科目B 120分12問）へ移行予定",
    },
    exemptions: [
      "科目A-1 免除: 応用情報合格・高度/支援士合格・科目A-1基準点以上 のいずれかから2年間。申込時に一部免除申請番号を入力",
      "科目A-2 免除: 認定講習修了者は修了認定日から2年以内",
    ],
    schedule: [
      { label: "2026年度 後期", phase: "申込", from: "2027-01-27", to: "2027-02-27" },
      { label: "2026年度 後期", phase: "科目A-1/A-2", from: "2027-02-20", to: "2027-03-02" },
      { label: "2026年度 後期", phase: "科目B", from: "2027-03-16", to: "2027-03-28" },
    ],
    links: {
      official: "https://www.ipa.go.jp/shiken/kubun/sc.html",
      apply: "https://www.ipa.go.jp/shiken/2026/ap_koudo_sc_kikan.html",
      pastQuestions: "https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html",
      syllabus: "https://www.ipa.go.jp/shiken/about/koudo_menjo.html",
    },
    recommendedAfter: ["ap"],
    hasQuestionBank: false,
    tags: ["IPA", "レベル4", "セキュリティ", "CBT"],
  },
  {
    id: "sg",
    name: "情報セキュリティマネジメント試験",
    short: "セキュマネ",
    org: "IPA",
    category: "情報処理技術者",
    level: 2,
    fee: "7,500円",
    format: "CBT（通年）。120分で科目A 48問＋科目B 12問",
    passCriteria: "総合評価点 1,000点満点中 600点以上",
    system: {
      current: "現行CBTは 2026年12月28日以降いったん休止",
      next: "2027年春頃に新制度で再開予定",
    },
    schedule: [
      { label: "2026年度", phase: "現行CBT 最終受験日", from: "2026-12-27" },
    ],
    links: {
      official: "https://www.ipa.go.jp/shiken/kubun/sg.html",
      apply: "https://cbt-s.com/examinee/examination/sg.html",
      pastQuestions: "https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/index.html",
    },
    hasQuestionBank: false,
    tags: ["IPA", "レベル2", "セキュリティ", "CBT"],
  },
  {
    id: "comptia-secplus",
    name: "CompTIA Security+",
    short: "Security+",
    org: "CompTIA",
    category: "ベンダー資格",
    fee: "要確認（USD建て、日本語受験可）",
    format: "CBT（Pearson VUE）。最大90問・90分、多肢選択とパフォーマンスベース問題",
    passCriteria: "900点満点中 750点以上",
    schedule: [],
    links: {
      official: "https://www.comptia.jp/certif/security/comptia_security/",
    },
    recommendedAfter: ["sg"],
    hasQuestionBank: false,
    tags: ["ベンダー", "セキュリティ", "英語版あり"],
  },
  {
    id: "mono-placeholder",
    name: "ものづくり系（候補を登録予定）",
    short: "ものづくり",
    org: "未定",
    category: "ものづくり",
    format: "例: 技能検定（機械加工など）、第二種電気工事士、CAD利用技術者試験、3Dプリンター活用技術検定",
    schedule: [],
    links: { official: "https://www.javada.or.jp/" },
    hasQuestionBank: false,
    placeholder: true,
    tags: ["候補"],
  },
];

export function findCert(id: string): Certification | undefined {
  return CERTIFICATIONS.find((c) => c.id === id);
}

export const CERT_STATUS_LABEL: Record<string, string> = {
  planned: "予定",
  studying: "勉強中",
  applied: "申込済み",
  passed: "合格",
  failed: "不合格",
  paused: "保留",
};
