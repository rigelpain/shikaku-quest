/**
 * PDF → テキスト → 問分割 → 選択肢分離 → 正答結合 → 中分類付与 → overrides 適用 → JSON 出力。
 *
 * 使い方:
 *   pnpm --config.verify-deps-before-run=false tsx scripts/ipa/parse.ts            # 全セット
 *   pnpm --config.verify-deps-before-run=false tsx scripts/ipa/parse.ts fe-r8-koukai-a ...
 *
 * 出力: public/data/questions/<cert>/<setId>.json, public/data/questions/index.json
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LICENSE,
  QuestionSetSchema,
  choiceIndex,
  choiceLabel,
  majorOfMiddle,
  type Major,
  type Middle,
  type Question,
  type QuestionIndex,
  type QuestionSet,
} from "../../src/lib/questions/schema.ts";
import { parseAnswers, type AnswerEntry } from "./lib/answers.ts";
import { classify } from "./lib/classify.ts";
import { normalizeOcrPage } from "./lib/ocr.ts";
import { loadOverride, type QuestionOverride } from "./lib/overrides.ts";
import { indentPseudo } from "./lib/pseudo.ts";
import { splitChoices, splitQuestions, type RawQuestion } from "./lib/split.ts";
import { cleanPages, extractPages, linesToParagraphs, type PageLine } from "./lib/text.ts";
import { CACHE_ROOT, fetchSource } from "./fetch.ts";
import { SOURCES, type Source } from "./sources.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_ROOT = resolve(ROOT, "public/data/questions");
/** 図の画像（figures.ts が生成）: public/data/figures/<questionId>.png */
const FIGURES_ROOT = resolve(ROOT, "public/data/figures");
/** OCR 済みテキスト（AP 午前など画像 PDF 用）: .cache/ipa/ocr/<pdf basename>.pages.json */
const OCR_ROOT = resolve(CACHE_ROOT, "ocr");

interface ParseReport {
  setId: string;
  count: number;
  withExplanations: number;
  withFigure: number;
  withFigureImage: number;
  failed: number[];
  warnings: string[];
}

const FIGURE_HINT_RE = /流れ図|状態遷移図|回路|タイミングチャート|図に示す|図のよう|次の図|下図|図\s?\d|E-R 図|クラス図|シーケンス図|アローダイアグラム|ガントチャート|構成図|波形|ベン図|PERT 図|散布図|管理図|ヒストグラム|パレート図|特性要因図|2 分木|二分木|決定木|木構造|状態遷移図|図中/;

function qid(setId: string, n: number): string {
  return `${setId}-q${String(n).padStart(2, "0")}`;
}

/** ページテキストを得る。画像 PDF は OCR 済み JSON（string[]）を使う。 */
async function loadPages(pdfPath: string): Promise<{ pages: string[]; ocr: boolean }> {
  const ocrFile = resolve(OCR_ROOT, `${pdfPath.split("/").pop()!.replace(/\.pdf$/i, "")}.pages.json`);
  const pages = await extractPages(pdfPath);
  const chars = pages.join("").replace(/\s/g, "").length;
  if (chars < 200 * pages.length * 0.2 && existsSync(ocrFile)) {
    const ocrPages = JSON.parse(readFileSync(ocrFile, "utf8")) as string[];
    return { pages: ocrPages.map(normalizeOcrPage), ocr: true };
  }
  if (chars < 50) {
    throw new Error(`no text layer in ${pdfPath} and no OCR cache at ${ocrFile} (run scripts/ipa/python/ocr.py)`);
  }
  return { pages, ocr: false };
}

// ---------- 科目B: 空欄マーカーと擬似言語ブロック ----------

const BLANK = (label?: string) => (label ? `［ ${label} ］` : "［　］");

function blankLabels(stem: string): string[] {
  // 「と」= 2 個、「～」= 3 個以上（解答群の見出しで確定するが、ここでは最大 3）
  if (/中の\s+～\s+に入れる|記述中の\s+～\s+に/.test(stem)) return ["a", "b", "c"];
  if (/中の\s+と\s+に入れる/.test(stem)) return ["a", "b"];
  return [""];
}

