/**
 * デバッグ用: PDF をページ毎のテキストに変換して標準出力または指定ディレクトリに書き出す。
 * 使い方: pnpm --config.verify-deps-before-run=false tsx scripts/ipa/dump-text.ts <pdf> [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { extractText } from "unpdf";

async function main() {
  const [pdf, outDir] = process.argv.slice(2);
  if (!pdf) throw new Error("usage: dump-text.ts <pdf> [outDir]");
  const buf = new Uint8Array(readFileSync(pdf));
  const { text, totalPages } = await extractText(buf, { mergePages: false });
  const pages = text as string[];
  const out = pages.map((p, i) => `\n===== PAGE ${i + 1} / ${totalPages} =====\n${p}`).join("\n");
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    const dest = join(outDir, basename(pdf).replace(/\.pdf$/i, ".txt"));
    writeFileSync(dest, out, "utf8");
    console.log(`${dest} (${totalPages} pages, ${out.length} chars)`);
  } else {
    process.stdout.write(out);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
