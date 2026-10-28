/** 図の画像に関するヘルパ。アプリ（演習画面）とデータパイプライン（scripts/ipa/figures.ts）の両方から使う。 */

/**
 * 図が載っている問題 PDF のページ番号。
 * overrides で目視確認した `figureNote` の「PDF N ページ」を優先し、無ければ問の開始ページ `pdfPage`。
 * 科目B のように問が複数ページにまたがる場合、図は `pdfPage` の次のページにあることがある。
 */
export function figurePageOf(q: { figureNote?: string; pdfPage?: number }): number | undefined {
  const m = q.figureNote?.match(/PDF\s*(\d+)\s*ページ/);
  if (m) return Number(m[1]);
  return q.pdfPage;
}
