import { IsoSvg, type CubeSpec, type IsoTone } from "./iso-cube";

/**
 * 進捗を積み木で表す。total 個のうち filled 個を色付きで、残りを薄く描く。
 * 1列に並べる（i 軸方向）。
 */
export function IsoProgress({
  filled,
  total = 10,
  tone = "primary",
  className,
  label,
}: {
  filled: number;
  total?: number;
  tone?: IsoTone;
  className?: string;
  label?: string;
}) {
  const n = Math.max(1, total);
  const f = Math.max(0, Math.min(n, Math.round(filled)));
  const cubes: CubeSpec[] = Array.from({ length: n }, (_, i) => ({ i, j: 0, k: 0, tone: i < f ? tone : "ghost" }));
  return <IsoSvg cubes={cubes} size={12} className={className} title={label} />;
}
