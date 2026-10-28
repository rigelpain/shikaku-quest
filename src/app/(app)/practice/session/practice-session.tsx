"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CERTIFICATIONS } from "@/content/certifications";
import { useCardsForCert } from "@/lib/data/hooks";
import { addAttempt, upsertCard } from "@/lib/data/queries";
import type { QuestionCardRow } from "@/lib/data/types";
import { GRADE_LABEL, Rating, cardToRow, previewIntervals, rowToCard, schedule, type Grade } from "@/lib/fsrs";
import { withBasePath } from "@/lib/base-path";
import { figurePageOf } from "@/lib/questions/figure";
import { useQuestionIndex, useQuestionSets } from "@/lib/questions/load";
import { CHOICE_LABELS, type Question, type QuestionSet } from "@/lib/questions/types";
import { seededShuffle } from "@/lib/seeded-shuffle";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Mode = "new" | "due" | "all";

interface QueueItem {
  question: Question;
  set: QuestionSet;
}

interface Result {
  questionId: string;
  correct: boolean;
  timeMs: number;
}

const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

/** URL の条件から問題データとカード状態を読み、そろったら SessionRunner に渡す。 */
export function PracticeSession() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setId = params.get("set");
  const mode = (params.get("mode") ?? "new") as Mode;
  const middle = params.get("middle") ?? "";
  const n = Math.max(1, Number(params.get("n") ?? 20) || 20);
  const doShuffle = params.get("shuffle") === "1" || mode === "due";
  const seedParam = params.get("seed");

  // 並び順を再現できるよう、シードが無ければ付けてから始める（effect 内なので乱数を使ってよい）
  useEffect(() => {
    if (seedParam) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("seed", String(Math.floor(Math.random() * 2 ** 31)));
    router.replace(`${pathname}?${sp.toString()}`);
  }, [seedParam, params, pathname, router]);

  const { data: index } = useQuestionIndex();
  const certId = setId ? (index?.sets.find((s) => s.id === setId)?.cert ?? null) : params.get("cert");
  const files = useMemo(() => {
    if (!index) return [];
    if (setId) {
      const e = index.sets.find((s) => s.id === setId);
      return e ? [e.file] : [];
    }
    return index.sets.filter((s) => s.cert === certId).map((s) => s.file);
  }, [index, setId, certId]);
  const { sets, ready } = useQuestionSets(files);
  const { data: cardRows, isSuccess: cardsReady } = useCardsForCert(certId);

  const cardMap = useMemo(() => {
    const m = new Map<string, QuestionCardRow>();
    for (const r of cardRows ?? []) m.set(r.question_id, r);
    return m;
  }, [cardRows]);

  const candidates = useMemo(() => {
    if (!ready || !cardsReady) return null;
    let items: QueueItem[] = sets.flatMap((set) => set.questions.map((question) => ({ question, set })));
    if (middle) items = items.filter((i) => i.question.middle === middle);
    if (mode === "due") {
      items = items.filter((i) => {
        const c = cardMap.get(i.question.id);
        return !!c && c.due <= new Date().toISOString();
      });
    } else if (mode === "new") {
      items = items.filter((i) => !cardMap.has(i.question.id));
    }
    return items;
  }, [ready, cardsReady, sets, middle, mode, cardMap]);

  if (!index) return <Skeleton className="h-64 w-full" />;
  if (!files.length) {
    return (
      <div className="iso-panel">
        <p>対象の問題セットが見つかりませんでした。</p>
        <Link href="/practice">演習トップへ戻る</Link>
      </div>
    );
  }
  if (!candidates || !seedParam) return <Skeleton className="h-64 w-full" />;

  return (
    <SessionRunner
      key={`${params.toString()}`}
      candidates={candidates}
      initialCards={cardMap}
      n={n}
      seed={Number(seedParam)}
      doShuffle={doShuffle}
      mode={mode}
      certId={certId}
      queryString={params.toString()}
    />
  );
}

