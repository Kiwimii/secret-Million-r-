-- Persönliche Profile, Challenge-Auswahl und öffentliche Team-Lobby.
-- Geheimrollen, Punkte, Stimmen und Vorteile bleiben weiterhin vollständig
-- außerhalb dieser öffentlichen Lobbydaten.

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'challenge_team_code'
  ) then
    create type public.challenge_team_code as enum ('azur', 'gold');
  end if;
end
$$;

alter table public.game_members
  add column if not exists profile_completed_at timestamptz;

create table if not exists public.challenge_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  catalog_id text not null,
  title_snapshot text not null,
  public_name_snapshot text not null,
  player_briefing_snapshot text not null,
  host_instructions_snapshot text not null,
  duration_snapshot text not null,
  material_snapshot jsonb not null default '[]'::jsonb,
  win_condition_snapshot text not null,
  safety_note_snapshot text not null,
  winning_team public.challenge_team_code,
  selected_at timestamptz not null default now(),
  teams_drawn_at timestamptz,
  winner_confirmed_at timestamptz,
  unique (game_id, round_number)
);

create table if not exists public.challenge_team_assignments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  member_id uuid not null references public.game_members(id) on delete cascade,
  team public.challenge_team_code not null,
  draw_revision bigint not null check (draw_revision > 0),
  created_at timestamptz not null default now(),
  unique (game_id, round_number, member_id)
);

create index if not exists challenge_rounds_game_round_idx
  on public.challenge_rounds (game_id, round_number);

create index if not exists challenge_team_game_round_team_idx
  on public.challenge_team_assignments (game_id, round_number, team);

alter table public.challenge_rounds enable row level security;
alter table public.challenge_team_assignments enable row level security;

drop policy if exists challenge_rounds_host_all on public.challenge_rounds;
create policy challenge_rounds_host_all on public.challenge_rounds
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

drop policy if exists challenge_rounds_member_read on public.challenge_rounds;
create policy challenge_rounds_member_read on public.challenge_rounds
for select to authenticated
using (public.is_approved_game_member(game_id));

drop policy if exists challenge_teams_host_all on public.challenge_team_assignments;
create policy challenge_teams_host_all on public.challenge_team_assignments
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

drop policy if exists challenge_teams_member_read on public.challenge_team_assignments;
create policy challenge_teams_member_read on public.challenge_team_assignments
for select to authenticated
using (public.is_approved_game_member(game_id));

create or replace function public.get_public_lobby_members(target_game_id uuid)
returns table (
  member_id uuid,
  display_name citext,
  avatar_path text,
  attendance_status public.attendance_status,
  winner_pool_status public.winner_pool_status,
  profile_completed boolean,
  challenge_team public.challenge_team_code
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_round smallint;
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf die Lobby.' using errcode = '42501';
  end if;

  select g.current_round
    into active_round
  from public.games g
  where g.id = target_game_id;

  return query
  select
    gm.id,
    gm.display_name,
    gm.avatar_path,
    gm.attendance_status,
    gm.winner_pool_status,
    gm.profile_completed_at is not null,
    cta.team
  from public.game_members gm
  left join public.challenge_team_assignments cta
    on cta.game_id = gm.game_id
   and cta.member_id = gm.id
   and cta.round_number = active_round
  where gm.game_id = target_game_id
    and gm.approved_at is not null
  order by gm.created_at, gm.display_name;
end;
$$;

revoke all on function public.get_public_lobby_members(uuid) from public;
grant execute on function public.get_public_lobby_members(uuid) to authenticated;

comment on table public.challenge_rounds is
  'Öffentliche Challenge-Beschreibung und bestätigtes Gewinnerteam pro Runde. Enthält keine Geheimrollen oder Vorteile.';

comment on table public.challenge_team_assignments is
  'Zufällig gezogene öffentliche Teamzuordnung für die aktuelle Challenge.';

comment on function public.get_public_lobby_members(uuid) is
  'Gemeinsame Lobbyansicht mit Profil, öffentlichem Status und Challenge-Team ohne geheime Spieldaten.';
