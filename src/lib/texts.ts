import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Major } from "@/content/categories";

export interface TextMeta {
  cert: "fe" | "ap" | "sc" | "sg";
  slug: string;
  title: string;
  section: "a" | "b" | "general";
  major: Major | "共通";
  middle: string;
  order: number;
  summary: string;
  updated: string;
  aiGenerated: boolean;
  sources: string[];
  chars: number;
}

export interface TextDoc extends TextMeta {
  body: string;
}

const ROOT = path.join(process.cwd(), "src", "content", "texts");

function readOne(cert: string, file: string): TextDoc | null {
  const full = path.join(ROOT, cert, file);
  const raw = fs.readFileSync(full, "utf8");
  const { data, content } = matter(raw);
  if (!data.title) return null;
  return {
    cert: (data.cert ?? cert) as TextMeta["cert"],
    slug: file.replace(/\.md$/, ""),
    title: String(data.title),
    section: (data.section ?? "a") as TextMeta["section"],
    major: (data.major ?? "共通") as TextMeta["major"],
    middle: String(data.middle ?? ""),
    order: Number(data.order ?? 999),
    summary: String(data.summary ?? ""),
    updated: String(data.updated ?? ""),
    aiGenerated: Boolean(data.aiGenerated ?? true),
    sources: Array.isArray(data.sources) ? data.sources.map(String) : [],
    chars: content.replace(/\s/g, "").length,
    body: content,
  };
}

export function listTexts(): TextMeta[] {
  if (!fs.existsSync(ROOT)) return [];
  const out: TextMeta[] = [];
  for (const cert of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, cert);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const doc = readOne(cert, file);
      if (doc) {
        const { body: _body, ...meta } = doc;
        void _body;
        out.push(meta);
      }
    }
  }
  return out.sort((a, b) => a.cert.localeCompare(b.cert) || a.section.localeCompare(b.section) || a.order - b.order);
}

export function getText(cert: string, slug: string): TextDoc | null {
  const file = path.join(ROOT, cert, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return readOne(cert, `${slug}.md`);
}
