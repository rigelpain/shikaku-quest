"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Deadline,
  Profile,
  QuestionAttempt,
  QuestionCardRow,
  StudySession,
  UserCert,
  UserNote,
} from "./types";

function db() {
  return getSupabaseBrowserClient();
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---- 認証 ----
export async function getCurrentUser() {
  const { data } = await db().auth.getUser();
  return data.user;
}

// ---- プロフィール ----
export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const res = await db().from("profiles").select("*").eq("id", user.id).maybeSingle();
  return unwrap<Profile | null>(res);
}

export async function updateProfile(patch: Partial<Pick<Profile, "display_name" | "daily_goal_min" | "timezone">>) {
  const user = await getCurrentUser();
  if (!user) throw new Error("ログインしていません");
  const res = await db().from("profiles").upsert({ id: user.id, ...patch }).select().single();
  return unwrap<Profile>(res);
}

// ---- 資格の状態 ----
export async function listUserCerts(): Promise<UserCert[]> {
  const res = await db().from("user_certs").select("*").order("priority", { ascending: false });
  return unwrap<UserCert[]>(res) ?? [];
}

export async function upsertUserCert(input: Partial<UserCert> & { cert_id: string }): Promise<UserCert> {
  const res = await db()
    .from("user_certs")
    .upsert(input, { onConflict: "user_id,cert_id" })
    .select()
    .single();
  return unwrap<UserCert>(res);
}

export async function deleteUserCert(certId: string) {
  const res = await db().from("user_certs").delete().eq("cert_id", certId);
  if (res.error) throw new Error(res.error.message);
}

// ---- 締切・予定 ----
export async function listDeadlines(opts?: { includeDone?: boolean }): Promise<Deadline[]> {
  let q = db().from("deadlines").select("*").order("due_on", { ascending: true });
  if (!opts?.includeDone) q = q.eq("done", false);
  return unwrap<Deadline[]>(await q) ?? [];
}

export async function upsertDeadline(input: Partial<Deadline> & { title: string; due_on: string }): Promise<Deadline> {
  const res = await db().from("deadlines").upsert(input).select().single();
  return unwrap<Deadline>(res);
}

