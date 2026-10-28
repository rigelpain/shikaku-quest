"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MinutesPoint {
  key: string; // yyyy-MM-dd
  label: string; // 表示用
  minutes: number;
}

/** 1系列の棒グラフ（学習時間）。細い棒、上端だけ角丸、薄い横グリッド、ホバーで値。 */
export function MinutesBarChart({ data, goal }: { data: MinutesPoint[]; goal?: number }) {
  return (
    <div className="h-48 w-full" role="img" aria-label="日ごとの学習時間">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(v) => [`${v}分`, "学習時間"]}
          />
          {goal ? <ReferenceLine y={goal} stroke="var(--gold)" strokeDasharray="4 4" ifOverflow="extendDomain" /> : null}
          <Bar dataKey="minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
