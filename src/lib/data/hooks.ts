"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays } from "date-fns";
import * as q from "./queries";
import type { Deadline, StudySession, UserCert } from "./types";

export const keys = {
  user: ["user"] as const,
  profile: ["profile"] as const,
  userCerts: ["user_certs"] as const,
  deadlines: (includeDone: boolean) => ["deadlines", includeDone] as const,
  sessions: (days: number) => ["sessions", days] as const,
  attempts: (days: number, certId?: string) => ["attempts", days, certId ?? "all"] as const,
  dueCount: (certId?: string) => ["due_count", certId ?? "all"] as const,
  cardsForSet: (setId: string) => ["cards_set", setId] as const,
  cardsForCert: (certId: string) => ["cards_cert", certId] as const,
};

export function useCurrentUser() {
  return useQuery({ queryKey: keys.user, queryFn: q.getCurrentUser, staleTime: 5 * 60_000 });
}

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: q.getProfile });
}

export function useUserCerts() {
  return useQuery({ queryKey: keys.userCerts, queryFn: q.listUserCerts });
}

export function useDeadlines(includeDone = false) {
  return useQuery({ queryKey: keys.deadlines(includeDone), queryFn: () => q.listDeadlines({ includeDone }) });
}

export function useSessions(days = 30) {
  return useQuery({
    queryKey: keys.sessions(days),
    queryFn: () => q.listSessions({ sinceIso: subDays(new Date(), days).toISOString() }),
  });
}

export function useAttempts(days = 30, certId?: string) {
  return useQuery({
    queryKey: keys.attempts(days, certId),
    queryFn: () => q.listAttempts({ sinceIso: subDays(new Date(), days).toISOString(), certId }),
  });
}

export function useDueCount(certId?: string) {
  return useQuery({ queryKey: keys.dueCount(certId), queryFn: () => q.countDueCards(certId), staleTime: 10_000 });
}

export function useCardsForSet(setId: string | null) {
  return useQuery({
    queryKey: keys.cardsForSet(setId ?? ""),
    queryFn: () => q.listCardsForSet(setId as string),
    enabled: !!setId,
  });
}

export function useCardsForCert(certId: string | null) {
  return useQuery({
    queryKey: keys.cardsForCert(certId ?? ""),
    queryFn: () => q.listCardsForCert(certId as string),
    enabled: !!certId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (prefixes: string[]) =>
    Promise.all(prefixes.map((p) => qc.invalidateQueries({ queryKey: [p] })));
}

export function useUpsertUserCert() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Partial<UserCert> & { cert_id: string }) => q.upsertUserCert(input),
    onSuccess: () => invalidate(["user_certs"]),
  });
}

export function useDeleteUserCert() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.deleteUserCert, onSuccess: () => invalidate(["user_certs"]) });
}

export function useUpsertDeadline() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Partial<Deadline> & { title: string; due_on: string }) => q.upsertDeadline(input),
    onSuccess: () => invalidate(["deadlines"]),
  });
}

export function useSetDeadlineDone() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => q.setDeadlineDone(id, done),
    onSuccess: () => invalidate(["deadlines"]),
  });
}

export function useDeleteDeadline() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.deleteDeadline, onSuccess: () => invalidate(["deadlines"]) });
}

export function useAddSession() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Omit<StudySession, "id" | "user_id" | "created_at">) => q.addSession(input),
    onSuccess: () => invalidate(["sessions"]),
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.deleteSession, onSuccess: () => invalidate(["sessions"]) });
}

export function useUpdateProfile() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: q.updateProfile, onSuccess: () => invalidate(["profile"]) });
}
