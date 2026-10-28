import type { Metadata } from "next";
import { Suspense } from "react";
import { CERTIFICATIONS, findCert } from "@/content/certifications";
import { CertDetail } from "./cert-detail";

export function generateStaticParams() {
  return CERTIFICATIONS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/certs/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: findCert(id)?.name ?? "資格" };
}

export default async function CertDetailPage({ params }: PageProps<"/certs/[id]">) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <CertDetail id={id} />
    </Suspense>
  );
}
