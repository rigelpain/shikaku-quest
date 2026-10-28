/**
 * public/data/questions/**.json を zod で検証する。
 *  - 各セットが QuestionSetSchema を満たす（choices 数、answer 範囲、citation 形式、major/middle の対応）
 *  - 全セット横断で id がユニーク
 *  - index.json の entries と実ファイル（count, withExplanations, title など）が一致
 * 終了コード 0 = OK, 1 = NG。
 *
 * 使い方: pnpm --config.verify-deps-before-run=false tsx scripts/ipa/validate.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QuestionIndexSchema, QuestionSetSchema, type QuestionSet } from "../../src/lib/questions/schema.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = resolve(ROOT, "public/data/questions");

function main(): number {
  const errors: string[] = [];
  const info: string[] = [];
  const indexPath = resolve(DATA, "index.json");
  if (!existsSync(indexPath)) {
    console.error(`missing ${indexPath}`);
    return 1;
  }
  const indexParsed = QuestionIndexSchema.safeParse(JSON.parse(readFileSync(indexPath, "utf8")));
  if (!indexParsed.success) {
    errors.push(`index.json: ${indexParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    console.error(errors.join("\n"));
    return 1;
  }
  const index = indexParsed.data;

  // 実ファイル一覧
  const files: string[] = [];
  for (const d of readdirSync(DATA, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of readdirSync(resolve(DATA, d.name))) if (f.endsWith(".json")) files.push(`${d.name}/${f}`);
  }
  const indexed = new Set(index.sets.map((s) => s.file));
  for (const f of files) if (!indexed.has(f)) errors.push(`index.json に無いファイル: ${f}`);
  for (const f of indexed) if (!files.includes(f)) errors.push(`index.json にあるが存在しないファイル: ${f}`);

  const allIds = new Map<string, string>();
  let totalQ = 0;
  let totalExpl = 0;
  for (const entry of index.sets) {
    const path = resolve(DATA, entry.file);
    if (!existsSync(path)) continue;
    let set: QuestionSet;
    try {
      const parsed = QuestionSetSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
      if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 20)) errors.push(`${entry.file}: ${issue.path.join(".")}: ${issue.message}`);
        if (parsed.error.issues.length > 20) errors.push(`${entry.file}: ... and ${parsed.error.issues.length - 20} more`);
        continue;
      }
      set = parsed.data;
    } catch (e) {
      errors.push(`${entry.file}: ${(e as Error).message}`);
      continue;
    }
    if (set.id !== entry.id) errors.push(`${entry.file}: id が index と不一致 (${set.id} != ${entry.id})`);
    if (entry.file !== `${set.cert}/${set.id}.json`) errors.push(`${entry.file}: file 名が <cert>/<setId>.json ではない`);
    if (set.questions.length !== entry.count) errors.push(`${entry.file}: count が不一致 (${set.questions.length} != ${entry.count})`);
    const withExpl = set.questions.filter((q) => q.explanation).length;
    if (withExpl !== entry.withExplanations) errors.push(`${entry.file}: withExplanations が不一致 (${withExpl} != ${entry.withExplanations})`);
    for (const k of ["cert", "section", "title", "era", "kind"] as const) {
      if (set[k] !== entry[k]) errors.push(`${entry.file}: ${k} が index と不一致`);
    }
    if ((set.season ?? null) !== (entry.season ?? null)) errors.push(`${entry.file}: season が index と不一致`);
    const nums = new Set<number>();
    for (const q of set.questions) {
      if (allIds.has(q.id)) errors.push(`${entry.file}: id 重複 ${q.id} (${allIds.get(q.id)})`);
      allIds.set(q.id, entry.file);
      if (nums.has(q.number)) errors.push(`${entry.file}: number 重複 ${q.number}`);
      nums.add(q.number);
      if (q.id !== `${set.id}-q${String(q.number).padStart(2, "0")}`) errors.push(`${entry.file}: id と number が不一致 ${q.id}`);
      if (!q.citation.endsWith(` 問${q.number}`)) errors.push(`${entry.file}: citation の問番号が不一致 ${q.id}`);
      if (q.choices.some((c) => /^[ア-コ]\s/.test(c))) errors.push(`${entry.file}: 選択肢にラベルが残っている ${q.id}`);
      if (q.hasFigure && !/図はPDF参照/.test(q.text)) errors.push(`${entry.file}: hasFigure なのに本文に「（図はPDF参照）」がない ${q.id}`);
      if (q.explanation && q.explanation.length < 30) errors.push(`${entry.file}: explanation が短すぎる ${q.id}`);
    }
    totalQ += set.questions.length;
    totalExpl += withExpl;
    info.push(`${entry.file}: ${set.questions.length} 問 / 解説 ${withExpl} / 図 ${set.questions.filter((q) => q.hasFigure).length}`);
  }
  for (const l of info) console.log(l);
  console.log(`合計 ${index.sets.length} セット / ${totalQ} 問 / 解説 ${totalExpl}`);
  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    return 1;
  }
  console.log("validate: OK");
  return 0;
}

process.exit(main());
