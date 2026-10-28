/**
 * hasFigure: true の問について、問題 PDF の該当ページを PNG にして public/data/figures/<questionId>.png に書き出す。
 * parse.ts はこの PNG があれば各問の `figureImage` を埋めるので、順番は figures.ts → parse.ts。
 *
 * - 対象は public/data/questions/index.json に載っているセットの hasFigure な問
 * - PDF は .cache/ipa/<cert>/ のもの（無ければ fetch.ts と同じ手順でダウンロード）
 * - ページは figureNote の「PDF N ページ」を優先し、無ければ pdfPage（src/lib/questions/figure.ts の figurePageOf）
 * - 描画は python/render-page.py（macOS Quartz）。横幅 1200px・16 階調グレースケール（4bit PNG）。1 枚 300KB を超えたら警告
 * - 既にある PNG は作り直さない（--force で作り直す）。対象外になった PNG は警告のみ（--prune で削除）
 *
 * 使い方:
 *   IPA_PYTHON=<venv>/bin/python3 pnpm --config.verify-deps-before-run=false tsx scripts/ipa/figures.ts [--force] [--prune] [questionId ...]
 *   （IPA_PYTHON を省くと python3。pyobjc-framework-Quartz が入った環境が必要。README 参照）
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { figurePageOf } from "../../src/lib/questions/figure.ts";
import type { Question, QuestionIndex, QuestionSet } from "../../src/lib/questions/schema.ts";
import { fetchSource } from "./fetch.ts";
import { findSource } from "./sources.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const QUESTIONS_ROOT = resolve(ROOT, "public/data/questions");
export const FIGURES_ROOT = resolve(ROOT, "public/data/figures");
const RENDER_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "python/render-page.py");
const PYTHON = process.env.IPA_PYTHON || "python3";

/** 出力の横幅（px）・階調数・ファイルサイズの目安 */
const WIDTH = 1200;
const LEVELS = 16;
const SIZE_LIMIT = 300 * 1024;

/** public/data/ からの相対パス（Question.figureImage の値） */
export function figureImagePath(questionId: string): string {
  return `figures/${questionId}.png`;
}

interface Target {
  setId: string;
  question: Question;
  pdf: string;
  page: number;
  out: string;
}

async function collectTargets(onlyIds: Set<string>): Promise<Target[]> {
  const index = JSON.parse(readFileSync(resolve(QUESTIONS_ROOT, "index.json"), "utf8")) as QuestionIndex;
  const targets: Target[] = [];
  for (const entry of index.sets) {
    const set = JSON.parse(readFileSync(resolve(QUESTIONS_ROOT, entry.file), "utf8")) as QuestionSet;
    const figured = set.questions.filter((q) => q.hasFigure && (onlyIds.size === 0 || onlyIds.has(q.id)));
    if (figured.length === 0) continue;
    const source = findSource(set.id);
    if (!source) {
      console.warn(`[${set.id}] sources.ts に無いセットのため図を作れません`);
      continue;
    }
    const files = await fetchSource(source);
    for (const q of figured) {
      const page = figurePageOf(q);
      if (!page) {
        console.warn(`  ! ${q.id}: ページ番号が分からない（pdfPage も figureNote も無い）`);
        continue;
      }
      targets.push({ setId: set.id, question: q, pdf: files.question, page, out: resolve(FIGURES_ROOT, `${q.id}.png`) });
    }
  }
  return targets;
}

function render(t: Target): void {
  mkdirSync(dirname(t.out), { recursive: true });
  execFileSync(PYTHON, ["-I", RENDER_SCRIPT, t.pdf, String(t.page), t.out, "--width", String(WIDTH), "--levels", String(LEVELS)], { stdio: ["ignore", "pipe", "inherit"] });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const prune = args.includes("--prune");
  const onlyIds = new Set(args.filter((a) => !a.startsWith("--")));

  const targets = await collectTargets(onlyIds);
  console.log(`図あり ${targets.length} 問 (python: ${PYTHON})`);
  let failed = 0;
  let maxSize = 0;
  for (const t of targets) {
    const rel = t.out.replace(ROOT + "/", "");
    if (!force && existsSync(t.out)) {
      const size = statSync(t.out).size;
      maxSize = Math.max(maxSize, size);
      console.log(`  skip     ${rel} (${Math.round(size / 1024)}KB, p.${t.page})`);
      continue;
    }
    try {
      render(t);
      const size = statSync(t.out).size;
      maxSize = Math.max(maxSize, size);
      const over = size > SIZE_LIMIT ? `  ! ${Math.round(SIZE_LIMIT / 1024)}KB 超` : "";
      console.log(`  render   ${rel} (${Math.round(size / 1024)}KB, p.${t.page} of ${t.pdf.split("/").pop()})${over}`);
    } catch (e) {
      failed += 1;
      console.error(`  ERROR    ${rel}: ${(e as Error).message}`);
    }
  }

  // 対象外になった PNG
  if (existsSync(FIGURES_ROOT) && onlyIds.size === 0) {
    const wanted = new Set(targets.map((t) => t.out));
    for (const f of readdirSync(FIGURES_ROOT)) {
      const p = resolve(FIGURES_ROOT, f);
      if (!f.endsWith(".png") || wanted.has(p)) continue;
      if (prune) {
        unlinkSync(p);
        console.log(`  prune    public/data/figures/${f}`);
      } else {
        console.warn(`  ! 対象外の PNG: public/data/figures/${f}（--prune で削除）`);
      }
    }
  }

  console.log(`最大 ${Math.round(maxSize / 1024)}KB / 失敗 ${failed}`);
  if (failed) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
