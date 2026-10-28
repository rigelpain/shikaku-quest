"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { CERTIFICATIONS } from "@/content/certifications";
import {
  useAttempts,
  useDeadlines,
  useDueCount,
  useProfile,
  useSessions,
  useSetDeadlineDone,
  useUpsertDeadline,
  useUserCerts,
} from "@/lib/data/hooks";
import { DEADLINE_KIND_LABEL, type DeadlineKind } from "@/lib/data/types";
import { countdownLabel, formatJa, formatMinutes, toDateKey, todayKey } from "@/lib/dates";
import { buildUpcomingEvents, urgencyClass } from "@/lib/events";
import { MinutesBarChart, type MinutesPoint } from "@/components/charts/minutes-bar-chart";
import { IsoCubes } from "@/components/iso/iso-cubes";
import { IsoProgress } from "@/components/iso/iso-progress";
import { CertStatusBadge } from "@/components/cert-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const { data: profile } = useProfile();
  const { data: userCerts, isLoading: certsLoading } = useUserCerts();
  const { data: deadlines } = useDeadlines(false);
  const { data: sessions } = useSessions(14);
  const { data: attempts } = useAttempts(7);
  const { data: due } = useDueCount();

  const events = useMemo(() => buildUpcomingEvents(userCerts ?? [], deadlines ?? []), [userCerts, deadlines]);
  const hero = events[0] ?? null;
  const today = todayKey();
  const goal = profile?.daily_goal_min ?? 60;

  const { todayMin, streak, chart } = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of sessions ?? []) {
      const k = toDateKey(new Date(s.started_at));
      byDay.set(k, (byDay.get(k) ?? 0) + s.duration_min);
    }
    const chart: MinutesPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const k = toDateKey(d);
      chart.push({ key: k, label: format(d, "M/d"), minutes: byDay.get(k) ?? 0 });
    }
    let streak = 0;
    for (let i = 0; i < 14; i++) {
      const k = toDateKey(subDays(new Date(), i));
      if ((byDay.get(k) ?? 0) > 0) streak++;
      else if (i > 0) break; // 今日はまだでも昨日まで続いていれば数える
    }
    return { todayMin: byDay.get(today) ?? 0, streak, chart };
  }, [sessions, today]);

  const accuracy = useMemo(() => {
    const total = attempts?.length ?? 0;
    const ok = attempts?.filter((a) => a.correct).length ?? 0;
    return { total, ok, pct: total ? Math.round((ok / total) * 100) : null };
  }, [attempts]);

  const tracked = (userCerts ?? []).filter((c) => c.status !== "paused");

  return (
    <>
      {/* 次のイベントまでのカウントダウン */}
      <section className="iso-panel mb-5" aria-label="次の予定">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {certsLoading ? (
              <Skeleton className="h-24 w-full bg-white/20" />
            ) : hero ? (
              <>
                <p className="text-sm opacity-90">
                  {hero.certShort ? `${hero.certShort} ・ ` : ""}
                  {hero.title}
                </p>
                <p className="font-display text-[clamp(2.4rem,1.6rem+3.5vw,4.2rem)] leading-none tnum">
                  {countdownLabel(hero.daysLeft)}
                </p>
                <p className="mt-1 text-sm opacity-90 tnum">{formatJa(hero.date)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="lg" variant="light" render={<Link href="/practice" />}>
                    {due ? `復習 ${due}問` : "演習を始める"}
                  </Button>
                  <Button size="lg" variant="light-outline" render={<Link href="/log" />}>
                    学習を記録する
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-display text-2xl">最初の資格を決めよう</p>
                <p className="mt-2 text-sm opacity-90">
                  「資格」から追いかける資格を勉強中にすると、試験日までのカウントダウンがここに出ます。
                </p>
                <div className="mt-4">
                  <Button variant="light" render={<Link href="/certs" />}>
                    資格を選ぶ
                  </Button>
                </div>
              </>
            )}
          </div>
          <IsoCubes className="hidden w-36 shrink-0 sm:block md:w-44 lg:w-52" />
        </div>
      </section>

      {/* 今日の数字 */}
      <section className="liquid-grid mb-5" aria-label="今日の状況">
        <StatTile label="今日の学習" value={formatMinutes(todayMin)} sub={`目標 ${formatMinutes(goal)}`} progress={Math.min(1, todayMin / Math.max(1, goal))} />
        <StatTile label="連続日数" value={`${streak}日`} sub={streak ? "いい調子" : "今日から始めよう"} />
        <StatTile label="復習待ち" value={`${due ?? 0}問`} sub="期限が来た問題" href="/practice?mode=due" />
        <StatTile label="7日間の正答率" value={accuracy.pct === null ? "—" : `${accuracy.pct}%`} sub={`${accuracy.total}問 解答`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>この2週間</CardTitle>
              <CardDescription>日ごとの学習時間。点線は1日の目標です。</CardDescription>
            </CardHeader>
            <CardContent>
              <MinutesBarChart data={chart} goal={goal} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>追いかけている資格</CardTitle>
            </CardHeader>
            <CardContent>
              {certsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : tracked.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  まだありません。
                  <Link href="/certs" className="ml-1 underline underline-offset-4">
                    資格一覧から追加
                  </Link>
                </p>
              ) : (
                <ul className="divide-y">
                  {tracked.map((uc) => {
                    const cert = CERTIFICATIONS.find((c) => c.id === uc.cert_id);
                    return (
                      <li key={uc.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <Link href={`/certs/${uc.cert_id}`} className="font-bold hover:underline">
                          {cert?.name ?? uc.cert_id}
                        </Link>
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          {uc.target_date && <span className="tnum">受験 {formatJa(uc.target_date, false)}</span>}
                          <CertStatusBadge status={uc.status} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <UpcomingList events={events} />
      </div>
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
  progress,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-none tnum">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      {progress !== undefined && (
        <IsoProgress
          filled={progress * 10}
          total={10}
          tone={progress >= 1 ? "mint" : "primary"}
          label={`達成 ${Math.round(progress * 100)}%`}
          className="mt-3 h-9 w-auto max-w-full"
        />
      )}
    </>
  );
  const cls = "tile block p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-accent/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function UpcomingList({ events }: { events: ReturnType<typeof buildUpcomingEvents> }) {
  const add = useUpsertDeadline();
  const done = useSetDeadlineDone();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", due_on: "", kind: "other" as DeadlineKind });

  async function submit() {
    if (!form.title || !form.due_on) {
      toast.error("タイトルと日付を入れてください");
      return;
    }
    try {
      await add.mutateAsync({ title: form.title, due_on: form.due_on, kind: form.kind });
      setForm({ title: "", due_on: "", kind: "other" });
      setOpen(false);
      toast.success("予定を追加しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "追加できませんでした");
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>これからの予定</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? "閉じる" : "予定を追加"}
          </Button>
        </div>
        <CardDescription>試験日・申込締切・修了試験・免除期限をまとめて。</CardDescription>
      </CardHeader>
      <CardContent>
        {open && (
          <div className="mb-4 space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="dl-title">タイトル</Label>
              <Input id="dl-title" placeholder="例: 科目A免除 修了試験" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dl-date">日付</Label>
                <Input id="dl-date" type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dl-kind">種類</Label>
                <select
                  id="dl-kind"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as DeadlineKind })}
                >
                  {(Object.keys(DEADLINE_KIND_LABEL) as DeadlineKind[]).map((k) => (
                    <option key={k} value={k}>
                      {DEADLINE_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button size="sm" onClick={submit} disabled={add.isPending}>
              追加する
            </Button>
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">予定はまだありません。</p>
        ) : (
          <ol className="divide-y">
            {events.slice(0, 8).map((ev) => (
              <li key={ev.key} className="flex items-start gap-3 py-2.5">
                <span className={cn("w-16 shrink-0 font-display text-sm tnum", urgencyClass(ev.daysLeft))}>{countdownLabel(ev.daysLeft)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-snug">
                    {ev.certShort ? `${ev.certShort} ` : ""}
                    {ev.title}
                  </span>
                  <span className="block text-xs text-muted-foreground tnum">{formatJa(ev.date)}</span>
                </span>
                {ev.deadlineId && (
                  <Button size="xs" variant="ghost" onClick={() => done.mutate({ id: ev.deadlineId as string, done: true })}>
                    済
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
