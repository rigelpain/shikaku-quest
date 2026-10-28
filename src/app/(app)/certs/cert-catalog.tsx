"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CERTIFICATIONS, CERT_STATUS_LABEL, type CertCategory } from "@/content/certifications";
import { useUpsertUserCert, useUserCerts } from "@/lib/data/hooks";
import type { CertStatus } from "@/lib/data/types";
import { daysUntil, formatShortJa } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { CertStatusBadge } from "@/components/cert-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_ORDER: CertCategory[] = ["情報処理技術者", "ベンダー資格", "ものづくり"];

export function CertCatalog() {
  const { data: userCerts, isLoading } = useUserCerts();
  const upsert = useUpsertUserCert();

  const statusOf = (certId: string): CertStatus | null =>
    userCerts?.find((c) => c.cert_id === certId)?.status ?? null;

  async function track(certId: string) {
    try {
      await upsert.mutateAsync({ cert_id: certId, status: "studying" });
      toast.success("勉強中に追加しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存できませんでした");
    }
  }

  return (
    <>
      <PageHeader
        title="資格"
        description="体系的に取っていく資格の一覧。追いかける資格を「勉強中」にすると、日程がホームに出ます。"
      />
      {CATEGORY_ORDER.map((category) => {
        const certs = CERTIFICATIONS.filter((c) => c.category === category);
        if (!certs.length) return null;
        return (
          <section key={category} className="mb-8">
            <h2 className="mb-3 text-lg font-bold">{category}</h2>
            <div className="liquid-grid">
              {certs.map((cert) => {
                const status = statusOf(cert.id);
                const next = cert.schedule
                  .map((s) => ({ ...s, days: daysUntil(s.to ?? s.from) }))
                  .filter((s) => s.days >= 0)
                  .sort((a, b) => a.days - b.days)[0];
                return (
                  <Card key={cert.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          <Link href={`/certs/${cert.id}`} className="hover:underline">
                            {cert.name}
                          </Link>
                        </CardTitle>
                        {isLoading ? (
                          <Skeleton className="h-5 w-12" />
                        ) : status ? (
                          <CertStatusBadge status={status} />
                        ) : null}
                      </div>
                      <CardDescription>
                        {cert.org}
                        {cert.level ? ` / レベル${cert.level}` : ""}
                        {cert.fee ? ` / ${cert.fee}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <p className="text-sm text-muted-foreground">{cert.format}</p>
                      {next && (
                        <p className="text-sm">
                          次の日程: {next.label} {next.phase}{" "}
                          <span className="tnum">
                            {formatShortJa(next.from)}
                            {next.to ? `〜${formatShortJa(next.to)}` : ""}
                          </span>
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        {cert.placeholder ? (
                          <Badge variant="outline">候補を決めたら追加</Badge>
                        ) : status ? (
                          <Button variant="outline" size="sm" render={<Link href={`/certs/${cert.id}`} />}>
                            {CERT_STATUS_LABEL[status]}の詳細を見る
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => track(cert.id)} disabled={upsert.isPending || isLoading}>
                            勉強中にする
                          </Button>
                        )}
                        {cert.hasQuestionBank && (
                          <Button variant="ghost" size="sm" render={<Link href={`/practice?cert=${cert.id}`} />}>
                            演習へ
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