/** 本文中に空欄（PDF では箱）が消えた箇所にマーカーを入れる */
function insertBlankMarkers(lines: string[], labels: string[]): string[] {
  let k = 0;
  const next = () => {
    const l = labels[Math.min(k, labels.length - 1)];
    k += 1;
    return BLANK(l || undefined);
  };
  const out: string[] = [];
  for (let line of lines) {
    if (/中の\s+～\s+に入れる|記述中の\s+～\s+に/.test(line)) {
      line = line.replace(/中の\s+～\s+に/, `中の ${BLANK(labels[0])} ～ ${BLANK(labels[labels.length - 1])} に`);
      out.push(line);
      continue;
    }
    if (/中の\s+と\s+に入れる/.test(line)) {
      line = line.replace(/中の\s+と\s+に/, `中の ${BLANK(labels[0])} と ${BLANK(labels[1])} に`);
      out.push(line);
      continue;
    }
    if (/(プログラム|記述|流れ図|図)中の\s+に入れる/.test(line)) {
      line = line.replace(/中の\s+に入れる/, `中の ${BLANK()} に入れる`);
      out.push(line);
      continue;
    }
    // 擬似言語・本文中の空欄（PDF では箱が描かれているだけでテキストにならない）
    if (/\sを\s+\)\s*$/.test(line)) line = line.replace(/\sを\s+\)/, ` を ${next()} )`);
    else if (/\sに\s+を追加する/.test(line)) line = line.replace(/\sに\s+を追加する/, ` に ${next()} を追加する`);
    else if (/から\s+まで/.test(line)) line = line.replace(/から\s+まで/, `から ${next()} まで`);
    else if (/^for\s*\(\s*\)\s*$/.test(line)) line = line.replace(/\(\s*\)/, `( ${next()} )`);
    else if (/\[\s\]/.test(line)) line = line.replace(/\[\s\]/, `[ ${next()} ]`);
    else if (/\sが\s+\)/.test(line)) line = line.replace(/\sが\s+\)/, ` が ${next()} )`);
    else if (/[＋－×÷]\s*$/.test(line)) line = `${line} ${next()}`;
    else if (/[＋－×÷]\s+\)/.test(line)) line = line.replace(/([＋－×÷])\s+\)/, `$1 ${next()} )`);
    else if (/^の値を/.test(line)) line = `${next()} ${line}`;
    else if (/[，,]\s+の順に/.test(line)) line = line.replace(/([，,])\s+の順に/, `$1 ${next()} の順に`);
    else if (/[，,]\s+である/.test(line)) line = line.replace(/([，,])\s+である/, `$1 ${next()} である`);
    else if (/“\s”/.test(line)) line = line.replace(/“\s”/, `“ ${next()} ”`);
    else if (/←\s*$/.test(line)) line = `${line} ${next()}`;
    else if (/^←\s/.test(line)) line = `${next()} ${line}`;
    else if (/^return\s*$/.test(line)) line = `return ${next()}`;
    else if (/^(if|elseif|while)\s*\(\s*\)\s*$/.test(line)) line = line.replace(/\(\s*\)/, `( ${next()} )`);
    else if (/^(if|elseif|while)\s*\(\s+(が|と|の)\s/.test(line)) line = line.replace(/\(\s+/, `( ${next()} `);
    else if (/\{\s\}/.test(line)) line = line.replace(/\{\s\}/g, () => `{ ${next()} }`);
    out.push(line);
  }
  return out;
}

const PROGRAM_START_RE = /^〔プログラム\s*\d*〕$/;
const PROGRAM_END_RE = /^(解答群|[a-f]\s*に関する解答群|設問|注記|図\s?\d|表\s?\d|〔)/;
const JUNK_RE = /^(?:[a-g]\d?\s?){1,8}$/;
/** 科目B の選択肢領域の始まり: "解答群" または "a に関する解答群" */
export const ANSWER_GROUP_RE = /^(?:[a-f]\s*に関する\s*)?解答群$/;

/** 科目B の本文（stem）を Markdown に組み立てる */
function buildSectionBText(stemLines: string[], labels: string[]): string {
  const lines = insertBlankMarkers(stemLines.filter((l) => !JUNK_RE.test(l)), labels);
  const parts: string[] = [];
  let prose: string[] = [];
  const flushProse = () => {
    if (prose.length) parts.push(linesToParagraphs(prose).join("\n\n"));
    prose = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (PROGRAM_START_RE.test(line)) {
      flushProse();
      parts.push(line);
      const code: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (PROGRAM_END_RE.test(l) || /。/.test(l)) break;
        code.push(l);
      }
      parts.push("```text\n" + indentPseudo(code).join("\n") + "\n```");
      i = j - 1;
      continue;
    }
    if (/^設問/.test(line)) {
      flushProse();
      prose.push(line);
      continue;
    }
    prose.push(line);
  }
  flushProse();
  return parts.join("\n\n");
}

