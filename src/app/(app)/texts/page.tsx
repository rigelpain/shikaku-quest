import type { Metadata } from "next";
import Link from "next/link";
import { CERTIFICATIONS } from "@/content/certifications";
import { MAJORS } from "@/content/categories";
import { listTexts } from "@/lib/texts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "テキスト" };

const SECTION_LABEL: Record<string, string> = { a: "科目A", b: "科目B", general: "勉強法" };

export default function TextsPage() {
  const texts = listTexts();
  const certOrder = CERTIFICATIONS.map((c) => c.id);
  const certIds = Array.from(new Set(texts.map((t) => t.cert))).sort(
    (a, b) => certOrder.indexOf(a) - certOrder.indexOf(b),
  );

  return (
    <>
      <PageHeader
        title="テキスト"
        description="分野ごとの要点まとめ。問題を解く前の確認と、解いた後の整理に。"
      />
      {texts.length === 0 && (
        <div className="iso-panel">
          <p>テキストはまだありません。</p>
          <p className="mt-2 text-sm opacity-90">src/content/texts に Markdown を置くと、ここに並びます。</p>
        </div>
      )}
      {certIds.map((certId) => {
        const cert = CERTIFICATIONS.find((c) => c.id === certId);
        const ofCert = texts.filter((t) => t.cert === certId);
        const sections = ["general", "b", "a"].filter((s) => ofCert.some((t) => t.section === s));
        return (
          <section key={certId} className="mb-10">
            <h2 className="mb-3 text-lg font-bold">{cert?.name ?? certId}</h2>
            {sections.map((section) => {
              const ofSection = ofCert.filter((t) => t.section === section);
              const groups =
                section === "a"
                  ? [...MAJORS, "共通"]
                      .map((m) => ({ label: m, items: ofSection.filter((t) => t.major === m) }))
                      .filter((g) => g.items.length)
                  : [{ label: SECTION_LABEL[section], items: ofSection }];
              return (
                <div key={section} className="mb-6">
                  {section === "a" && <h3 className="mb-2 text-sm font-bold text-muted-foreground">{SECTION_LABEL[section]}</h3>}
                  {groups.map((g) => (
                    <div key={g.label} className="mb-4">
                      <p className="mb-2 text-sm font-bold">{g.label}</p>
                      <ul className="liquid-grid">
                        {g.items.map((t) => (
                          <li key={t.slug}>
                            <Link
                              href={`/texts/${t.cert}/${t.slug}`}
                              className="block h-full rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <p className="font-bold leading-snug">{t.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.summary}</p>
                              <p className="mt-2 flex flex-wrap gap-1">
                                {t.middle && <Badge variant="secondary">{t.middle}</Badge>}
                                <Badge variant="outline" className="tnum">
                                  {t.chars.toLocaleString()}字
                                </Badge>
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
