import type { ReactNode } from "react";

/**
 * アイソメトリックの立方体を SVG で描く部品。
 * 単位ベクトル: 右 = (0.866, 0.5)、左 = (-0.866, 0.5)、上 = (0, -1)
 * 格子 (i, j, k) の立方体の「上面の頂点」は (ox + (i - j) * w, oy + (i + j) * h2 - k * s)
 */
export const ISO = { cos: 0.8660254, sin: 0.5 };

export type IsoTone = "primary" | "gold" | "mint" | "coral" | "ghost" | "ink";

export interface CubeSpec {
  i: number;
  j: number;
  k: number;
  tone: IsoTone;
}

export function cubePosition(c: { i: number; j: number; k: number }, s: number, ox = 0, oy = 0) {
  const w = s * ISO.cos;
  const h2 = s * ISO.sin;
  return { cx: ox + (c.i - c.j) * w, cy: oy + (c.i + c.j) * h2 - c.k * s, w, h2 };
}

/** 立方体1個（上面・左面・右面）。色は .iso-<tone> の CSS 変数から取る。 */
export function Cube({ cx, cy, s, tone, opacity = 1 }: { cx: number; cy: number; s: number; tone: IsoTone; opacity?: number }) {
  const w = s * ISO.cos;
  const h2 = s * ISO.sin;
  const top = `${cx},${cy} ${cx + w},${cy + h2} ${cx},${cy + s} ${cx - w},${cy + h2}`;
  const left = `${cx - w},${cy + h2} ${cx},${cy + s} ${cx},${cy + 2 * s} ${cx - w},${cy + h2 + s}`;
  const right = `${cx},${cy + s} ${cx + w},${cy + h2} ${cx + w},${cy + h2 + s} ${cx},${cy + 2 * s}`;
  return (
    <g className={`iso-${tone}`} opacity={opacity}>
      <polygon points={left} fill="var(--iso-left)" />
      <polygon points={right} fill="var(--iso-right)" />
      <polygon points={top} fill="var(--iso-top)" />
    </g>
  );
}

/** 奥から手前、下から上の順に並べ替えて描く */
export function sortCubes<T extends { i: number; j: number; k: number }>(cubes: T[]): T[] {
  return cubes.slice().sort((a, b) => a.i + a.j - (b.i + b.j) || a.k - b.k);
}

export function IsoSvg({
  cubes,
  size,
  className,
  title,
  children,
}: {
  cubes: CubeSpec[];
  size: number;
  className?: string;
  title?: string;
  children?: ReactNode;
}) {
  const s = size;
  const w = s * ISO.cos;
  const h2 = s * ISO.sin;
  const xs = cubes.map((c) => (c.i - c.j) * w);
  const ys = cubes.map((c) => (c.i + c.j) * h2 - c.k * s);
  const minX = Math.min(...xs) - w;
  const maxX = Math.max(...xs) + w;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + 2 * s;
  const pad = 2;
  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {sortCubes(cubes).map((c, idx) => {
        const { cx, cy } = cubePosition(c, s);
        return <Cube key={idx} cx={cx} cy={cy} s={s} tone={c.tone} />;
      })}
      {children}
    </svg>
  );
}