function SessionRunner({
  candidates,
  initialCards,
  n,
  seed,
  doShuffle,
  mode,
  certId,
  queryString,
}: {
  candidates: QueueItem[];
  initialCards: Map<string, QuestionCardRow>;
  n: number;
  seed: number;
  doShuffle: boolean;
  mode: Mode;
  certId: string | null;
  queryString: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [queue] = useState(() => (doShuffle ? seededShuffle(candidates, seed) : candidates).slice(0, n));
  const [cards, setCards] = useState(() => new Map(initialCards));
  const [pos, setPos] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const startedAt = useRef(0);

  // 問題が変わるたびに計測開始
  useEffect(() => {
    startedAt.current = Date.now();
  }, [pos]);

  const current = queue[pos] ?? null;
  const answered = chosen !== null;
  const correct = current && answered ? chosen === current.question.answer : false;
  const card = useMemo(() => (current ? rowToCard(cards.get(current.question.id)) : null), [current, cards]);
  const intervals = useMemo(() => (card ? previewIntervals(card) : null), [card]);

  const choose = useCallback(
    (idx: number) => {
      if (!current || answered) return;
      if (idx < 0 || idx >= current.question.choices.length) return;
      setChosen(idx);
    },
    [current, answered],
  );

  const rate = useCallback(
    async (grade: Grade) => {
      if (!current || !answered || !card) return;
      const timeMs = Date.now() - startedAt.current;
      const nextCard = schedule(card, grade);
      const ids = { question_id: current.question.id, set_id: current.set.id, cert_id: current.set.cert };
      const row = cardToRow(nextCard, ids);
      setCards((prev) => new Map(prev).set(current.question.id, { ...row, user_id: "", updated_at: new Date().toISOString() }));
      setResults((r) => [...r, { questionId: current.question.id, correct, timeMs }]);
      setChosen(null);
      setPos((p) => p + 1);
      try {
        await Promise.all([
          upsertCard(row),
          addAttempt({
            ...ids,
            middle: current.question.middle,
            chosen,
            correct,
            rating: grade,
            time_ms: timeMs,
          }),
        ]);
        qc.invalidateQueries({ queryKey: ["due_count"] });
        qc.invalidateQueries({ queryKey: ["cards_cert"] });
        qc.invalidateQueries({ queryKey: ["attempts"] });
      } catch (e) {
        toast.error(e instanceof Error ? `保存できませんでした: ${e.message}` : "保存できませんでした");
      }
    },
    [current, answered, card, correct, chosen, qc],
  );

  // キーボード操作
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      const num = Number(e.key);
      if (!answered) {
        if (num >= 1 && num <= 9) choose(num - 1);
        return;
      }
      if (num >= 1 && num <= 4) rate(GRADES[num - 1]);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        rate(correct ? Rating.Good : Rating.Again);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, answered, choose, rate, correct]);

  function restart() {
    const sp = new URLSearchParams(queryString);
    sp.set("seed", String(Math.floor(Math.random() * 2 ** 31)));
    router.push(`${pathname}?${sp.toString()}`);
  }

  const cert = CERTIFICATIONS.find((c) => c.id === certId);

  if (queue.length === 0) {
    return (
      <div className="iso-panel">
        <p className="font-display text-xl">今は解く問題がありません</p>
        <p className="mt-2 text-sm opacity-90">
          {mode === "due" ? "復習期限の来た問題はありません。新しい問題を解きましょう。" : "この条件に合う未着手の問題はありません。"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="light" render={<Link href="/practice" />}>
            演習トップへ
          </Button>
        </div>
      </div>
    );
  }

  if (!current) {
    const ok = results.filter((r) => r.correct).length;
    const total = results.length;
    const sec = Math.round(results.reduce((a, r) => a + r.timeMs, 0) / 1000);
    return (
      <div className="mx-auto max-w-2xl">
        <div className="iso-panel">
          <p className="text-sm opacity-90">おつかれさまでした</p>
          <p className="font-display text-[clamp(2rem,1.5rem+2.5vw,3.2rem)] leading-none tnum">
            {ok}
            <span className="text-xl"> / {total}問 正解</span>
          </p>
          <p className="mt-2 text-sm opacity-90 tnum">
            正答率 {total ? Math.round((ok / total) * 100) : 0}% ・ {Math.floor(sec / 60)}分{sec % 60}秒
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="light" onClick={restart}>
              同じ条件でもう一度
            </Button>
            <Button
              variant="light-outline"
              render={<Link href="/practice" />}
            >
              演習トップへ
            </Button>
            <Button variant="light-ghost" render={<Link href="/log" />}>
              学習時間を記録する
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const q = current.question;
  const progress = ((pos + (answered ? 1 : 0)) / queue.length) * 100;
  const figurePage = figurePageOf(q);
  const figureSrc = q.figureImage ? withBasePath(`/data/${q.figureImage}`) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <Link href="/practice" className="hover:underline">
          ← 演習トップ
        </Link>
        <span className="tnum">
          {pos + 1} / {queue.length}
          {cert ? ` ・ ${cert.short}` : ""}
        </span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <div className="iso-panel">
        <p className="mb-2 flex flex-wrap gap-1.5 text-xs opacity-90">
          <Badge variant="outline" className="border-window-foreground/50 text-window-foreground">
            {q.middle}
          </Badge>
          <Badge variant="outline" className="border-window-foreground/50 text-window-foreground tnum">
            問{q.number}
          </Badge>
          {q.hasFigure && (
            <Badge variant="outline" className="border-window-foreground/50 text-window-foreground">
              {figureSrc ? "図あり" : "図はPDF参照"}
              {figurePage ? `（PDF ${figurePage}ページ）` : ""}
            </Badge>
          )}
        </p>
        <Markdown className="text-window-foreground [&_code]:bg-window-foreground/15 [&_pre]:border-window-foreground/30 [&_pre]:bg-window-foreground/10 [&_td]:border-window-foreground/30 [&_th]:border-window-foreground/30 [&_th]:bg-window-foreground/10">
          {q.text}
        </Markdown>
      </div>

      {figureSrc && (
        <figure className="mt-3 rounded-lg border bg-card p-2">
          <a href={figureSrc} target="_blank" rel="noreferrer" className="block" title="図を原寸で開く">
            {/* 静的書き出し（images.unoptimized）なので next/image は使わず素の img で出す */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={figureSrc}
              alt={`問${q.number}の図（出典PDF ${figurePage ?? q.pdfPage ?? "?"}ページ）`}
              width={1200}
              height={1697}
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded bg-white"
            />
          </a>
          <figcaption className="mt-1.5 text-xs text-muted-foreground">
            出典PDFの{figurePage ? `${figurePage}ページ` : "該当ページ"}。タップ（クリック）で原寸表示
          </figcaption>
        </figure>
      )}

      <ol className="mt-4 grid gap-2" aria-label="選択肢">
        {q.choices.map((choice, i) => {
          const isAnswer = i === q.answer;
          const isChosen = i === chosen;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => choose(i)}
                aria-pressed={isChosen}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  !answered && "hover:border-primary hover:bg-accent/40",
                  answered && isAnswer && "border-success bg-success/10",
                  answered && isChosen && !isAnswer && "border-destructive bg-destructive/10",
                  answered && !isAnswer && !isChosen && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border font-display text-sm",
                    answered && isAnswer && "border-success bg-success text-success-foreground",
                    answered && isChosen && !isAnswer && "border-destructive bg-destructive text-white",
                  )}
                >
                  {CHOICE_LABELS[i]}
                </span>
                <span className="min-w-0 flex-1">
                  <Markdown className="[&_p]:my-0">{choice || "（図・表を参照）"}</Markdown>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {answered && (
        <section className="mt-5 rounded-lg border bg-card p-4" aria-live="polite">
          <p className={cn("font-display text-xl", correct ? "text-success" : "text-destructive")}>
            {correct ? "正解" : "不正解"}
            <span className="ml-2 text-sm text-muted-foreground">正答は {CHOICE_LABELS[q.answer]}</span>
          </p>
          {q.explanation ? (
            <div className="mt-3">
              <Markdown className="text-sm">{q.explanation}</Markdown>
              {q.explanationSource === "ai" && (
                <p className="mt-2 text-xs text-muted-foreground">この解説はAIが生成したもので、未検証です。疑わしいときは出典のPDFで確かめてください。</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">この問題にはまだ解説がありません。</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {q.citation}
            {" ・ "}
            <a href={current.set.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              問題PDF
            </a>
          </p>

          <p className="mt-5 text-sm font-bold">次はいつ出す？</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g, i) => {
              const recommended = correct ? g === Rating.Good : g === Rating.Again;
              return (
                <Button
                  key={g}
                  variant={recommended ? "default" : "outline"}
                  className="h-auto flex-col gap-0.5 py-2"
                  onClick={() => rate(g)}
                >
                  <span>
                    {GRADE_LABEL[g]}
                    <span className="ml-1 text-xs opacity-70">{i + 1}</span>
                  </span>
                  <span className="text-xs opacity-80 tnum">{intervals?.[g]}</span>
                </Button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
