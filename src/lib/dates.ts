import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";

/** ローカル日付を YYYY-MM-DD に */
export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** 今日から dateKey までの日数（当日=0、過去は負） */
export function daysUntil(dateKey: string, now = new Date()): number {
  return differenceInCalendarDays(parseISO(dateKey), startOfDay(now));
}

export function formatJa(dateKey: string, withWeekday = true): string {
  const d = parseISO(dateKey);
  return format(d, withWeekday ? "yyyy年M月d日(E)" : "yyyy年M月d日", { locale: ja });
}

export function formatShortJa(dateKey: string): string {
  return format(parseISO(dateKey), "M/d(E)", { locale: ja });
}

export function formatDateTimeJa(iso: string): string {
  return format(new Date(iso), "M月d日(E) HH:mm", { locale: ja });
}

export function countdownLabel(days: number): string {
  if (days === 0) return "今日";
  if (days === 1) return "明日";
  if (days < 0) return `${-days}日前`;
  return `あと${days}日`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}時間${m}分` : `${h}時間`;
}
