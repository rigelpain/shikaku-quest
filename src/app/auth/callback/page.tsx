import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCallback } from "./auth-callback";

export const metadata: Metadata = { title: "ログイン処理中" };

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      <Suspense fallback={<p>ログインしています…</p>}>
        <AuthCallback />
      </Suspense>
    </main>
  );
}
