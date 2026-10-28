import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CERTIFICATIONS } from "@/content/certifications";
import { getText, listTexts } from "@/lib/texts";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return listTexts().map((t) => ({ cert: t.cert, slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/texts/[cert]/[slug]">): Promise<Metadata> {
  const { cert, slug } = await params;
  const doc = getText(cert, slug);
  return { title: doc?.title ?? "テキスト" };
}

export default async function TextPage({ params }: PageProps<"/texts/[cert]/[slug]">) {
  const { cert, slug } = await params;
  const doc = getText(cert, slug);
  if (!doc) notFound();
  const certInfo = CERTIFICATIONS.find((c) => c.id === doc.cert);
  const siblings = listTexts().filter((t) => t.cert === doc.cert && t.section === doc.section);
  const idx = siblings.findIndex((t) => t.slug === doc.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <article className="mx-auto max-w-3xl">
      <p className="mb-2 text-sm text-muted-foreground">
        <Link href="/texts" className="hover:underline">
          テキスト
        </Link>
        {" / "}
        {certInfo?.short ?? doc.cert}
        {doc.middle ? ` / ${doc.middle}` : ""}
      </p>
      <h1 className="font-display text-[clamp(1.4rem,1.1rem+1.2vw,2rem)] tracking-wide">{doc.title}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {doc.aiGenerated && <Badge variant="outline">AI生成・要確認</Badge>}
        {doc.updated && <span>更新 {doc.updated}</span>}
        <span className="tnum">約{doc.chars.toLocaleString()}字</span>
      </p>
      <Markdown className="mt-6">{doc.body}</Markdown>
      {doc.sources.length > 0 && (
        <section className="mt-8 border-t pt-4 text-sm text-muted-foreground">
          <p className="font-bold">参考</p>
          <ul className="list-disc pl-5">
            {doc.sources.map((s) => (
              <li key={s}>
                <a href={s} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav className="mt-8 flex flex-wrap justify-between gap-2">
        {prev ? (
          <Button variant="outline" render={<Link href={`/texts/${prev.cert}/${prev.slug}`} />}>
            前: {prev.title}
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button variant="outline" render={<Link href={`/texts/${next.cert}/${next.slug}`} />}>
            次: {next.title}
          </Button>
        )}
      </nav>
    </article>
  );
}
