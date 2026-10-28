import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <main className="page flex min-h-dvh flex-col items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl tracking-wide">資格クエスト</p>
          <p className="mt-1 text-sm text-muted-foreground">資格取得の冒険の書</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
