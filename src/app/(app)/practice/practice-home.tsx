"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CERTIFICATIONS } from "@/content/certifications";
import { CATEGORIES, MAJORS } from "@/content/categories";
import { useCardsForCert, useDueCount } from "@/lib/data/hooks";
import { useQuestionIndex } from "@/lib/questions/load";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PracticeHome() {
  const params = useSearchParams();
  const { data: index, isLoading } = useQuestionIndex();
  const certsWithSets = useMemo(() => {
    const ids = Array.from(new Set((index?.sets ?? []).map((s) => s.cert)));
    return CERTIFICATIONS.filter((c) => ids.includes(c.id as "fe"));
  }, [index]);
  const [certId, setCertId] = useState<string>(params.get("cert") ?? "");
  const activeCert = certId || certsWithSets[0]?.id || "";
  const { data: due } = useDueCount(activeCert || undefined);
  const { data: cards } = useCardsForCert(activeCert || null);
  const [middle, setMiddle] = useState<string>("");
  const [count, setCount] = useState<number>(20);

  const sets = (index?.sets ?? []).filter((s) => s.cert === activeCert);
  const learnedBySet = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards ?? []) m.set(c.set_id, (m.get(c.set_id) ?? 0) + 1);
    return m;
  }, [cards]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="演習" />
        <Skeleton className="h-40 w-full" />
      </>
    );
  }

  if (!index?.sets.length) {
    return (
      <>
        <PageHeader title="演習" />
        <div className="rpg-window">
          <p>問題データがまだありません。</p>
          <p className="mt-2 text-sm opacity-90">
            scripts/ipa のパイプラインで IPA の公開問題を JSON 化すると、ここに並びます。
          </p>
        </div>
      </>
    );
  }

  const sessionHref = (q: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") sp.set(k, String(v));
    return `/practice/session?${sp.toString()}`;
  };

  return (
    <>
      <PageHeader title="演習" description="過去問を解いて、間隔反復で弱点をつぶします。復習期限が来た問題から優先して出します。" />

      <div className="mb-5 flex flex-wrap gap-2">
        {certsWithSets.map((c) => (
          <Button
            key={c.id}
            variant={c.id === activeCert ? "default" : "outline"}
            onClick={() => {
              setCertId(c.id);
              setMiddle("");
            }}
          >
            {c.short}
          </Button>
        ))}
      </div>

      <div className="rpg-window mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm opacity-90">今日の復習</p>
            <p className="font-display text-[clamp(2.2rem,1.6rem+2.5vw,3.4rem)] leading-none tnum">
              {due ?? 0}
              <span className="ml-1 text-base">問</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              variant="secondary"
              disabled={!due}
              render={<Link href={sessionHref({ cert: activeCert, mode: "due", n: count })} />}
            >
              復習を始める
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-window-foreground/60 bg-transparent text-window-foreground hover:bg-window-foreground/10 hover:text-window-foreground"
              render={<Link href={sessionHref({ cert: activeCert, mode: "new", n: count, middle })} />}
            >
              新しい問題を解く
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>分野をしぼる</CardTitle>
            <CardDescription>苦手な分野だけを集中的に。選ばなければ全分野から出します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MAJORS.map((major) => (
              <div key={major}>
                <p className="mb-1.5 text-xs font-bold text-muted-foreground">{major}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter((c) => c.major === major).map((c) => (
                    <button
                      key={c.middle}
                      type="button"
                      onClick={() => setMiddle(middle === c.middle ? "" : c.middle)}
                      aria-pressed={middle === c.middle}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        middle === c.middle
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card hover:bg-accent/60",
                      )}
                    >
                      {c.middle}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>1回に解く数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="1回に解く数">
              {[10, 20, 40, 80].map((n) => (
                <Button key={n} variant={count === n ? "default" : "outline"} onClick={() => setCount(n)} role="radio" aria-checked={count === n}>
                  {n}問
                </Button>
              ))}
            </div>
            <Label className="mt-4 block text-xs text-muted-foreground">
              キーボードでも解けます: 選択肢は 1〜4、評価は 1〜4、次へは Enter
            </Label>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-bold">問題セット</h2>
      <ul className="liquid-grid">
        {sets.map((s) => {
          const learned = learnedBySet.get(s.id) ?? 0;
          return (
            <li key={s.id} className="flex flex-col rounded-lg border bg-card p-4">
              <p className="font-bold leading-snug">{s.title}</p>
              <p className="mt-1 flex flex-wrap gap-1 text-xs">
                <Badge variant="secondary">{s.kind}</Badge>
                <Badge variant="outline" className="tnum">
                  {s.count}問
                </Badge>
                <Badge variant="outline" className="tnum">
                  解説 {s.withExplanations}問
                </Badge>
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (learned / Math.max(1, s.count)) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground tnum">
                着手 {learned}/{s.count}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Button size="sm" render={<Link href={sessionHref({ set: s.id, mode: "new", n: count, middle })} />}>
                  続きから解く
                </Button>
                <Button size="sm" variant="ghost" render={<Link href={sessionHref({ set: s.id, mode: "all", n: s.count, shuffle: 1 })} />}>
                  通しで解く
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
