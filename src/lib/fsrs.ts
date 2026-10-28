import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade, type State } from "ts-fsrs";
import type { QuestionCardRow } from "@/lib/data/types";

// 試験勉強向け: 最長でも半年に1回は見直す
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, maximum_interval: 180 }));

export { Rating };
export type { Card, Grade };

export const GRADE_LABEL: Record<Grade, string> = {
  [Rating.Again]: "もう一度",
  [Rating.Hard]: "難しい",
  [Rating.Good]: "普通",
  [Rating.Easy]: "簡単",
};

export function rowToCard(row?: QuestionCardRow | null, now = new Date()): Card {
  if (!row) return createEmptyCard(now);
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    learning_steps: row.learning_steps,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function cardToRow(
  card: Card,
  ids: { question_id: string; set_id: string; cert_id: string },
): Omit<QuestionCardRow, "user_id" | "updated_at"> {
  return {
    ...ids,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    learning_steps: card.learning_steps ?? 0,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function schedule(card: Card, grade: Grade, now = new Date()): Card {
  return scheduler.next(card, now, grade).card;
}

/** 各評価を選んだ場合の次回までの日数（表示用） */
export function previewIntervals(card: Card, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(card, now);
  const fmt = (due: Date) => {
    const ms = due.getTime() - now.getTime();
    const min = Math.round(ms / 60_000);
    if (min < 60) return `${Math.max(min, 1)}分後`;
    const hours = Math.round(min / 60);
    if (hours < 24) return `${hours}時間後`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}日後`;
    return `${Math.round(days / 30)}か月後`;
  };
  return {
    [Rating.Again]: fmt(preview[Rating.Again].card.due),
    [Rating.Hard]: fmt(preview[Rating.Hard].card.due),
    [Rating.Good]: fmt(preview[Rating.Good].card.due),
    [Rating.Easy]: fmt(preview[Rating.Easy].card.due),
  };
}
