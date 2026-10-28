"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { CERT_STATUS_LABEL, findCert, type Certification } from "@/content/certifications";
import { useDeleteUserCert, useUpsertDeadline, useUpsertUserCert, useUserCerts } from "@/lib/data/hooks";
import type { CertStatus, UserCert } from "@/lib/data/types";
import { countdownLabel, daysUntil, formatJa } from "@/lib/dates";
import { urgencyClass } from "@/lib/events";
import { PageHeader } from "@/components/page-header";
import { CertStatusBadge } from "@/components/cert-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUSES: CertStatus[] = ["planned", "studying", "applied", "passed", "failed", "paused"];

export function CertDetail({ id }: { id: string }) {
  const cert = findCert(id);
  const { data: userCerts, isLoading: certsLoading } = useUserCerts();
  const addDeadline = useUpsertDeadline();
  const mine = userCerts?.find((c) => c.cert_id === id) ?? null;

  if (!cert) {
    return (
      <div className="rpg-window">
        <p>その資格は見つかりませんでした。</p>
        <Link href="/certs">資格一覧へ戻る</Link>
      </div>
    );
  }

  async function addScheduleToDeadlines(label: string, phase: string, date: string) {
    try {
      await addDeadline.mutateAsync({
        cert_id: cert!.id,
        title: `${cert!.short} ${label} ${phase}`,
        kind: phase.includes("申込") ? "apply" : "exam",
        due_on: date,
      });
      toast.success("予定に追加しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "追加できませんでした");
    }
  }

  return (
    <>
      <PageHeader
        title={cert.name}
        description={`${cert.org}${cert.level ? ` / レベル${cert.level}` : ""}${cert.fee ? ` / 受験料 ${cert.fee}` : ""}`}
        actions={
          <>
            {cert.hasQuestionBank && (
              <Button render={<Link href={`/practice?cert=${cert.id}`} />}>演習を始める</Button>
            )}
            <Button variant="outline" render={<a href={cert.links.official} target="_blank" rel="noreferrer" />}>
              公式サイト <ExternalLink className="size-4" aria-hidden />
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>試験の形式</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{cert.format}</p>
              {cert.passCriteria && <p>合格基準: {cert.passCriteria}</p>}
              {cert.system && (
                <div className="rounded-md border border-dashed p-3">
                  <p className="font-bold">制度の状況</p>
                  <p>{cert.system.current}</p>
                  {cert.system.next && <p className="text-muted-foreground">{cert.system.next}</p>}
                </div>
              )}
              {cert.exemptions?.length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {cert.exemptions.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          {cert.schedule.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>日程</CardTitle>
                <CardDescription>IPA 公表の日程（2026年10月28日時点）。予定に追加するとホームに出ます。</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>区分</TableHead>
                      <TableHead>期間</TableHead>
                      <TableHead>残り</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cert.schedule.map((s) => {
                      const days = daysUntil(s.to ?? s.from);
                      return (
                        <TableRow key={`${s.label}-${s.phase}`}>
                          <TableCell className="whitespace-nowrap">
                            {s.label} {s.phase}
                          </TableCell>
                          <TableCell className="tnum whitespace-nowrap">
                            {formatJa(s.from, false)}
                            {s.to ? ` 〜 ${formatJa(s.to, false)}` : ""}
                            {s.note ? <span className="block text-xs text-muted-foreground">{s.note}</span> : null}
                          </TableCell>
                          <TableCell className={`tnum whitespace-nowrap font-bold ${days < 0 ? "text-muted-foreground" : urgencyClass(days)}`}>
                            {days < 0 ? "終了" : countdownLabel(days)}
                          </TableCell>
                          <TableCell>
                            {days >= 0 && (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={addDeadline.isPending}
                                onClick={() => addScheduleToDeadlines(s.label, s.phase, s.to ?? s.from)}
                              >
                                予定に追加
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>リンク</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {Object.entries({
                  "公式ページ": cert.links.official,
                  "申込": cert.links.apply,
                  "過去問・公開問題": cert.links.pastQuestions,
                  "シラバス": cert.links.syllabus,
                })
                  .filter(([, v]) => !!v)
                  .map(([k, v]) => (
                    <li key={k}>
                      <a href={v} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                        {k}
                      </a>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {certsLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <StatusForm key={mine?.updated_at ?? "new"} cert={cert} mine={mine} />
        )}
      </div>
    </>
  );
}

function StatusForm({ cert, mine }: { cert: Certification; mine: UserCert | null }) {
  const upsert = useUpsertUserCert();
  const remove = useDeleteUserCert();
  const [form, setForm] = useState({
    status: (mine?.status ?? "planned") as CertStatus,
    target_date: mine?.target_date ?? "",
    applied_on: mine?.applied_on ?? "",
    exemption_number: mine?.exemption_number ?? "",
    exemption_expires_on: mine?.exemption_expires_on ?? "",
    memo: mine?.memo ?? "",
  });

  async function save() {
    try {
      await upsert.mutateAsync({
        cert_id: cert.id,
        status: form.status,
        target_date: form.target_date || null,
        applied_on: form.applied_on || null,
        exemption_number: form.exemption_number || null,
        exemption_expires_on: form.exemption_expires_on || null,
        memo: form.memo || null,
      });
      toast.success("保存しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存できませんでした");
    }
  }

  async function untrack() {
    try {
      await remove.mutateAsync(cert.id);
      toast.success("一覧から外しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除できませんでした");
    }
  }

  return (
    <Card className="h-fit lg:sticky lg:top-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>自分の状況</CardTitle>
          {mine && <CertStatusBadge status={mine.status} />}
        </div>
        <CardDescription>受験予定や免除番号を書いておくと、ホームのカウントダウンに出ます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="status">状態</Label>
          <select
            id="status"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CertStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {CERT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="target_date">受験予定日</Label>
            <Input id="target_date" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="applied_on">申込日</Label>
            <Input id="applied_on" type="date" value={form.applied_on} onChange={(e) => setForm({ ...form, applied_on: e.target.value })} />
          </div>
        </div>
        {cert.exemptions?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exemption_number">免除の番号</Label>
              <Input
                id="exemption_number"
                placeholder="修了認定者管理番号など"
                value={form.exemption_number}
                onChange={(e) => setForm({ ...form, exemption_number: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exemption_expires_on">免除の有効期限</Label>
              <Input
                id="exemption_expires_on"
                type="date"
                value={form.exemption_expires_on}
                onChange={(e) => setForm({ ...form, exemption_expires_on: e.target.value })}
              />
            </div>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="memo">メモ</Label>
          <Textarea id="memo" rows={3} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={upsert.isPending || cert.placeholder}>
            保存する
          </Button>
          {mine && (
            <Button variant="ghost" onClick={untrack} disabled={remove.isPending}>
              一覧から外す
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
