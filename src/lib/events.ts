import { CERTIFICATIONS } from "@/content/certifications";
import type { Deadline, UserCert } from "@/lib/data/types";
import { daysUntil } from "@/lib/dates";

export interface UpcomingEvent {
  key: string;
  certId: string | null;
  certShort: string | null;
  title: string;
  /** 申込開始など期間の始まり */
  date: string;
  /** 期間の終わり（あれば） */
  endDate?: string;
  kind: "exam" | "apply" | "course" | "exemption" | "target" | "other";
  source: "catalog" | "user";
  daysLeft: number;
  deadlineId?: string;
}

const KIND_FROM_PHASE = (phase: string): UpcomingEvent["kind"] => {
  if (phase.includes("申込")) return "apply";
  if (phase.includes("修了") || phase.includes("講習")) return "course";
  return "exam";
};

/**
 * ダッシュボード用の予定一覧。
 * 資格カタログの日程（追いかけている資格のみ）＋ 自分で登録した予定 ＋ 受験予定日 ＋ 免除期限 を日付順に。
 */
export function buildUpcomingEvents(
  userCerts: UserCert[],
  deadlines: Deadline[],
  now = new Date(),
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const tracked = new Set(userCerts.filter((c) => c.status !== "passed").map((c) => c.cert_id));

  for (const cert of CERTIFICATIONS) {
    if (!tracked.has(cert.id)) continue;
    for (const item of cert.schedule) {
      // 期間が終わっているものは出さない
      const last = item.to ?? item.from;
      if (daysUntil(last, now) < 0) continue;
      const started = daysUntil(item.from, now) <= 0;
      events.push({
        key: `catalog:${cert.id}:${item.label}:${item.phase}`,
        certId: cert.id,
        certShort: cert.short,
        title: `${item.label} ${item.phase}${started && item.to ? "（受付中）" : ""}`,
        date: started && item.to ? item.to : item.from,
        endDate: item.to,
        kind: KIND_FROM_PHASE(item.phase),
        source: "catalog",
        daysLeft: daysUntil(started && item.to ? item.to : item.from, now),
      });
    }
  }

  for (const uc of userCerts) {
    const cert = CERTIFICATIONS.find((c) => c.id === uc.cert_id);
    if (uc.target_date && daysUntil(uc.target_date, now) >= 0 && uc.status !== "passed") {
      events.push({
        key: `target:${uc.cert_id}`,
        certId: uc.cert_id,
        certShort: cert?.short ?? uc.cert_id,
        title: "受験予定日",
        date: uc.target_date,
        kind: "target",
        source: "user",
        daysLeft: daysUntil(uc.target_date, now),
      });
    }
    if (uc.exemption_expires_on && daysUntil(uc.exemption_expires_on, now) >= 0) {
      events.push({
        key: `exemption:${uc.cert_id}`,
        certId: uc.cert_id,
        certShort: cert?.short ?? uc.cert_id,
        title: "免除の有効期限",
        date: uc.exemption_expires_on,
        kind: "exemption",
        source: "user",
        daysLeft: daysUntil(uc.exemption_expires_on, now),
      });
    }
  }

  for (const d of deadlines) {
    if (d.done) continue;
    if (daysUntil(d.due_on, now) < 0) continue;
    const cert = d.cert_id ? CERTIFICATIONS.find((c) => c.id === d.cert_id) : null;
    events.push({
      key: `deadline:${d.id}`,
      certId: d.cert_id,
      certShort: cert?.short ?? null,
      title: d.title,
      date: d.due_on,
      kind: d.kind === "other" ? "other" : d.kind,
      source: "user",
      daysLeft: daysUntil(d.due_on, now),
      deadlineId: d.id,
    });
  }

  return events.sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title, "ja"));
}

/** 残り日数に応じた強調色（朱・金・藍） */
export function urgencyClass(daysLeft: number): string {
  if (daysLeft <= 7) return "text-destructive";
  if (daysLeft <= 30) return "text-gold-foreground dark:text-gold";
  return "text-primary";
}