/** 「a b」組合せ表の選択肢を "a: …／b: …" にする（トークン数が一致する場合のみ） */
function formatCombo(choice: string, header: string[]): string | undefined {
  const toks = choice.split(/\s+/);
  if (toks.length === header.length) return header.map((h, i) => `${h}: ${toks[i]}`).join("／");
  // 「A 社 A 社 A 社」のように各列が同じトークン数で、かつ列の区切りが明確な場合は均等に割る
  if (toks.length % header.length === 0) {
    const per = toks.length / header.length;
    const groups = header.map((_, i) => toks.slice(i * per, (i + 1) * per).join(" "));
    if (groups.every((g) => /^[A-Z]\s[社店]$/.test(g) || /^\d[\d.,]*$/.test(g))) return header.map((h, i) => `${h}: ${groups[i]}`).join("／");
  }
  // 「1, 2, 3 4, 5, 6」のようにカンマ区切りの列
  const groups = choice.split(/(?<![,，])\s+(?=[0-9])/);
  if (groups.length === header.length) return header.map((h, i) => `${h}: ${groups[i].trim()}`).join("／");
  return undefined;
}

// ---------- 1 問の組み立て ----------

interface BuildContext {
  source: Source;
  answers: Map<number, AnswerEntry>;
  override?: Record<number, QuestionOverride>;
  report: ParseReport;
  ocr: boolean;
}

function applyOverride(q: Question, ov: QuestionOverride | undefined): Question {
  if (!ov) return q;
  const out: Question = { ...q };
  if (ov.text !== undefined) out.text = ov.text;
  if (ov.textReplace) for (const [from, to] of ov.textReplace) out.text = out.text.replace(from, to);
  if (ov.choices) out.choices = ov.choices;
  if (ov.choiceFix) {
    out.choices = [...out.choices];
    for (const [i, v] of Object.entries(ov.choiceFix)) out.choices[Number(i)] = v;
  }
  if (ov.middle) {
    out.middle = ov.middle;
    out.major = majorOfMiddle(ov.middle);
  }
  if (ov.tags) out.tags = ov.tags;
  if (ov.hasFigure !== undefined) out.hasFigure = ov.hasFigure;
  if (ov.figureNote !== undefined) out.figureNote = ov.figureNote;
  if (ov.explanation) {
    out.explanation = ov.explanation;
    out.explanationSource = "ai";
    out.explanationVerified = false;
  }
  if (ov.answerLabel) out.answer = choiceIndex(ov.answerLabel);
  return out;
}

