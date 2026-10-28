/**
 * sources.ts の PDF を `.cache/ipa/<cert>/<file>.pdf` にダウンロードする。
 *
 * - 既に存在するファイルは再取得しない
 * - 連続取得は 1 秒空ける
 * - User-Agent を付ける
 * - curl を使う（-f で HTTP エラー時に失敗させ、一時ファイル経由で書き込む）
 *
 * 使い方: pnpm --config.verify-deps-before-run=false tsx scripts/ipa/fetch.ts [setId ...]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES, cachePathFor, type Source } from "./sources.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const CACHE_ROOT = resolve(ROOT, ".cache/ipa");
const USER_AGENT = "shikaku-quest-ipa-pipeline/0.1 (study app data build; contact via repository)";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function download(url: string, dest: string): void {
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  if (existsSync(tmp)) unlinkSync(tmp);
  execFileSync(
    "curl",
    ["-sS", "-L", "-f", "--retry", "2", "--retry-delay", "2", "-A", USER_AGENT, "-o", tmp, url],
    { stdio: "inherit" },
  );
  const size = statSync(tmp).size;
  if (size < 1000) {
    unlinkSync(tmp);
    throw new Error(`downloaded file too small (${size} bytes): ${url}`);
  }
  renameSync(tmp, dest);
}

export async function fetchSource(source: Source): Promise<{ question: string; answer?: string }> {
  const targets: Array<[string, string]> = [[source.questionUrl, cachePathFor(source, source.questionUrl, CACHE_ROOT)]];
  if (source.answerUrl) targets.push([source.answerUrl, cachePathFor(source, source.answerUrl, CACHE_ROOT)]);
  let downloadedAny = false;
  for (const [url, dest] of targets) {
    if (existsSync(dest)) {
      console.log(`  cached   ${dest.replace(ROOT + "/", "")}`);
      continue;
    }
    if (downloadedAny) await sleep(1000);
    console.log(`  download ${url}`);
    download(url, dest);
    downloadedAny = true;
    await sleep(1000);
  }
  return { question: targets[0][1], answer: targets[1]?.[1] };
}

async function main(): Promise<void> {
  const only = new Set(process.argv.slice(2));
  const list = only.size ? SOURCES.filter((s) => only.has(s.setId)) : SOURCES;
  if (only.size && list.length !== only.size) {
    const known = new Set(list.map((s) => s.setId));
    for (const id of only) if (!known.has(id)) console.warn(`unknown setId: ${id}`);
  }
  for (const s of list) {
    console.log(`[${s.setId}] ${s.title}`);
    await fetchSource(s);
  }
  console.log("done");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
