"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/auth/setup-notice";

type Status = "checking" | "signed-in" | "signed-out" | "no-env";

/** 静的サイト用の認証ゲート。ログインしていなければ /login へ、環境変数が無ければ設定案内を出す。 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>(() => (getSupabaseEnv() ? "checking" : "no-env"));
  const hasEnv = status !== "no-env";

  useEffect(() => {
    if (!hasEnv) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setStatus(data.session ? "signed-in" : "signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setStatus(session ? "signed-in" : "signed-out");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [hasEnv]);

  useEffect(() => {
    if (status === "signed-out") {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [status, pathname, router]);

  if (status === "no-env") return <SetupNotice />;
  if (status !== "signed-in") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground" aria-busy>
        読み込み中…
      </div>
    );
  }
  return <>{children}</>;
}