function buildQuestion(raw: RawQuestion, ctx: BuildContext): Question | undefined {
  const { source, answers, report } = ctx;
  const n = raw.number;
  const isB = source.section === "b";
  const lineTexts = raw.lines.map((l) => l.text);
  const split = isB ? splitChoices(lineTexts, 2, 10, ANSWER_GROUP_RE) : splitChoices(lineTexts, 4, 4);
  const ov = ctx.override?.[n];

  let text: string;
  let choices: string[];
  let hasFigure = false;
  let figureNote: string | undefined;

  if (!split) {
    report.warnings.push(`問${n}: 選択肢を検出できません（図のみの可能性）`);
    text = linesToParagraphs(lineTexts).join("\n\n");
    choices = [];
    hasFigure = true;
  } else if (isB) {
    const labels = blankLabels(split.stemLines.join(" "));
    text = buildSectionBText(split.stemLines, split.comboHeader ?? labels);
    choices = split.choices;
    if (split.comboHeader) {
      choices = choices.map((c) => {
        const f = formatCombo(c, split.comboHeader!);
        if (!f) report.warnings.push(`問${n}: 組合せ表の選択肢を自動分割できません → overrides で "a: …／b: …" に`);
        return f ?? c;
      });
    }
  } else {
    text = linesToParagraphs(split.stemLines.filter((l) => !JUNK_RE.test(l))).join("\n\n");
    choices = split.choices;
  }

  // 図の判定（ヒューリスティック）。OCR では空の選択肢は図ではなく読取り失敗として扱う（除外して overrides で補う）
  const emptyChoice = choices.some((c) => c.length === 0);
  if (ctx.ocr && split && emptyChoice && !ov?.choices) {
    report.failed.push(n);
    report.warnings.push(`問${n}: OCR で選択肢の一部が空 → 除外（overrides で choices を指定すれば復元）`);
    return undefined;
  }
  const garbledChoice = choices.some((c) => /\n/.test(c) || /^(?:\d\s){3,}\d$/.test(c));
  if (!isB && (emptyChoice || garbledChoice || FIGURE_HINT_RE.test(text))) hasFigure = true;
  if (isB && /図\s?\d|次の図|図に示す|図のよう/.test(text) && !/〔プログラム/.test(text)) hasFigure = false; // 科目B の図は大半が表・リストで本文に再現されている

  // 正答
  const ans = answers.get(n);
  if (!ans && !ov?.answerLabel) {
    report.warnings.push(`問${n}: 解答が見つかりません`);
  }

  // 中分類
  let middle: Middle;
  let major: Major;
  if (isB) {
    middle = /〔プログラム|擬似言語|関数|手続|配列|クラス/.test(text) ? "アルゴリズムとプログラミング" : "セキュリティ";
    major = "テクノロジ系";
  } else {
    const hint: Major | undefined = ans?.field === "T" ? "テクノロジ系" : ans?.field === "M" ? "マネジメント系" : ans?.field === "S" ? "ストラテジ系" : undefined;
    const c = classify(`${text}\n${choices.join("\n")}`, hint);
    middle = c.middle;
    major = c.major;
  }

  if (hasFigure) {
    figureNote = `PDF ${raw.page} ページの図を参照`;
    if (!/図はPDF参照/.test(text)) text = `${text}\n\n（図はPDF参照）`;
  }

  let q: Question = {
    id: qid(source.setId, n),
    number: n,
    text,
    choices,
    answer: ans?.answer ?? -1,
    major,
    middle,
    hasFigure,
    ...(figureNote ? { figureNote } : {}),
    citation: `出典：${source.citationBase} 問${n}`,
    pdfPage: raw.page,
  };
  q = applyOverride(q, ov);
  if (ov?.drop) {
    report.warnings.push(`問${n}: overrides により除外`);
    return undefined;
  }
  // 図ありで本文に注記がなければ付ける
  if (q.hasFigure && !/図はPDF参照/.test(q.text)) q.text = `${q.text}\n\n（図はPDF参照）`;
  if (q.hasFigure && !q.figureNote) q.figureNote = `PDF ${raw.page} ページの図を参照`;
  if (!q.hasFigure) {
    q.text = q.text.replace(/\n*（図はPDF参照）\s*$/, "");
    delete q.figureNote;
  }
  // 図の画像（scripts/ipa/figures.ts で生成済みなら参照を入れる）
  if (q.hasFigure && existsSync(resolve(FIGURES_ROOT, `${q.id}.png`))) q.figureImage = `figures/${q.id}.png`;
  else delete q.figureImage;
  // 検証
  const minChoices = isB ? 2 : 4;
  const maxChoices = isB ? 10 : 4;
  if (q.choices.length < minChoices || q.choices.length > maxChoices || q.choices.some((c) => !c)) {
    report.failed.push(n);
    report.warnings.push(`問${n}: 選択肢数/内容が不正 (${q.choices.length}) → 除外`);
    return undefined;
  }
  if (q.answer < 0 || q.answer >= q.choices.length) {
    report.failed.push(n);
    report.warnings.push(`問${n}: 正答 index が不正 (${q.answer}) → 除外`);
    return undefined;
  }
  return q;
}

// ---------- セット単位 ----------

async function loadAnswerLines(source: Source, questionPages: PageLine[], answerPdf?: string): Promise<string[]> {
  if (answerPdf) {
    const { pages } = await loadPages(answerPdf);
    return cleanPages(pages).map((l) => l.text);
  }
  // 問題 PDF 内の「解答例」以降
  const idx = questionPages.findIndex((l) => /解答例/.test(l.text));
  return idx >= 0 ? questionPages.slice(idx).map((l) => l.text) : [];
}

