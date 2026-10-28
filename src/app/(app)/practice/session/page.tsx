import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeSession } from "./practice-session";

export const metadata: Metadata = { title: "演習中" };

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={null}>
      <PracticeSession />
    </Suspense>
  );
}
