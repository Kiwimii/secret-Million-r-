create extension if not exists pgcrypto;

create type public.game_phase as enum (
  'lobby', 'role_reveal', 'mission', 'challenge', 'question', 'discussion',
  'mission_review', 'advantage', 'voting', 'evaluation', 'result',
  'role_transfer', 'finished'
);

create type public.participation_status as enum (
  'active', 'eliminated', 'departed', 'paused', 'disqualified'
);

create type public.game_role as enum ('millionaire', 'investigator', 'none');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Secret Millionär – Blaue Adria',
  join_code text not null unique,
  host_user_id uuid not null references auth.users(id) on delete restrict,
  current_round smallint not null default 1 check (current_round between 1 and 4),
  phase public.game_phase not null default 'lobby',
  millionaire_member_id uuid,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  pin_hash text,
  avatar_path text,
  participation_status public.participation_status not null default 'active',
  current_role public.game_role not null default 'none',
  eligible_to_win boolean not null default true,
  can_vote boolean not null default true,
  can_join_challenges boolean not null default true,
  points integer not null default 0 check (points >= 0),
  correct_guesses integer not null default 0 check (correct_guesses >= 0),
  eliminated_in_round smallint check (eliminated_in_round between 1 and 4),
  exit_reason text,
  exit_note text,
  approved_at timestamptz,
  departed_at timestamptz,
  created_at timestamptz not null default now(),
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
  mission_id text,
  advantage_id text,
  mission_completed boolean,
  eliminated_member_id uuid references public.game_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  voter_member_id uuid not null references public.game_members(id) on delete cascade,
  accused_member_id uuid not null references public.game_members(id) on delete cascade,
  is_valid boolean not null default true,
  submitted_at timestamptz not null default now(),
  unique (game_id, round_number, voter_member_id)
);

create table public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index game_members_game_status_idx on public.game_members (game_id, participation_status);
create index votes_game_round_idx on public.votes (game_id, round_number);
create index game_events_game_created_idx on public.game_events (game_id, created_at desc);

alter table public.games enable row level security;
alter table public.game_members enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.game_events enable row level security;

comment on table public.game_events is 'Unveränderbares fachliches Protokoll; Schreibzugriff erfolgt später nur über geschützte Serverfunktionen.';
