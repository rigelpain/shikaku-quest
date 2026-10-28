import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { IsoCubes } from "@/components/iso/iso-cubes";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <main className="page flex min-h-dvh flex-col items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <IsoCubes className="mx-auto mb-4 w-36" />
          <p className="font-display text-3xl">資格クエスト</p>
          <p className="mt-1 text-sm text-muted-foreground">勉強と記録を、一段ずつ積み上げる</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
