/**
 * OCR（macOS Vision）で得たページテキストの正規化。
 * テキストレイヤのある PDF と違い、ラベル直後の空白が落ちる（「ア訓練した」「イ4」）、
 * ページ番号が「= 5=」「-4一」のように崩れる、読点が「、」になる、などの癖を吸収する。
 */

const OCR_PAGE_NO_RE = /^[\s=\-－ー一―_]*\d{1,3}[\s=\-－ー一―_]*$/;
/** 冊子の小口に縦書きされた「AP 午前 春期」が行として、または行頭に混入する */
const OCR_MARGIN_WORDS = "AP|午前|干前|F前|iP|春期|秋期|午前\\s*問題";
const OCR_JUNK_RE = new RegExp(`^(?:${OCR_MARGIN_WORDS})$`);
const OCR_MARGIN_PREFIX_RE = new RegExp(`^(?:${OCR_MARGIN_WORDS})\\s+(?=\\S)`);

export function normalizeOcrPage(page: string): string {
  const out: string[] = [];
  for (const raw of page.split(/\r?\n/)) {
    let s = raw.trim();
    if (!s) continue;
    if (OCR_PAGE_NO_RE.test(s) || OCR_JUNK_RE.test(s)) continue;
    // 読点・句点を IPA の表記（，。）に寄せる
    s = s.replace(/、/g, "，").replace(/,(?=[^\d\s])/g, "，");
    s = s.replace(OCR_MARGIN_PREFIX_RE, "");
    // 「間27」「聞27」→「問27」、「問1論理式」→「問1 論理式」
    s = s.replace(/^[間聞]\s*(?=\d{1,3})/, "問");
    s = s.replace(/^問\s*(\d{1,3})(?=[^\d\s])/, "問$1 ");
    // 行頭のラベル直後に空白がない: 「ア訓練した」「イ4」「エより多くの」（後続がカタカナのときは語の一部とみなし触らない）
    s = s.replace(/^([ア-コ])(?=[^\sァ-ヺー・])/, "$1 ");
    // 行中のラベル: 「ア 3 イ4 ウ5 エ 6」
    s = s.replace(/(\s)([ア-コ])(?=[^\sァ-ヺー・])/g, "$1$2 ");
    out.push(s);
  }
  return out.join("\n");
}