export async function parseSet(source: Source, generatedAt: string): Promise<{ set: QuestionSet; report: ParseReport }> {
  const report: ParseReport = { setId: source.setId, count: 0, withExplanations: 0, withFigure: 0, withFigureImage: 0, failed: [], warnings: [] };
  const files = await fetchSource(source);
  const { pages, ocr } = await loadPages(files.question);
  if (ocr) report.warnings.push("OCR テキストを使用");
  const lines = cleanPages(pages);

  const answerLines = await loadAnswerLines(source, lines, files.answer);
  const answers = parseAnswers(answerLines);
  if (answers.size === 0) report.warnings.push("解答が 1 件も読めません");

  const splitOpts =
    source.layout === "fe-b-2022"
      ? { stopAt: /解答例・出題趣旨/, dropLines: [/^[①②③]\s/, /^〔分野：/] }
      : source.layout === "ap-am"
        ? { maxNumber: 80, stopAt: /^[〔［\[]\s*メ\s*モ\s*用\s*紙\s*[〕］\]]/, ocrLenient: ocr }
        : {};
  const raws = splitQuestions(lines, splitOpts);
  if (raws.length === 0) report.warnings.push("問を 1 件も検出できません");

  const override = await loadOverride(source.setId);
  const ctx: BuildContext = { source, answers, override: override?.questions, report, ocr };
  const questions: Question[] = [];
  for (const raw of raws) {
    const q = buildQuestion(raw, ctx);
    if (q) questions.push(q);
  }
  // override にあるが本文が見つからなかった問
  for (const key of Object.keys(override?.questions ?? {})) {
    if (!raws.some((r) => r.number === Number(key))) report.warnings.push(`問${key}: overrides はあるが PDF から問を検出できません`);
  }

  report.count = questions.length;
  report.withExplanations = questions.filter((q) => q.explanation).length;
  report.withFigure = questions.filter((q) => q.hasFigure).length;
  report.withFigureImage = questions.filter((q) => q.figureImage).length;
  if (report.withFigureImage < report.withFigure) report.warnings.push(`図あり ${report.withFigure} 問のうち画像が無いものが ${report.withFigure - report.withFigureImage} 問（scripts/ipa/figures.ts を実行）`);

  const set: QuestionSet = {
    id: source.setId,
    cert: source.cert,
    section: source.section,
    title: source.title,
    era: source.era,
    season: source.season,
    kind: source.kind,
    sourceUrl: source.questionUrl,
    ...(source.answerUrl ? { answerUrl: source.answerUrl } : {}),
    license: LICENSE,
    generatedAt,
    questions,
  };
  return { set, report };
}

/** generatedAt 以外が既存ファイルと同じなら書き込まない（再実行で未変更セットに差分が出ないようにする） */
function writeJson(path: string, data: unknown): boolean {
  const next = JSON.stringify(data, null, 2) + "\n";
  const stripGeneratedAt = (json: string): string => json.replace(/^  "generatedAt": "[^"]*",\n/m, "");
  if (existsSync(path) && stripGeneratedAt(readFileSync(path, "utf8")) === stripGeneratedAt(next)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next, "utf8");
  return true;
}

function buildIndex(generatedAt: string): QuestionIndex {
  const sets: QuestionIndex["sets"] = [];
  for (const cert of readdirSync(OUT_ROOT, { withFileTypes: true })) {
    if (!cert.isDirectory()) continue;
    for (const f of readdirSync(resolve(OUT_ROOT, cert.name))) {
      if (!f.endsWith(".json")) continue;
      const set = JSON.parse(readFileSync(resolve(OUT_ROOT, cert.name, f), "utf8")) as QuestionSet;
      sets.push({
        id: set.id,
        cert: set.cert,
        section: set.section,
        title: set.title,
        era: set.era,
        season: set.season ?? null,
        kind: set.kind,
        count: set.questions.length,
        withExplanations: set.questions.filter((q) => q.explanation).length,
        file: `${cert.name}/${f}`,
      });
    }
  }
  const order = new Map(SOURCES.map((s, i) => [s.setId, i]));
  sets.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  return { generatedAt, sets };
}

async function main(): Promise<void> {
  const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith("--")));
  const list = only.size ? SOURCES.filter((s) => only.has(s.setId)) : SOURCES;
  const generatedAt = new Date().toISOString();
  const reports: ParseReport[] = [];
  let hadError = false;
  for (const source of list) {
    console.log(`\n[${source.setId}] ${source.title}`);
    try {
      const { set, report } = await parseSet(source, generatedAt);
      const parsed = QuestionSetSchema.safeParse(set);
      if (!parsed.success) {
        hadError = true;
        console.error(`  schema error:`, parsed.error.issues.slice(0, 10));
      }
      const written = writeJson(resolve(OUT_ROOT, source.cert, `${source.setId}.json`), set);
      reports.push(report);
      console.log(`  問数 ${report.count} / 解説 ${report.withExplanations} / 図 ${report.withFigure}（画像 ${report.withFigureImage}） / 失敗 [${report.failed.join(",")}]${written ? "" : "（変更なし）"}`);
      for (const w of report.warnings) console.log(`  ! ${w}`);
    } catch (e) {
      hadError = true;
      console.error(`  ERROR: ${(e as Error).message}`);
    }
  }
  const index = buildIndex(generatedAt);
  writeJson(resolve(OUT_ROOT, "index.json"), index);
  console.log(`\nindex.json: ${index.sets.length} sets`);
  console.log(["setId", "count", "expl", "fig", "img", "failed"].join("\t"));
  for (const r of reports) console.log([r.setId, r.count, r.withExplanations, r.withFigure, r.withFigureImage, r.failed.join(",") || "-"].join("\t"));
  if (hadError) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { choiceLabel };
