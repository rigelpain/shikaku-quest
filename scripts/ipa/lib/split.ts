/** 行列を「問 N」で分割し、選択肢ア〜コを分離する。 */
import { CHOICE_LABELS } from "../../../src/lib/questions/schema.ts";
import { joinWrapped, type PageLine } from "./text.ts";

export interface RawQuestion {
  number: number;
  page: number;
  /** 先頭行から「問N 」を除いた行列 */
  lines: PageLine[];
}

const Q_START_RE = /^問(\d{1,3})(?:\s+|(?=[^\d\s]))(.*)$/;

export interface SplitOptions {
  /** この正規表現に一致する行以降は無視する（問題 PDF 内の解答例など） */
  stopAt?: RegExp;
  /** 落とす行（カテゴリ見出しなど） */
  dropLines?: RegExp[];
  /** 期待する問数（超えた「問N」は本文扱い） */
  maxNumber?: number;
  /** OCR テキスト向けの緩い問番号判定 */
  ocrLenient?: boolean;
}

export function splitQuestions(lines: PageLine[], opts: SplitOptions = {}): RawQuestion[] {
  const out: RawQuestion[] = [];
  let cur: RawQuestion | undefined;
  let expected = 1;
  for (const pl of lines) {
    if (opts.stopAt && opts.stopAt.test(pl.text)) break;
    if (opts.dropLines?.some((re) => re.test(pl.text))) continue;
    const m = pl.text.match(Q_START_RE);
    if (m && (!opts.maxNumber || expected <= opts.maxNumber)) {
      const n = Number(m[1]);
      let body: string | undefined;
      if (n === expected) body = m[2];
      // OCR で「問2 0≦x≦1」が「問20=x=1」のように数字がくっついた場合: 期待番号を前置詞とみなす
      else if (n > expected && m[1].startsWith(String(expected)) && opts.ocrLenient) body = pl.text.replace(/^問\s*/, "").slice(String(expected).length);
      if (body !== undefined) {
        cur = { number: expected, page: pl.page, lines: [{ page: pl.page, text: body.trim() }] };
        out.push(cur);
        expected += 1;
        continue;
      }
    }
    if (cur) cur.lines.push(pl);
  }
  return out;
}

/** 行内の独立した選択肢ラベル（前後が空白/行頭/行末）の位置 */
interface LabelToken {
  lineIdx: number;
  start: number; // ラベル文字の位置
  end: number; // ラベル直後（空白を含まない）
  label: string;
  /** ラベルの直後が空白/行末（確実なラベル）。false は OCR でくっついた「アオブジェクト」のような候補 */
  strong: boolean;
}

const LABEL_SET = new Set<string>(CHOICE_LABELS);

function findLabelTokens(lines: string[], relaxed = false): LabelToken[] {
  const toks: LabelToken[] = [];
  lines.forEach((line, lineIdx) => {
    // relaxed: pdfjs が 2 行を結合して「…利用イ クラウド…」になった場合に備え、前が空白でなくてもラベル + 空白を拾う
    const re = relaxed ? /(?<![A-Za-z0-9ァ-ヺ])([ア-コ])(?=\s)/g : /(?:^|(?<=\s))([ア-コ])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (!LABEL_SET.has(m[1])) continue;
      const after = line[m.index + 1];
      toks.push({ lineIdx, start: m.index, end: m.index + 1, label: m[1], strong: relaxed || after === undefined || /\s/.test(after) });
    }
  });
  return toks;
}

function before(a: LabelToken, b: LabelToken): boolean {
  return a.lineIdx < b.lineIdx || (a.lineIdx === b.lineIdx && a.start < b.start);
}

export interface ChoiceSplit {
  stemLines: string[];
  choices: string[];
  /** 「a b」のような組合せ表の見出し（科目B） */
  comboHeader?: string[];
}

