/**
 * 人手補正（overrides）の型とローダ。
 * `scripts/ipa/overrides/<setId>.ts` が default export で SetOverride を返す。
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Middle } from "../../../src/lib/questions/schema.ts";

export interface QuestionOverride {
  /** 問題文を丸ごと置き換える */
  text?: string;
  /** 問題文の部分置換（順に適用。from は文字列または正規表現） */
  textReplace?: Array<[string | RegExp, string]>;
  /** 選択肢を丸ごと置き換える（ア〜の順、ラベルなし） */
  choices?: string[];
  /** 選択肢の部分置換（index → 新しい本文） */
  choiceFix?: Record<number, string>;
  middle?: Middle;
  tags?: string[];
  hasFigure?: boolean;
  figureNote?: string;
  explanation?: string;
  /** 正答ラベルの上書き（解答 PDF が読めない場合のみ。通常は使わない） */
  answerLabel?: string;
  /** この問を出力から除外する（図のみで成立しない等） */
  drop?: boolean;
}

export interface SetOverride {
  notes?: string;
  questions: Record<number, QuestionOverride>;
}

const OVERRIDES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../overrides");

/**
 * `<setId>.ts` に加えて `<setId>-2.ts`, `<setId>-3.ts` … があれば読み込んでマージする
 * （大きなセットを分担して書けるようにするため。同じ問番号が両方にある場合は後のファイルが優先）。
 */
export async function loadOverride(setId: string): Promise<SetOverride | undefined> {
  const files = [resolve(OVERRIDES_DIR, `${setId}.ts`)];
  for (let i = 2; i < 10; i++) files.push(resolve(OVERRIDES_DIR, `${setId}-${i}.ts`));
  const existing = files.filter((f) => existsSync(f));
  if (existing.length === 0) return undefined;
  const merged: SetOverride = { questions: {} };
  const notes: string[] = [];
  for (const file of existing) {
    const mod = (await import(pathToFileURL(file).href)) as { default: SetOverride };
    if (mod.default.notes) notes.push(mod.default.notes);
    Object.assign(merged.questions, mod.default.questions);
  }
  if (notes.length) merged.notes = notes.join("\n");
  return merged;
}
