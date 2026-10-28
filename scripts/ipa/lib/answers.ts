/** 解答 PDF（または問題 PDF 内の解答例）のテキストから正答を読む。 */
import { choiceIndex } from "../../../src/lib/questions/schema.ts";
import { toHalfWidthDigits } from "./text.ts";

export interface AnswerEntry {
  number: number;
  label: string;
  answer: number;
  /** AP 午前の分野 T/M/S */
  field?: "T" | "M" | "S";
}

const ROW_RE = /^問\s*([0-9０-９]{1,3})\s+([ア-コ])(?:\s+([ＴＭＳTMS]))?\s*$/;

export function parseAnswers(lines: string[]): Map<number, AnswerEntry> {
  const map = new Map<number, AnswerEntry>();
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(ROW_RE);
    if (!m) continue;
    const number = Number(toHalfWidthDigits(m[1]));
    const label = m[2];
    const fieldRaw = m[3] ? toHalfWidthDigits(m[3]).replace(/[ＴＭＳ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff21 + 0x41)) : undefined;
    const field = fieldRaw === "T" || fieldRaw === "M" || fieldRaw === "S" ? fieldRaw : undefined;
    if (!map.has(number)) map.set(number, { number, label, answer: choiceIndex(label), field });
  }
  return map;
}
