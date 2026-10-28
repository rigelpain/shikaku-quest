/**
 * 対象 PDF の一覧（IPA 公式サイトのみ）。
 *
 * - FE 公開問題: https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/index.html
 * - FE サンプル問題: https://www.ipa.go.jp/shiken/syllabus/henkou/2022/20220425.html
 * - AP 令和7年度: https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html
 * - AP 令和6年度: https://www.ipa.go.jp/shiken/mondai-kaiotu/2024r06.html
 *
 * IPA のファイル名規則: `2025r07h` = 令和7年度 春期 (h = 春), `2025r07a` = 令和7年度 秋期 (a = 秋)。
 */

export type Cert = "fe" | "ap" | "sc" | "sg";
export type Section = "a" | "b";
export type Season = "春期" | "秋期" | null;
export type Kind = "公開問題" | "サンプル問題" | "過去問題";

/** PDF のレイアウト種別。parse.ts が分割ロジックを切り替えるのに使う。 */
export type PdfLayout =
  | "fe-a" // FE 科目A 公開問題 / サンプル問題セット（4択・20問 or 60問）
  | "fe-b" // FE 科目B 公開問題 / サンプル問題セット（擬似言語、2〜10択）
  | "fe-b-2022" // FE 科目B サンプル問題（2022-04-25 公開。問題と解答例が同じ PDF）
  | "ap-am"; // AP 午前（4択・80問）

export interface Source {
  setId: string;
  cert: Cert;
  section: Section;
  era: string;
  season: Season;
  kind: Kind;
  title: string;
  /** 問題 PDF の URL */
  questionUrl: string;
  /** 解答 PDF の URL（問題 PDF に同梱の場合は undefined） */
  answerUrl?: string;
  layout: PdfLayout;
  /** 掲載ページ（出典確認用） */
  indexUrl: string;
  /** citation の末尾に付ける名称（例: "令和8年度 基本情報技術者試験 公開問題 科目A"） */
  citationBase: string;
  /** 解説（explanation）を付ける対象か */
  wantExplanations: boolean;
}

const IPA = "https://www.ipa.go.jp";

const FE_KOUKAI_INDEX = `${IPA}/shiken/mondai-kaiotu/sg_fe/koukai/index.html`;
const FE_SAMPLE_INDEX = `${IPA}/shiken/syllabus/henkou/2022/20220425.html`;
const AP_R07_INDEX = `${IPA}/shiken/mondai-kaiotu/2025r07.html`;
const AP_R06_INDEX = `${IPA}/shiken/mondai-kaiotu/2024r06.html`;

const feKoukaiDirs: Record<string, string> = {
  "2023r05": "t6hhco0000003zx0-att",
  "2024r06": "eid2eo0000007g1d-att",
  "2025r07": "tbl5kb0000005r9r-att",
  "2026r08": "rcu1hd0000012qj6-att",
};

function feKoukai(yearCode: string, reiwa: number, section: Section): Source {
  const dir = feKoukaiDirs[yearCode];
  const base = `${IPA}/shiken/mondai-kaiotu/sg_fe/koukai/${dir}/${yearCode}_fe_kamoku_${section}`;
  const sec = section === "a" ? "科目A" : "科目B";
  const era = `令和${reiwa}年度`;
  return {
    setId: `fe-r${reiwa}-koukai-${section}`,
    cert: "fe",
    section,
    era,
    season: null,
    kind: "公開問題",
    title: `${era} 基本情報技術者試験 公開問題 ${sec}`,
    questionUrl: `${base}_qs.pdf`,
    answerUrl: `${base}_ans.pdf`,
    layout: section === "a" ? "fe-a" : "fe-b",
    indexUrl: `${IPA}/shiken/mondai-kaiotu/sg_fe/koukai/${yearCode}.html`,
    citationBase: `${era} 基本情報技術者試験 公開問題 ${sec}`,
    wantExplanations: true,
  };
}

