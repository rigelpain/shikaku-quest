"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * メールのリンクから戻ってきたときの処理。
 * - ?code=       : PKCE（同じブラウザで開いた場合）
 * - ?token_hash= : メールテンプレートで {{ .TokenHash }} を使った場合（別端末でも可）
 */
export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("ログインしています…");

  useEffect(() => {
    const next = safeNext(params.get("next"));
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      try {
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // detectSessionInUrl が処理済みの場合はセッションがあるはず
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("no session");
        }
        router.replace(next);
      } catch {
        setMessage("リンクが無効でした。ログイン画面に戻ります…");
        setTimeout(() => router.replace("/login?error=link"), 1500);
      }
    })();
  }, [params, router]);

  return <p>{message}</p>;
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
