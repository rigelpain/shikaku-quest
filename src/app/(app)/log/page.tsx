import type { Metadata } from "next";
import { LogView } from "./log-view";

export const metadata: Metadata = { title: "記録" };

export default function LogPage() {
  return <LogView />;
}
