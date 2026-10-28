/**
 * PDF テキストの抽出と正規化（unpdf / pdfjs のテキストレイヤを前提）。
 */
import { readFileSync } from "node:fs";
import { extractText } from "unpdf";

export interface PageLine {
  page: number;
  text: string;
}

export async function extractPages(pdfPath: string): Promise<string[]> {
  const buf = new Uint8Array(readFileSync(pdfPath));
  const { text } = await extractText(buf, { mergePages: false });
  return text as string[];
}

const CJK = "\\u3000-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef";
const CJK_RE = new RegExp(`[${CJK}]`);
const RUBY_RE = /^[ぁ-ゖー]{1,4}$/;
const KANJI_END_RE = /[一-鿿]$/;

function toHalfDigits(s: string): string {
  return s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30));
}

/** 1 行をクリーンにする（全角数字の問番号、ジャスティファイによる文字間スペースなど） */
export function normalizeLine(raw: string): string {
  let s = raw.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
  // 「問１」→「問1」（問番号だけ半角化する。本文中の全角数字は IPA の表記をそのまま残す）
  s = s.replace(/^問\s*([０-９]{1,2})/, (_m, d: string) => `問${toHalfDigits(d)}`);
  s = s.replace(/^設問\s*([０-９]{1,2})/, (_m, d: string) => `設問${toHalfDigits(d)}`);
  // ジャスティファイで 1 文字ずつ空いた行: 「引 数 m a t r i x で 二 次 元 配 列」
  // 判定は「1 文字 + 空白」が 5 連続する箇所がある行だけ（「ア サービス A イ サービス B」を誤検出しないため）
  const spacedRun = new RegExp(`(?:^|\\s)(?:[${CJK}] ){4,}[${CJK}](?:\\s|$)`);
  if (spacedRun.test(s)) {
    s = s.replace(new RegExp(`([${CJK}]) (?=[${CJK}])`, "g"), "$1");
    // 「m a t r i x」→「matrix」
    s = s.replace(/\b([A-Za-z](?: [A-Za-z]){2,})\b/g, (m) => m.replace(/ /g, ""));
    // 「dataList の 要素」のような残り: CJK と ASCII の境界の空白は IPA 標準どおり 1 つ残す
  }
  return s;
}

const DROP_LINE_RES: RegExp[] = [
  /^[－\-]\s*\d+\s*[－\-]$/, // ページ番号
  /^©\s*\d{4}\s*独立行政法人情報処理推進機構$/,
  /^〔\s*メ\s*モ\s*用\s*紙\s*〕$/,
  /^試験問題に記載されている会社名又は製品名は/,
  /^なお，試験問題では，TM 及び/,
];

/**
 * ページ配列 → 正規化済み行（ページ番号つき）。
 * ルビ（「脆」「ぜい」「弱性」の 3 行）を結合し、ヘッダ・フッタを落とす。
 */
export function cleanPages(pages: string[]): PageLine[] {
  const out: PageLine[] = [];
  pages.forEach((pageText, i) => {
    const lines = pageText
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter((l) => l.length > 0 && !DROP_LINE_RES.some((re) => re.test(l)));
    for (const l of lines) out.push({ page: i + 1, text: l });
  });
  // ルビ結合
  const merged: PageLine[] = [];
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    const nxt = out[i + 1];
    const nxt2 = out[i + 2];
    if (nxt && nxt2 && RUBY_RE.test(nxt.text) && KANJI_END_RE.test(cur.text) && nxt.page === cur.page) {
      merged.push({ page: cur.page, text: cur.text + nxt2.text });
      i += 2;
      continue;
    }
    merged.push(cur);
  }
  return merged;
}

/** 表示幅（CJK=2, それ以外=1） */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += CJK_RE.test(ch) ? 2 : 1;
  return w;
}

const ASCII_WORD_END = /[A-Za-z0-9)\]'"]$/;
const ASCII_WORD_START = /^[A-Za-z0-9(\['"]/;
const CJK_LETTER_END = /[\u3041-\u30ff\u3400-\u4dbf\u4e00-\u9fff]$/;
const CJK_LETTER_START = /^[\u3041-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

/**
 * 折返しで分かれた 2 行をつなぐ。
 * CJK 同士は空白なし、ASCII 語の境界（ASCII/ASCII, CJK/ASCII）は IPA の組版どおり空白 1 つ。
 */
export function joinWrapped(a: string, b: string): string {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  if (ASCII_WORD_END.test(a) && ASCII_WORD_START.test(b)) return `${a} ${b}`;
  if (CJK_LETTER_END.test(a) && ASCII_WORD_START.test(b)) return `${a} ${b}`;
  if (ASCII_WORD_END.test(a) && CJK_LETTER_START.test(b)) return `${a} ${b}`;
  return a + b;
}

/** 行幅がこの値以上なら「ページ幅いっぱいの行」= 折返しの途中とみなす */
export const FULL_LINE_WIDTH = 62;

/**
 * 行の列を段落に組む。幅いっぱいの行は次の行と結合し、短い行で段落を終える。
 */
const PARA_START_RE = /^(?:[・•■□●◎○◇◆※]|〔|〈|「[^」]*」[:：]|\(?[一二三四五六七八九十]\)|\(\d+\)|[①-⑳]|図\s|表\s|注記|注\s|設問|解答群$|[a-z]\s*[:：]|\d+[.．]\s)/;
/** 図表のキャプション行: それ自体で段落を終える */
const CAPTION_RE = /^(図|表)\s?\d*\s+\S/;

export function linesToParagraphs(lines: string[]): string[] {
  const paras: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (cur && PARA_START_RE.test(line)) {
      paras.push(cur);
      cur = "";
    }
    cur = joinWrapped(cur, line);
    // 読点で終わる行は幅に関係なく続く（空欄の箱で幅が縮んだ行など）
    if (/[，、]$/.test(line)) continue;
    // 短い行、「。」で終わる行、図表キャプションで段落を終える（表の行や箇条書きを巻き込まないため）
    if (displayWidth(line) < FULL_LINE_WIDTH || /[。]$/.test(line) || CAPTION_RE.test(line)) {
      paras.push(cur);
      cur = "";
    }
  }
  if (cur) paras.push(cur);
  return paras;
}

export function toHalfWidthDigits(s: string): string {
  return toHalfDigits(s);
}
