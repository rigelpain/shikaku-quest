"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser, useProfile, useUpdateProfile } from "@/lib/data/hooks";
import { exportAll, importAll, type ExportBundle } from "@/lib/data/queries";
import type { Profile } from "@/lib/data/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMounted } from "@/hooks/use-mounted";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: profile, isLoading } = useProfile();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const bundle = await exportAll();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shikaku-quest-backup-${bundle.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "書き出せませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file: File) {
    setBusy(true);
    try {
      const bundle = JSON.parse(await file.text()) as ExportBundle;
      if (bundle.version !== 1) throw new Error("対応していない形式です");
      if (!confirm("バックアップを取り込みます。同じ id の記録は上書きされます。よろしいですか？")) return;
      await importAll(bundle);
      await qc.invalidateQueries();
      toast.success("取り込みました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取り込めませんでした");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    qc.clear();
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="設定" />
      <div className="liquid-grid items-start">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <ProfileForm key={profile?.updated_at ?? "new"} profile={profile ?? null} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>見た目</CardTitle>
            <CardDescription>ダークは紺地になります。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="テーマ">
              {(
                [
                  ["light", "ライト"],
                  ["dark", "ダーク"],
                  ["system", "端末に合わせる"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  variant={mounted && theme === v ? "default" : "outline"}
                  onClick={() => setTheme(v)}
                  role="radio"
                  aria-checked={mounted && theme === v}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>バックアップ</CardTitle>
            <CardDescription>記録はすべて Supabase にあります。念のため JSON でも残せます。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={doExport} disabled={busy}>
              JSON で書き出す
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              JSON を取り込む
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>アカウント</CardTitle>
            <CardDescription>{user?.email ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={signOut}>
              ログアウト
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>このアプリについて</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>資格クエスト — 情報系・ものづくり系の資格を体系的に取るための自分用アプリ。</p>
            <p>
              問題データは IPA 公開の試験問題を出典明記のうえ使用しています。解説と要点テキストは AI が生成したもので、未検証の箇所があります。
            </p>
            <p>
              <a href="https://github.com/rigelpain/shikaku-quest" target="_blank" rel="noreferrer" className="underline underline-offset-4">
                ソースコード（GitHub）
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ProfileForm({ profile }: { profile: Profile | null }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [goal, setGoal] = useState(profile?.daily_goal_min ?? 60);

  async function save() {
    try {
      await update.mutateAsync({ display_name: name || null, daily_goal_min: Math.max(0, Math.round(goal)) });
      toast.success("保存しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存できませんでした");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">表示名</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goal">1日の目標（分）</Label>
        <Input id="goal" type="number" min={0} inputMode="numeric" value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
      </div>
      <Button onClick={save} disabled={update.isPending}>
        保存する
      </Button>
    </div>
  );
}
