/** GitHub Pages のプロジェクトサイト用。ビルド時に NEXT_PUBLIC_BASE_PATH=/shikaku-quest を渡す。 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
