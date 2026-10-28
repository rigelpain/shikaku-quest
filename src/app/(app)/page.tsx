import type { Metadata } from "next";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "ホーム" };

export default function HomePage() {
  return <DashboardView />;
}