function apAm(yearCode: string, reiwa: number, season: "春期" | "秋期", dir: string, wantExplanations: boolean): Source {
  // IPA の規則: h = 春期, a = 秋期
  const code = `${yearCode}${season === "春期" ? "h" : "a"}`;
  const base = `${IPA}/shiken/mondai-kaiotu/${dir}/${code}_ap_am`;
  const era = `令和${reiwa}年度`;
  const seasonEn = season === "春期" ? "spring" : "autumn";
  return {
    setId: `ap-r${reiwa}-${seasonEn}-am`,
    cert: "ap",
    section: "a",
    era,
    season,
    kind: "過去問題",
    title: `${era} ${season} 応用情報技術者試験 午前`,
    questionUrl: `${base}_qs.pdf`,
    answerUrl: `${base}_ans.pdf`,
    layout: "ap-am",
    indexUrl: reiwa === 7 ? AP_R07_INDEX : AP_R06_INDEX,
    citationBase: `${era} ${season} 応用情報技術者試験 午前`,
    wantExplanations,
  };
}

export const SOURCES: Source[] = [
  // 優先度1: FE 科目A 公開問題
  feKoukai("2026r08", 8, "a"),
  feKoukai("2025r07", 7, "a"),
  feKoukai("2024r06", 6, "a"),
  feKoukai("2023r05", 5, "a"),
  // 優先度2: FE 科目B 公開問題 + サンプル問題
  feKoukai("2026r08", 8, "b"),
  feKoukai("2025r07", 7, "b"),
  feKoukai("2024r06", 6, "b"),
  feKoukai("2023r05", 5, "b"),
  {
    setId: "fe-sample-a",
    cert: "fe",
    section: "a",
    era: "2022年公開",
    season: null,
    kind: "サンプル問題",
    title: "基本情報技術者試験 科目A サンプル問題（60問）セット",
    questionUrl: `${IPA}/shiken/syllabus/henkou/2022/gmcbt80000007cfs-att/fe_kamoku_a_set_sample_qs.pdf`,
    answerUrl: `${IPA}/shiken/syllabus/henkou/2022/gmcbt80000007cfs-att/fe_kamoku_a_set_sample_ans.pdf`,
    layout: "fe-a",
    indexUrl: FE_SAMPLE_INDEX,
    citationBase: "基本情報技術者試験 科目A サンプル問題（60問）セット",
    wantExplanations: true,
  },
  {
    setId: "fe-sample-b",
    cert: "fe",
    section: "b",
    era: "2022年公開",
    season: null,
    kind: "サンプル問題",
    title: "基本情報技術者試験 科目B サンプル問題（20問）セット",
    questionUrl: `${IPA}/shiken/syllabus/henkou/2022/gmcbt80000007cfs-att/fe_kamoku_b_set_sample_qs.pdf`,
    answerUrl: `${IPA}/shiken/syllabus/henkou/2022/gmcbt80000007cfs-att/fe_kamoku_b_set_sample_ans.pdf`,
    layout: "fe-b",
    indexUrl: FE_SAMPLE_INDEX,
    citationBase: "基本情報技術者試験 科目B サンプル問題（20問）セット",
    wantExplanations: true,
  },
  {
    setId: "fe-sample-b-202204",
    cert: "fe",
    section: "b",
    era: "2022年公開",
    season: null,
    kind: "サンプル問題",
    title: "基本情報技術者試験 科目B サンプル問題（2022年4月25日公開）",
    questionUrl: `${IPA}/shiken/syllabus/ps6vr7000000oett-att/fe_kamoku_b_sample.pdf`,
    answerUrl: undefined,
    layout: "fe-b-2022",
    indexUrl: FE_SAMPLE_INDEX,
    citationBase: "基本情報技術者試験 科目B サンプル問題（2022年4月25日公開）",
    wantExplanations: true,
  },
  // 優先度3: AP 午前 令和7年度 春期（解説つき）
  apAm("2025r07", 7, "春期", "nl10bi0000009lh8-att", true),
  // 優先度4: AP 午前（解説なし）
  apAm("2025r07", 7, "秋期", "nl10bi0000009lh8-att", false),
  apAm("2024r06", 6, "春期", "m42obm000000afqx-att", false),
  apAm("2024r06", 6, "秋期", "m42obm000000afqx-att", false),
];

export const INDEX_PAGES = { FE_KOUKAI_INDEX, FE_SAMPLE_INDEX, AP_R07_INDEX, AP_R06_INDEX };

/** `.cache/ipa/<cert>/<basename>.pdf` のローカルパスを返す。 */
export function cachePathFor(source: Source, url: string, cacheRoot: string): string {
  const name = url.split("/").pop() ?? "unknown.pdf";
  return `${cacheRoot}/${source.cert}/${name}`;
}

export function findSource(setId: string): Source | undefined {
  return SOURCES.find((s) => s.setId === setId);
}
