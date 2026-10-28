import type { Metadata } from "next";
import { CertCatalog } from "./cert-catalog";

export const metadata: Metadata = { title: "資格" };

export default function CertsPage() {
  return <CertCatalog />;
}
