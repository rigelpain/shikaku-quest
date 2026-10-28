import { IsoSvg, type CubeSpec } from "./iso-cube";

const TOWER: CubeSpec[] = [
  { i: 0, j: 0, k: 0, tone: "primary" },
  { i: 1, j: 0, k: 0, tone: "primary" },
  { i: 2, j: 0, k: 0, tone: "mint" },
  { i: 0, j: 1, k: 0, tone: "primary" },
  { i: 1, j: 1, k: 0, tone: "gold" },
  { i: 2, j: 1, k: 0, tone: "primary" },
  { i: 0, j: 2, k: 0, tone: "mint" },
  { i: 1, j: 2, k: 0, tone: "primary" },
  { i: 2, j: 2, k: 0, tone: "primary" },
  { i: 0, j: 0, k: 1, tone: "gold" },
  { i: 1, j: 1, k: 1, tone: "primary" },
  { i: 2, j: 2, k: 1, tone: "primary" },
  { i: 2, j: 2, k: 2, tone: "gold" },
];

const SMALL: CubeSpec[] = [
  { i: 0, j: 0, k: 0, tone: "primary" },
  { i: 1, j: 0, k: 0, tone: "mint" },
  { i: 0, j: 1, k: 0, tone: "gold" },
  { i: 0, j: 0, k: 1, tone: "primary" },
];

/** 装飾用の立体ブロック群（ヒーローや空の状態に） */
export function IsoCubes({ variant = "tower", className }: { variant?: "tower" | "small"; className?: string }) {
  return <IsoSvg cubes={variant === "tower" ? TOWER : SMALL} size={24} className={className} />;
}

/** ロゴ: 3つのブロック */
export function IsoLogo({ className }: { className?: string }) {
  return (
    <IsoSvg
      cubes={[
        { i: 0, j: 0, k: 0, tone: "primary" },
        { i: 1, j: 0, k: 0, tone: "gold" },
        { i: 0, j: 0, k: 1, tone: "mint" },
      ]}
      size={16}
      className={className}
    />
  );
}
