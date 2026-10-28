import type { Metadata } from "next";
import { SetupNotice } from "@/components/auth/setup-notice";

export const metadata: Metadata = { title: "初期設定" };

export default function SetupPage() {
  return <SetupNotice />;
}
