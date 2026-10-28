"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { withBasePath } from "@/lib/base-path";
import type { QuestionIndex, QuestionSet } from "./types";

const BASE = "/data/questions";

export async function fetchQuestionIndex(): Promise<QuestionIndex> {
  const res = await fetch(withBasePath(`${BASE}/index.json`));
  if (!res.ok) {
    if (res.status === 404) return { generatedAt: "", sets: [] };
    throw new Error("問題データの一覧を読み込めませんでした");
  }
  return (await res.json()) as QuestionIndex;
}

export async function fetchQuestionSet(file: string): Promise<QuestionSet> {
  const res = await fetch(withBasePath(`${BASE}/${file}`));
  if (!res.ok) throw new Error("問題セットを読み込めませんでした");
  return (await res.json()) as QuestionSet;
}

export function useQuestionIndex() {
  return useQuery({ queryKey: ["question_index"], queryFn: fetchQuestionIndex, staleTime: Infinity });
}

export function useQuestionSet(file: string | null) {
  return useQuery({
    queryKey: ["question_set", file],
    queryFn: () => fetchQuestionSet(file as string),
    enabled: !!file,
    staleTime: Infinity,
  });
}

export function useQuestionSets(files: string[]) {
  const results = useQueries({
    queries: files.map((file) => ({
      queryKey: ["question_set", file],
      queryFn: () => fetchQuestionSet(file),
      staleTime: Infinity,
    })),
  });
  return {
    sets: results.map((r) => r.data).filter((s): s is QuestionSet => !!s),
    isLoading: results.some((r) => r.isLoading),
    error: results.find((r) => r.error)?.error ?? null,
    ready: files.length > 0 && results.every((r) => r.isSuccess),
  };
}
