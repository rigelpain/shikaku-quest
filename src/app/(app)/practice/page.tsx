import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeHome } from "./practice-home";

export const metadata: Metadata = { title: "演習" };

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeHome />
    </Suspense>
  );
}
