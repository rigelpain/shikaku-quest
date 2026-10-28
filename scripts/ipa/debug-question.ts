/** デバッグ用: セットの指定問の生の行と分割結果を表示する。 usage: debug-question.ts <setId> <n> */
import { cleanPages, extractPages } from "./lib/text.ts";
import { splitChoices, splitQuestions } from "./lib/split.ts";
import { findSource, cachePathFor } from "./sources.ts";
import { CACHE_ROOT } from "./fetch.ts";

async function main() {
const [setId, nStr] = process.argv.slice(2);
const src = findSource(setId)!;
const pages = await extractPages(cachePathFor(src, src.questionUrl, CACHE_ROOT));
const lines = cleanPages(pages);
const raws = splitQuestions(lines, src.layout === "fe-b-2022" ? { stopAt: /解答例・出題趣旨/, dropLines: [/^[①②③]\s/, /^〔分野：/] } : {});
const raw = raws.find((r) => r.number === Number(nStr));
if (!raw) throw new Error("not found");
console.log(`--- raw lines (page ${raw.page})`);
raw.lines.forEach((l, i) => console.log(`${i}\t[${l.page}] ${JSON.stringify(l.text)}`));
const sp = src.section === "b" ? splitChoices(raw.lines.map((l) => l.text), 2, 10, /^解答群$/) : splitChoices(raw.lines.map((l) => l.text), 4, 4);
console.log("--- split", JSON.stringify(sp, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
