// Supabase のテーブルに対応する型（supabase/migrations を正とする）
export type CertStatus = "planned" | "studying" | "applied" | "passed" | "failed" | "paused";
export type DeadlineKind = "exam" | "apply" | "course" | "exemption" | "other";
export type Activity = "practice" | "text" | "video" | "course" | "review" | "mock" | "other";

export interface Profile {
  id: string;
  display_name: string | null;
  timezone: string;
  daily_goal_min: number;
  created_at: string;
  updated_at: string;
}

export interface UserCert {
  id: string;
  user_id: string;
  cert_id: string;
  status: CertStatus;
  priority: number;
  target_date: string | null;
  applied_on: string | null;
  result_on: string | null;
  score_note: string | null;
  exemption_number: string | null;
  exemption_expires_on: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deadline {
  id: string;
  user_id: string;
  cert_id: string | null;
  title: string;
  kind: DeadlineKind;
  due_on: string;
  due_time: string | null;
  done: boolean;
  memo: string | null;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  cert_id: string | null;
  started_at: string;
  duration_min: number;
  activity: Activity;
  middle: string | null;
  memo: string | null;
  created_at: string;
}

export interface QuestionCardRow {
  user_id: string;
  question_id: string;
  set_id: string;
  cert_id: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  learning_steps: number;
  last_review: string | null;
  updated_at: string;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  set_id: string;
  cert_id: string;
  middle: string | null;
  chosen: number | null;
  correct: boolean;
  rating: number | null;
  time_ms: number | null;
  answered_at: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  target_type: "question" | "text" | "cert";
  target_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const ACTIVITY_LABEL: Record<Activity, string> = {
  practice: "問題演習",
  review: "復習",
  text: "テキスト",
  video: "動画",
  course: "講座",
  mock: "模試",
  other: "その他",
};

export const DEADLINE_KIND_LABEL: Record<DeadlineKind, string> = {
  exam: "試験",
  apply: "申込",
  course: "講習・修了試験",
  exemption: "免除期限",
  other: "その他",
};
