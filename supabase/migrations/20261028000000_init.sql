-- shikaku-quest 初期スキーマ
-- 静的データ（資格カタログ・問題・テキスト）はリポジトリ側に置き、ここにはユーザーの記録だけを持つ。

create extension if not exists pgcrypto;

-- updated_at を自動更新
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- プロフィール（auth.users と 1:1）
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Tokyo',
  daily_goal_min integer not null default 60 check (daily_goal_min >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- サインアップ時にプロフィールを作る
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 資格ごとの取り組み状況
create table public.user_certs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cert_id text not null,
  status text not null default 'planned'
    check (status in ('planned','studying','applied','passed','failed','paused')),
  priority integer not null default 0,
  target_date date,
  applied_on date,
  result_on date,
  score_note text,
  exemption_number text,
  exemption_expires_on date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cert_id)
);
create trigger user_certs_updated_at before update on public.user_certs
  for each row execute function public.set_updated_at();

-- 締切・試験日・修了試験などの予定
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cert_id text,
  title text not null,
  kind text not null default 'other'
    check (kind in ('exam','apply','course','exemption','other')),
  due_on date not null,
  due_time time,
  done boolean not null default false,
  memo text,
  created_at timestamptz not null default now()
);
create index deadlines_user_due on public.deadlines (user_id, due_on);

-- 学習セッション（タイマー・手入力）
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cert_id text,
  started_at timestamptz not null,
  duration_min integer not null check (duration_min >= 0),
  activity text not null default 'other'
    check (activity in ('practice','text','video','course','review','mock','other')),
  middle text,
  memo text,
  created_at timestamptz not null default now()
);
create index study_sessions_user_started on public.study_sessions (user_id, started_at desc);

-- 問題ごとの FSRS カード状態
create table public.question_cards (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null,
  set_id text not null,
  cert_id text not null,
  due timestamptz not null,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0,
  learning_steps integer not null default 0,
  last_review timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index question_cards_user_due on public.question_cards (user_id, due);
create trigger question_cards_updated_at before update on public.question_cards
  for each row execute function public.set_updated_at();

-- 解答履歴
create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null,
  set_id text not null,
  cert_id text not null,
  middle text,
  chosen integer,
  correct boolean not null,
  rating smallint check (rating between 1 and 4),
  time_ms integer,
  answered_at timestamptz not null default now()
);
create index question_attempts_user_time on public.question_attempts (user_id, answered_at desc);

-- 自分用メモ（問題・テキストに紐づく）
create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('question','text','cert')),
  target_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create trigger user_notes_updated_at before update on public.user_notes
  for each row execute function public.set_updated_at();

-- RLS: 本人の行だけ読める・書ける
alter table public.profiles enable row level security;
alter table public.user_certs enable row level security;
alter table public.deadlines enable row level security;
alter table public.study_sessions enable row level security;
alter table public.question_cards enable row level security;
alter table public.question_attempts enable row level security;
alter table public.user_notes enable row level security;

create policy "profiles: own" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "user_certs: own" on public.user_certs
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "deadlines: own" on public.deadlines
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "study_sessions: own" on public.study_sessions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "question_cards: own" on public.question_cards
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "question_attempts: own" on public.question_attempts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_notes: own" on public.user_notes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