export async function setDeadlineDone(id: string, done: boolean) {
  const res = await db().from("deadlines").update({ done }).eq("id", id);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteDeadline(id: string) {
  const res = await db().from("deadlines").delete().eq("id", id);
  if (res.error) throw new Error(res.error.message);
}

// ---- 学習セッション ----
export async function listSessions(opts?: { sinceIso?: string; limit?: number }): Promise<StudySession[]> {
  let q = db().from("study_sessions").select("*").order("started_at", { ascending: false });
  if (opts?.sinceIso) q = q.gte("started_at", opts.sinceIso);
  if (opts?.limit) q = q.limit(opts.limit);
  return unwrap<StudySession[]>(await q) ?? [];
}

export async function addSession(input: Omit<StudySession, "id" | "user_id" | "created_at">): Promise<StudySession> {
  const res = await db().from("study_sessions").insert(input).select().single();
  return unwrap<StudySession>(res);
}

export async function deleteSession(id: string) {
  const res = await db().from("study_sessions").delete().eq("id", id);
  if (res.error) throw new Error(res.error.message);
}

// ---- FSRS カード ----
export async function listCardsForSet(setId: string): Promise<QuestionCardRow[]> {
  const res = await db().from("question_cards").select("*").eq("set_id", setId);
  return unwrap<QuestionCardRow[]>(res) ?? [];
}

export async function listCardsForCert(certId: string): Promise<QuestionCardRow[]> {
  const res = await db().from("question_cards").select("*").eq("cert_id", certId);
  return unwrap<QuestionCardRow[]>(res) ?? [];
}

export async function listDueCards(opts?: { certId?: string; nowIso?: string }): Promise<QuestionCardRow[]> {
  let q = db()
    .from("question_cards")
    .select("*")
    .lte("due", opts?.nowIso ?? new Date().toISOString())
    .order("due", { ascending: true });
  if (opts?.certId) q = q.eq("cert_id", opts.certId);
  return unwrap<QuestionCardRow[]>(await q) ?? [];
}

export async function countDueCards(certId?: string): Promise<number> {
  let q = db()
    .from("question_cards")
    .select("question_id", { count: "exact", head: true })
    .lte("due", new Date().toISOString());
  if (certId) q = q.eq("cert_id", certId);
  const res = await q;
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

export async function upsertCard(row: Omit<QuestionCardRow, "user_id" | "updated_at">): Promise<void> {
  const res = await db().from("question_cards").upsert(row, { onConflict: "user_id,question_id" });
  if (res.error) throw new Error(res.error.message);
}

// ---- 解答履歴 ----
export async function addAttempt(input: Omit<QuestionAttempt, "id" | "user_id" | "answered_at">): Promise<void> {
  const res = await db().from("question_attempts").insert(input);
  if (res.error) throw new Error(res.error.message);
}

export async function listAttempts(opts?: { sinceIso?: string; certId?: string; limit?: number }): Promise<QuestionAttempt[]> {
  let q = db().from("question_attempts").select("*").order("answered_at", { ascending: false });
  if (opts?.sinceIso) q = q.gte("answered_at", opts.sinceIso);
  if (opts?.certId) q = q.eq("cert_id", opts.certId);
  if (opts?.limit) q = q.limit(opts.limit);
  return unwrap<QuestionAttempt[]>(await q) ?? [];
}

// ---- メモ ----
export async function getNote(targetType: UserNote["target_type"], targetId: string): Promise<UserNote | null> {
  const res = await db()
    .from("user_notes")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  return unwrap<UserNote | null>(res);
}

export async function upsertNote(targetType: UserNote["target_type"], targetId: string, body: string) {
  const res = await db()
    .from("user_notes")
    .upsert({ target_type: targetType, target_id: targetId, body }, { onConflict: "user_id,target_type,target_id" });
  if (res.error) throw new Error(res.error.message);
}

// ---- バックアップ ----
export interface ExportBundle {
  version: 1;
  exportedAt: string;
  profile: Profile | null;
  user_certs: UserCert[];
  deadlines: Deadline[];
  study_sessions: StudySession[];
  question_cards: QuestionCardRow[];
  question_attempts: QuestionAttempt[];
  user_notes: UserNote[];
}

export async function exportAll(): Promise<ExportBundle> {
  const s = db();
  const [profile, certs, deadlines, sessions, cards, attempts, notes] = await Promise.all([
    getProfile(),
    s.from("user_certs").select("*"),
    s.from("deadlines").select("*"),
    s.from("study_sessions").select("*"),
    s.from("question_cards").select("*"),
    s.from("question_attempts").select("*"),
    s.from("user_notes").select("*"),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    user_certs: unwrap<UserCert[]>(certs) ?? [],
    deadlines: unwrap<Deadline[]>(deadlines) ?? [],
    study_sessions: unwrap<StudySession[]>(sessions) ?? [],
    question_cards: unwrap<QuestionCardRow[]>(cards) ?? [],
    question_attempts: unwrap<QuestionAttempt[]>(attempts) ?? [],
    user_notes: unwrap<UserNote[]>(notes) ?? [],
  };
}

/** エクスポートした JSON を取り込む（同じ id の行は上書き、user_id は現在のユーザーに付け替える） */
export async function importAll(bundle: ExportBundle): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("ログインしていません");
  const s = db();
  const strip = <T extends { user_id?: string }>(rows: T[]) => rows.map((r) => ({ ...r, user_id: user.id }));

  const steps: Array<PromiseLike<{ error: { message: string } | null }>> = [];
  if (bundle.user_certs.length) steps.push(s.from("user_certs").upsert(strip(bundle.user_certs), { onConflict: "user_id,cert_id" }));
  if (bundle.deadlines.length) steps.push(s.from("deadlines").upsert(strip(bundle.deadlines)));
  if (bundle.study_sessions.length) steps.push(s.from("study_sessions").upsert(strip(bundle.study_sessions)));
  if (bundle.question_cards.length) steps.push(s.from("question_cards").upsert(strip(bundle.question_cards), { onConflict: "user_id,question_id" }));
  if (bundle.question_attempts.length) steps.push(s.from("question_attempts").upsert(strip(bundle.question_attempts)));
  if (bundle.user_notes.length) steps.push(s.from("user_notes").upsert(strip(bundle.user_notes), { onConflict: "user_id,target_type,target_id" }));
  for (const step of steps) {
    const res = await step;
    if (res.error) throw new Error(res.error.message);
  }
}