/** 組合せ表の見出し: "a b", "a b c", "a1 a2 a3", "a 1 a 2" */
const COMBO_HEADER_RE = /^(?:[a-f]\s?\d?)(?:\s+[a-f]\s?\d?)+$/;
/** 図中の空欄ラベルが行として残ったもの: "a", "ba", "a b", "a3a1", "a 1 a 2", "a b c d e f g" */
const JUNK_LABEL_RE = /^(?:[a-g]\d?\s?){1,8}$/;
function parseComboHeader(line: string): string[] {
  return (line.match(/[a-f]\s?\d?/g) ?? []).map((t) => t.replace(/\s/g, ""));
}

/**
 * 選択肢を分離する。
 * @param lines 問の本文行（問N を除いたもの）
 * @param minChoices 必要な最小選択肢数（科目A=4、科目B=2）
 * @param maxChoices 最大（科目A=4、科目B=10）
 * @param afterMarker 「解答群」行の後ろだけを選択肢領域とする（科目B）
 */
export function splitChoices(lines: string[], minChoices: number, maxChoices: number, afterMarker?: RegExp): ChoiceSplit | undefined {
  let regionStart = 0;
  let comboHeader: string[] | undefined;
  if (afterMarker) {
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (afterMarker.test(lines[i])) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return undefined;
    regionStart = idx + 1;
    if (lines[regionStart] && COMBO_HEADER_RE.test(lines[regionStart])) {
      comboHeader = parseComboHeader(lines[regionStart]);
      regionStart += 1;
    }
  }
  const region = lines.slice(regionStart).filter((l) => !(afterMarker && JUNK_LABEL_RE.test(l)));
  let chain = findChain(findLabelTokens(region), minChoices, maxChoices);
  if (!chain) chain = findChain(findLabelTokens(region, true), minChoices, maxChoices);
  if (!chain) return undefined;
  return assemble(lines, region, regionStart, chain, comboHeader, afterMarker);
}

/**
 * ア を起点に イ, ウ, エ … が順に現れる連鎖を探す。
 * 各ラベルは「直後に空白がある候補（strong）」を優先し、無ければ OCR でくっついた候補を使う。
 * 起点のアも strong を優先する。
 */
function findChain(toks: LabelToken[], minChoices: number, maxChoices: number): LabelToken[] | undefined {
  const starts = [...toks.filter((t) => t.label === "ア" && t.strong), ...toks.filter((t) => t.label === "ア" && !t.strong)];
  for (const start of starts) {
    const c: LabelToken[] = [start];
    let pos = start;
    for (let next = 1; next < maxChoices; next++) {
      const label = CHOICE_LABELS[next];
      const cands = toks.filter((t) => t.label === label && before(pos, t));
      const pick = cands.find((t) => t.strong) ?? cands[0];
      if (!pick) break;
      c.push(pick);
      pos = pick;
    }
    if (c.length >= minChoices) return c;
  }
  return undefined;
}

function assemble(lines: string[], region: string[], regionStart: number, chain: LabelToken[], comboHeader: string[] | undefined, afterMarker?: RegExp): ChoiceSplit {
  const first = chain[0];
  const stemLines = afterMarker ? lines.slice(0, regionStart - (comboHeader ? 1 : 0) - 1) : region.slice(0, first.lineIdx);
  const stemPrefix = region[first.lineIdx].slice(0, first.start).trim();
  if (!afterMarker && stemPrefix) stemLines.push(stemPrefix);
  const choices: string[] = [];
  for (let k = 0; k < chain.length; k++) {
    const a = chain[k];
    const b = chain[k + 1];
    let text = "";
    const endLine = b ? b.lineIdx : region.length - 1;
    for (let li = a.lineIdx; li <= endLine; li++) {
      let seg = region[li];
      // 最後の選択肢の後ろに図のラベル（"a b c d e f g" など）が来ることがあるので落とす
      if (!b && li > a.lineIdx && JUNK_LABEL_RE.test(seg)) continue;
      if (li === a.lineIdx) seg = seg.slice(a.end);
      if (b && li === b.lineIdx) seg = li === a.lineIdx ? region[li].slice(a.end, b.start) : seg.slice(0, b.start);
      seg = seg.trim();
      text = joinWrapped(text, seg);
    }
    choices.push(text.trim());
  }
  return { stemLines, choices, comboHeader };
}
