create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.game_phase as enum (
  'lobby', 'role_reveal', 'mission', 'challenge', 'question', 'discussion',
  'mission_review', 'advantage', 'voting', 'evaluation', 'result',
  'role_transfer', 'finished'
);

create type public.attendance_status as enum (
  'present', 'temporarily_absent', 'departed'
);

create type public.winner_pool_status as enum (
  'eligible', 'eliminated', 'disqualified'
);

create type public.game_role as enum ('millionaire', 'investigator', 'none');
create type public.vote_stage as enum ('main', 'runoff');
create type public.mission_status as enum ('unassigned', 'assigned', 'completed', 'failed');
create type public.role_decision_type as enum ('not_millionaire', 'keep', 'transfer', 'replacement');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Secret Millionär – Blaue Adria',
  join_code text not null unique check (join_code ~ '^[0-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete restrict,
  current_round smallint not null default 1 check (current_round between 1 and 4),
  phase public.game_phase not null default 'lobby',
  millionaire_member_id uuid,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  display_name citext not null,
  pin_hash text,
  avatar_path text,
  attendance_status public.attendance_status not null default 'present',
  winner_pool_status public.winner_pool_status not null default 'eligible',
  approved_at timestamptz,
  eliminated_in_round smallint check (eliminated_in_round between 1 and 4),
  departed_in_round smallint check (departed_in_round between 1 and 4),
  exit_reason text,
  exit_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, display_name),
  unique (game_id, user_id)
);

alter table public.games
  add constraint games_millionaire_member_fk
  foreign key (millionaire_member_id) references public.game_members(id) on delete set null;

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  title text not null,
  points integer not null check (points between 1 and 4),
  mission_status public.mission_status not null default 'unassigned',
  eliminated_member_id uuid references public.game_members(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create table public.round_roles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  member_id uuid not null references public.game_members(id) on delete restrict,
  role public.game_role not null,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_id, round_number, member_id)
);

create unique index round_roles_one_millionaire_idx
  on public.round_roles (game_id, round_number)
  where role = 'millionaire';

create table public.mission_assignments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  assigned_member_id uuid not null references public.game_members(id) on delete restrict,
  catalog_id text not null,
  title_snapshot text not null,
  task_snapshot text not null,
  success_criteria_snapshot text not null,
  time_window_snapshot text not null,
  status public.mission_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (game_id, round_number)
);

create table public.advantage_assignments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  actor_member_id uuid not null references public.game_members(id) on delete restrict,
  catalog_id text not null,
  effect text not null,
  title_snapshot text not null,
  target_member_id uuid references public.game_members(id) on delete restrict,
  voter_member_id uuid references public.game_members(id) on delete restrict,
  tie_opponent_member_id uuid references public.game_members(id) on delete restrict,
  used_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create table public.questioner_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  questioner_member_id uuid not null references public.game_members(id) on delete restrict,
  question_text text not null,
  is_allowed boolean,
  answer boolean,
  rejected_once boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  stage public.vote_stage not null default 'main',
  voter_member_id uuid not null references public.game_members(id) on delete restrict,
  accused_member_id uuid not null references public.game_members(id) on delete restrict,
  is_valid boolean not null default true,
  invalid_reason text,
  submitted_at timestamptz not null default now(),
  unique (game_id, round_number, stage, voter_member_id)
);

create table public.round_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  millionaire_member_id uuid not null references public.game_members(id) on delete restrict,
  eliminated_member_id uuid not null references public.game_members(id) on delete restrict,
  millionaire_survived boolean not null,
  regular_tally jsonb not null,
  effective_tally jsonb not null,
  advantage_assignment_id uuid references public.advantage_assignments(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create table public.round_scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  member_id uuid not null references public.game_members(id) on delete restrict,
  points_awarded integer not null default 0 check (points_awarded between 0 and 4),
  correct_guess boolean not null default false,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (game_id, round_number, member_id)
);

create table public.role_decisions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  after_round smallint not null check (after_round between 1 and 3),
  member_id uuid not null references public.game_members(id) on delete restrict,
  decision public.role_decision_type not null,
  target_member_id uuid references public.game_members(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  unique (game_id, after_round, member_id)
);

create table public.player_lifecycle_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  member_id uuid not null references public.game_members(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  reason text,
  note text,
  round_number smallint check (round_number between 1 and 4),
  created_at timestamptz not null default now()
);

create table public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null,
  created_at timestamptz not null default now(),
  unique (game_id, revision)
);

create index game_members_game_attendance_idx on public.game_members (game_id, attendance_status);
create index game_members_game_pool_idx on public.game_members (game_id, winner_pool_status);
create index votes_game_round_stage_idx on public.votes (game_id, round_number, stage);
create index game_events_game_created_idx on public.game_events (game_id, created_at desc);
create index lifecycle_game_member_idx on public.player_lifecycle_events (game_id, member_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

create trigger game_members_set_updated_at
before update on public.game_members
for each row execute function public.set_updated_at();

create or replace function public.is_game_host(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.games
    where id = target_game_id and host_user_id = auth.uid()
  );
$$;

create or replace function public.is_approved_game_member(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.game_members
    where game_id = target_game_id
      and user_id = auth.uid()
      and approved_at is not null
  );
$$;

alter table public.games enable row level security;
alter table public.game_members enable row level security;
alter table public.rounds enable row level security;
alter table public.round_roles enable row level security;
alter table public.mission_assignments enable row level security;
alter table public.advantage_assignments enable row level security;
alter table public.questioner_questions enable row level security;
alter table public.votes enable row level security;
alter table public.round_results enable row level security;
alter table public.round_scores enable row level security;
alter table public.role_decisions enable row level security;
alter table public.player_lifecycle_events enable row level security;
alter table public.game_events enable row level security;

create policy games_host_all on public.games
for all to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

create policy games_member_read on public.games
for select to authenticated
using (public.is_approved_game_member(id));

create policy members_host_all on public.game_members
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy members_read_own on public.game_members
for select to authenticated
using (user_id = auth.uid());

create policy rounds_host_all on public.rounds
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy roles_host_all on public.round_roles
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy roles_member_read_own on public.round_roles
for select to authenticated
using (
  member_id in (select id from public.game_members where user_id = auth.uid())
);

create policy missions_host_all on public.mission_assignments
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy missions_assignee_read on public.mission_assignments
for select to authenticated
using (
  assigned_member_id in (select id from public.game_members where user_id = auth.uid())
);

create policy advantages_host_all on public.advantage_assignments
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy advantages_actor_read on public.advantage_assignments
for select to authenticated
using (
  actor_member_id in (select id from public.game_members where user_id = auth.uid())
);

create policy host_only_questions on public.questioner_questions
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy host_only_votes on public.votes
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy host_only_results on public.round_results
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy host_only_scores on public.round_scores
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy host_only_role_decisions on public.role_decisions
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy host_only_lifecycle on public.player_lifecycle_events
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create policy host_read_events on public.game_events
for select to authenticated
using (public.is_game_host(game_id));

comment on table public.game_events is
  'Append-only fachliches Protokoll. Schreibzugriff erfolgt ausschließlich über geschützte Serverfunktionen mit Revisionsprüfung.';
