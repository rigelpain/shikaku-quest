"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { toast } from "sonner";
import { CERTIFICATIONS } from "@/content/certifications";
import { CATEGORIES } from "@/content/categories";
import { useAddSession, useDeleteSession, useProfile, useSessions, useUserCerts } from "@/lib/data/hooks";
import { ACTIVITY_LABEL, type Activity } from "@/lib/data/types";
import { formatDateTimeJa, formatMinutes, toDateKey, todayKey } from "@/lib/dates";
import { MinutesBarChart, type MinutesPoint } from "@/components/charts/minutes-bar-chart";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const TIMER_KEY = "shikaku-quest:timer";

interface TimerState {
  startedAt: number;
  cert_id: string;
  activity: Activity;
}

// localStorage をストアとして購読する（effect で setState しない）
const listeners = new Set<() => void>();
function subscribeTimer(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readTimerRaw(): string | null {
  try {
    return localStorage.getItem(TIMER_KEY);
  } catch {
    return null;
  }
}
function writeTimer(t: TimerState | null) {
  if (t) localStorage.setItem(TIMER_KEY, JSON.stringify(t));
  else localStorage.removeItem(TIMER_KEY);
  listeners.forEach((l) => l());
}
function parseTimer(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

export function LogView() {
  const { data: sessions } = useSessions(30);
  const { data: userCerts } = useUserCerts();
  const { data: profile } = useProfile();
  const add = useAddSession();
  const remove = useDeleteSession();

  const trackedCerts = useMemo(() => {
    const ids = new Set((userCerts ?? []).map((c) => c.cert_id));
    const list = CERTIFICATIONS.filter((c) => ids.has(c.id) && !c.placeholder);
    return list.length ? list : CERTIFICATIONS.filter((c) => !c.placeholder);
  }, [userCerts]);

  // ---- タイマー ----
  const timerRaw = useSyncExternalStore(subscribeTimer, readTimerRaw, () => null);
  const timer = useMemo(() => parseTimer(timerRaw), [timerRaw]);
  const [now, setNow] = useState(0);
  const [timerCert, setTimerCert] = useState("");
  const [timerActivity, setTimerActivity] = useState<Activity>("practice");
  const [timerMemo, setTimerMemo] = useState("");

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer]);

  function startTimer() {
    const t: TimerState = { startedAt: Date.now(), cert_id: timerCert || trackedCerts[0]?.id || "", activity: timerActivity };
    writeTimer(t);
  }

  async function stopTimer(save: boolean) {
    if (!timer) return;
    const minutes = Math.max(1, Math.round((Date.now() - timer.startedAt) / 60_000));
    writeTimer(null);
    if (!save) return;
    try {
      await add.mutateAsync({
        cert_id: timer.cert_id || null,
        started_at: new Date(timer.startedAt).toISOString(),
        duration_min: minutes,
        activity: timer.activity,
        middle: null,
        memo: timerMemo || null,
      });
      setTimerMemo("");
      toast.success(`${formatMinutes(minutes)} を記録しました`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "記録できませんでした");
    }
  }

  // ---- 手入力 ----
  const [form, setForm] = useState({
    date: todayKey(),
    time: "20:00",
    minutes: 30,
    cert_id: "",
    activity: "text" as Activity,
    middle: "",
    memo: "",
  });

  async function submitManual() {
    if (!form.minutes || form.minutes <= 0) {
      toast.error("時間（分）を入れてください");
      return;
    }
    try {
      await add.mutateAsync({
        cert_id: form.cert_id || trackedCerts[0]?.id || null,
        started_at: new Date(`${form.date}T${form.time || "00:00"}:00`).toISOString(),
        duration_min: Math.round(form.minutes),
        activity: form.activity,
        middle: form.middle || null,
        memo: form.memo || null,
      });
      setForm({ ...form, memo: "" });
      toast.success("記録しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "記録できませんでした");
    }
  }

  // ---- 集計 ----
  const { chart, todayMin, weekMin, monthMin, byCert } = useMemo(() => {
    const byDay = new Map<string, number>();
    const byCert = new Map<string, number>();
    const today = todayKey();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const monthStart = startOfMonth(new Date());
    let todayMin = 0;
    let weekMin = 0;
    let monthMin = 0;
    for (const s of sessions ?? []) {
      const d = new Date(s.started_at);
      const k = toDateKey(d);
      byDay.set(k, (byDay.get(k) ?? 0) + s.duration_min);
      byCert.set(s.cert_id ?? "none", (byCert.get(s.cert_id ?? "none") ?? 0) + s.duration_min);
      if (k === today) todayMin += s.duration_min;
      if (d >= weekStart) weekMin += s.duration_min;
      if (d >= monthStart) monthMin += s.duration_min;
    }
    const chart: MinutesPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const k = toDateKey(d);
      chart.push({ key: k, label: format(d, "M/d"), minutes: byDay.get(k) ?? 0 });
    }
    return { chart, todayMin, weekMin, monthMin, byCert };
  }, [sessions]);

  const elapsed = timer && now ? Math.max(0, now - timer.startedAt) : 0;
  const mm = Math.floor(elapsed / 60_000);
  const ss = Math.floor((elapsed % 60_000) / 1000);
  const maxCert = Math.max(1, ...Array.from(byCert.values()));

  return (
    <>
      <PageHeader title="記録" description="学習時間を残します。タイマーでも、あとからの手入力でも。" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <section className="iso-panel" aria-label="タイマー">
            {timer ? (
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm opacity-90">
                    {CERTIFICATIONS.find((c) => c.id === timer.cert_id)?.short ?? "資格なし"} ・ {ACTIVITY_LABEL[timer.activity]}
                  </p>
                  <p className="font-display text-[clamp(2.6rem,1.8rem+3.5vw,4.4rem)] leading-none tnum" aria-live="off">
                    {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <Input
                    placeholder="メモ（任意）"
                    value={timerMemo}
                    onChange={(e) => setTimerMemo(e.target.value)}
                    className="border-window-foreground/50 bg-transparent text-window-foreground placeholder:text-window-foreground/60"
                  />
                  <div className="flex gap-2">
                    <Button variant="light" onClick={() => stopTimer(true)} disabled={add.isPending}>
                      終わって記録する
                    </Button>
                    <Button variant="light-ghost" onClick={() => stopTimer(false)}>
                      破棄
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-cert" className="text-window-foreground">
                    資格
                  </Label>
                  <select
                    id="t-cert"
                    className="h-9 rounded-md border border-window-foreground/50 bg-transparent px-3 text-sm text-window-foreground [&_option]:text-foreground"
                    value={timerCert}
                    onChange={(e) => setTimerCert(e.target.value)}
                  >
                    {trackedCerts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.short}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-activity" className="text-window-foreground">
                    内容
                  </Label>
                  <select
                    id="t-activity"
                    className="h-9 rounded-md border border-window-foreground/50 bg-transparent px-3 text-sm text-window-foreground [&_option]:text-foreground"
                    value={timerActivity}
                    onChange={(e) => setTimerActivity(e.target.value as Activity)}
                  >
                    {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
                      <option key={a} value={a}>
                        {ACTIVITY_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button size="lg" variant="light" onClick={startTimer}>
                  タイマーを始める
                </Button>
              </div>
            )}
          </section>

          <section className="liquid-grid" aria-label="集計">
            <Tile label="今日" value={formatMinutes(todayMin)} sub={`目標 ${formatMinutes(profile?.daily_goal_min ?? 60)}`} />
            <Tile label="今週（月曜から）" value={formatMinutes(weekMin)} />
            <Tile label="今月" value={formatMinutes(monthMin)} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>この30日</CardTitle>
            </CardHeader>
            <CardContent>
              <MinutesBarChart data={chart} goal={profile?.daily_goal_min ?? undefined} />
              {byCert.size > 0 && (
                <ul className="mt-4 space-y-2">
                  {Array.from(byCert.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([certId, min]) => (
                      <li key={certId} className="text-sm">
                        <div className="flex justify-between">
                          <span>{CERTIFICATIONS.find((c) => c.id === certId)?.short ?? "資格なし"}</span>
                          <span className="tnum text-muted-foreground">{formatMinutes(min)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full bg-chart-1" style={{ width: `${(min / maxCert) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近の記録</CardTitle>
            </CardHeader>
            <CardContent>
              {!sessions?.length ? (
                <p className="text-sm text-muted-foreground">まだ記録がありません。</p>
              ) : (
                <ul className="divide-y">
                  {sessions.slice(0, 40).map((s) => (
                    <li key={s.id} className="flex items-start gap-3 py-2.5 text-sm">
                      <span className="w-28 shrink-0 text-muted-foreground tnum">{formatDateTimeJa(s.started_at)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-bold tnum">{formatMinutes(s.duration_min)}</span>
                        <span className="ml-2">
                          {CERTIFICATIONS.find((c) => c.id === s.cert_id)?.short ?? ""} {ACTIVITY_LABEL[s.activity]}
                          {s.middle ? ` / ${s.middle}` : ""}
                        </span>
                        {s.memo && <span className="block text-muted-foreground">{s.memo}</span>}
                      </span>
                      <Button size="xs" variant="ghost" onClick={() => remove.mutate(s.id)} aria-label="この記録を削除">
                        削除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>あとから記録する</CardTitle>
            <CardDescription>タイマーを忘れたときはこちら。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-date">日付</Label>
                <Input id="m-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-time">開始時刻</Label>
                <Input id="m-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-min">時間（分）</Label>
              <div className="flex flex-wrap gap-2">
                <Input id="m-min" type="number" min={1} inputMode="numeric" className="w-28" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} />
                {[15, 30, 60, 90].map((m) => (
                  <Badge key={m} variant="outline" className="cursor-pointer tnum" onClick={() => setForm({ ...form, minutes: m })}>
                    {m}分
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-cert">資格</Label>
                <select id="m-cert" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.cert_id} onChange={(e) => setForm({ ...form, cert_id: e.target.value })}>
                  {trackedCerts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.short}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-activity">内容</Label>
                <select id="m-activity" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value as Activity })}>
                  {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
                    <option key={a} value={a}>
                      {ACTIVITY_LABEL[a]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-middle">分野（任意）</Label>
              <select id="m-middle" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.middle} onChange={(e) => setForm({ ...form, middle: e.target.value })}>
                <option value="">指定なし</option>
                {CATEGORIES.map((c) => (
                  <option key={c.middle} value={c.middle}>
                    {c.middle}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-memo">メモ</Label>
              <Textarea id="m-memo" rows={2} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
            <Button onClick={submitManual} disabled={add.isPending}>
              記録する
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-none tnum">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
