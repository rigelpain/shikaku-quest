"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const linkError = params.get("error") === "link";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // すでにログイン済みならホームへ
  useEffect(() => {
    let active = true;
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active && data.session) router.replace(next);
      });
    return () => {
      active = false;
    };
  }, [router, next]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setSentTo(email);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? translate(err.message) : "ログインできませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    if (!email) {
      toast.error("メールアドレスを入れてください");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      setSentTo(email);
    } catch (err) {
      toast.error(err instanceof Error ? translate(err.message) : "送信できませんでした");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>メールを送りました</CardTitle>
          <CardDescription>{sentTo} に届いたリンクを開くとログインできます。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setSentTo(null)}>
            戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "signin" ? "ログイン" : "アカウントを作る"}</CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "登録したメールアドレスとパスワードでログインします。"
            : "最初の1回だけ。あとは同じメールアドレスでログインします。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>リンクが無効でした</AlertTitle>
            <AlertDescription>期限切れか、別のブラウザで開いた可能性があります。もう一度お試しください。</AlertDescription>
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {mode === "signin" ? "ログイン" : "アカウントを作る"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Button type="button" variant="outline" onClick={sendMagicLink} disabled={busy}>
            パスワードなしでメールのリンクからログイン
          </Button>
          <button
            type="button"
            className="text-muted-foreground underline underline-offset-4"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "はじめての人はアカウントを作る" : "すでにアカウントがある人はログイン"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function translate(message: string): string {
  if (/invalid login credentials/i.test(message)) return "メールアドレスかパスワードが違います";
  if (/email not confirmed/i.test(message)) return "メールの確認が終わっていません。届いたリンクを開いてください";
  if (/rate limit/i.test(message)) return "少し時間をおいてからもう一度お試しください";
  if (/signups not allowed|signups are disabled/i.test(message))
    return "新規登録が無効になっています。Supabase の Authentication → Users から直接ユーザーを作るか、Sign up を一時的に有効にしてください";
  return message;
}
