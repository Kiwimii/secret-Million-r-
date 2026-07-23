-- Echte Mehrgeräte-Partien für Secret Millionär.
--
-- Ziel:
--   * Spielleitung erstellt eine Partie und erhält einen sechsstelligen Code.
--   * Spieler treten mit Code, eigenem Profil und vierstelliger PIN bei.
--   * Lobby, Teams, Phase und Fortschritt werden serverseitig gespeichert.
--   * Die Spielleitung sieht den aktuellen Bildschirm- und Aktionsstand aller Spieler.
--   * Missionen werden vorab pro Runde gewählt und erst dem Millionär freigegeben.

alter table public.games
  add column if not exists host_pin_hash text,
  add column if not exists accepting_players boolean not null default true;

create table if not exists public.round_mission_selections (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  catalog_id text not null,
  title_snapshot text not null,
  task_snapshot text not null,
  success_criteria_snapshot text not null,
  time_window_snapshot text not null,
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create table if not exists public.player_progress (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  member_id uuid not null references public.game_members(id) on delete cascade,
  screen_key text not null default 'lobby',
  step_key text not null default 'joined',
  phase_seen public.game_phase not null default 'lobby',
  role_revealed boolean not null default false,
  mission_opened boolean not null default false,
  advantage_opened boolean not null default false,
  challenge_briefing_opened boolean not null default false,
  vote_submitted boolean not null default false,
  role_decision_submitted boolean not null default false,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, member_id)
);

create table if not exists public.live_game_updates (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  update_type text not null default 'refresh',
  created_at timestamptz not null default now()
);

create index if not exists player_progress_game_seen_idx
  on public.player_progress (game_id, last_seen_at desc);

create index if not exists live_game_updates_game_id_idx
  on public.live_game_updates (game_id, id desc);

create index if not exists games_join_code_idx
  on public.games (join_code);

alter table public.round_mission_selections enable row level security;
alter table public.player_progress enable row level security;
alter table public.live_game_updates enable row level security;

drop policy if exists round_mission_host_all on public.round_mission_selections;
create policy round_mission_host_all on public.round_mission_selections
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

drop policy if exists round_mission_assignee_read on public.round_mission_selections;
create policy round_mission_assignee_read on public.round_mission_selections
for select to authenticated
using (
  exists (
    select 1
    from public.games g
    join public.game_members gm
      on gm.id = g.millionaire_member_id
     and gm.game_id = g.id
    where g.id = round_mission_selections.game_id
      and g.current_round = round_mission_selections.round_number
      and gm.user_id = auth.uid()
      and g.phase in (
        'mission', 'challenge', 'question', 'mission_review', 'discussion',
        'advantage', 'voting', 'evaluation', 'result'
      )
  )
);

drop policy if exists player_progress_host_read on public.player_progress;
create policy player_progress_host_read on public.player_progress
for select to authenticated
using (public.is_game_host(game_id));

drop policy if exists player_progress_member_own on public.player_progress;
create policy player_progress_member_own on public.player_progress
for all to authenticated
using (
  member_id in (
    select gm.id from public.game_members gm where gm.user_id = auth.uid()
  )
)
with check (
  member_id in (
    select gm.id from public.game_members gm where gm.user_id = auth.uid()
  )
);

drop policy if exists live_updates_participant_read on public.live_game_updates;
create policy live_updates_participant_read on public.live_game_updates
for select to authenticated
using (
  public.is_game_host(game_id)
  or public.is_approved_game_member(game_id)
);

create or replace function public.normalize_live_join_code(raw_code text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(raw_code, ''), '[^0-9]', '', 'g');
$$;

create or replace function public.create_unique_live_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := lpad((floor(random() * 1000000))::integer::text, 6, '0');
    exit when not exists (select 1 from public.games where join_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_live_game(
  game_title text,
  host_pin text
)
returns table (
  game_id uuid,
  join_code text,
  title text,
  current_round smallint,
  phase public.game_phase,
  revision bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_game public.games%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Für eine Live-Partie ist eine gültige Gerätesitzung erforderlich.' using errcode = '42501';
  end if;

  if host_pin !~ '^[0-9]{4}$' then
    raise exception 'Die Spielleiter-PIN muss genau vier Ziffern enthalten.';
  end if;

  insert into public.games (
    title,
    join_code,
    host_user_id,
    host_pin_hash,
    current_round,
    phase,
    revision,
    accepting_players
  ) values (
    coalesce(nullif(btrim(game_title), ''), 'Secret Millionär – Blaue Adria'),
    public.create_unique_live_join_code(),
    auth.uid(),
    crypt(host_pin, gen_salt('bf', 10)),
    1,
    'lobby',
    1,
    true
  ) returning * into created_game;

  insert into public.rounds (game_id, round_number, title, points)
  values
    (created_game.id, 1, 'Operation Umkehrschub', 1),
    (created_game.id, 2, 'Der Fall des weißen Königs', 2),
    (created_game.id, 3, 'Protokoll Aquarius', 3),
    (created_game.id, 4, 'Die Midas-Klammer', 4)
  on conflict (game_id, round_number) do nothing;

  insert into public.live_game_updates (game_id, update_type)
  values (created_game.id, 'game_created');

  return query
  select
    created_game.id,
    created_game.join_code,
    created_game.title,
    created_game.current_round,
    created_game.phase,
    created_game.revision;
end;
$$;

create or replace function public.lookup_live_game(raw_join_code text)
returns table (
  game_id uuid,
  title text,
  join_code text,
  current_round smallint,
  phase public.game_phase,
  revision bigint,
  accepting_players boolean,
  is_host boolean,
  member_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_live_join_code(raw_join_code);
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;

  return query
  select
    g.id,
    g.title,
    g.join_code,
    g.current_round,
    g.phase,
    g.revision,
    g.accepting_players,
    g.host_user_id = auth.uid(),
    gm.id
  from public.games g
  left join public.game_members gm
    on gm.game_id = g.id
   and gm.user_id = auth.uid()
   and gm.approved_at is not null
  where g.join_code = normalized_code;
end;
$$;

create or replace function public.join_or_resume_live_game(
  raw_join_code text,
  requested_display_name text,
  player_pin text,
  requested_avatar_path text default null
)
returns table (
  game_id uuid,
  member_id uuid,
  display_name citext,
  resumed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_live_join_code(raw_join_code);
  normalized_name text := regexp_replace(btrim(coalesce(requested_display_name, '')), '\s+', ' ', 'g');
  target_game public.games%rowtype;
  existing_member public.game_members%rowtype;
  created_member public.game_members%rowtype;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;

  if normalized_code !~ '^[0-9]{6}$' then
    raise exception 'Der Einladungscode muss sechs Ziffern enthalten.';
  end if;

  if length(normalized_name) not between 2 and 28 then
    raise exception 'Der Profilname muss zwischen 2 und 28 Zeichen lang sein.';
  end if;

  if player_pin !~ '^[0-9]{4}$' then
    raise exception 'Die Profil-PIN muss genau vier Ziffern enthalten.';
  end if;

  select * into target_game
  from public.games
  where join_code = normalized_code
  for update;

  if not found then
    raise exception 'Unter diesem Code existiert keine Partie.';
  end if;

  select * into existing_member
  from public.game_members gm
  where gm.game_id = target_game.id
    and lower(gm.display_name::text) = lower(normalized_name)
  for update;

  if found then
    if existing_member.pin_hash is null
       or crypt(player_pin, existing_member.pin_hash) <> existing_member.pin_hash then
      raise exception 'Name gefunden, PIN falsch. Das Profil bleibt dort, wo es hingehört.' using errcode = '42501';
    end if;

    if exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game.id
        and gm.user_id = auth.uid()
        and gm.id <> existing_member.id
    ) then
      raise exception 'Dieses Gerät ist bereits mit einem anderen Profil der Partie verbunden.';
    end if;

    update public.game_members
    set user_id = auth.uid(),
        avatar_path = coalesce(requested_avatar_path, avatar_path),
        attendance_status = 'present',
        approved_at = coalesce(approved_at, now()),
        profile_completed_at = coalesce(profile_completed_at, now()),
        updated_at = now()
    where id = existing_member.id
    returning * into created_member;

    insert into public.player_progress (game_id, member_id, screen_key, step_key, phase_seen)
    values (target_game.id, created_member.id, 'lobby', 'profile_resumed', target_game.phase)
    on conflict (game_id, member_id)
    do update set
      screen_key = 'lobby',
      step_key = 'profile_resumed',
      phase_seen = excluded.phase_seen,
      last_seen_at = now(),
      updated_at = now();

    insert into public.live_game_updates (game_id, update_type)
    values (target_game.id, 'member_resumed');

    return query select target_game.id, created_member.id, created_member.display_name, true;
    return;
  end if;

  if not target_game.accepting_players then
    raise exception 'Die Spielleitung hat den Beitritt geschlossen.';
  end if;

  select count(*) into member_count
  from public.game_members gm
  where gm.game_id = target_game.id
    and gm.approved_at is not null;

  if member_count >= 16 then
    raise exception 'Die Partie ist mit 16 Spielern vollständig.';
  end if;

  if exists (
    select 1 from public.game_members gm
    where gm.game_id = target_game.id and gm.user_id = auth.uid()
  ) then
    raise exception 'Dieses Gerät besitzt bereits ein Profil in dieser Partie.';
  end if;

  insert into public.game_members (
    game_id,
    user_id,
    display_name,
    pin_hash,
    avatar_path,
    attendance_status,
    winner_pool_status,
    approved_at,
    profile_completed_at
  ) values (
    target_game.id,
    auth.uid(),
    normalized_name,
    crypt(player_pin, gen_salt('bf', 10)),
    requested_avatar_path,
    'present',
    'eligible',
    now(),
    now()
  ) returning * into created_member;

  insert into public.player_progress (game_id, member_id, screen_key, step_key, phase_seen)
  values (target_game.id, created_member.id, 'lobby', 'profile_created', target_game.phase);

  insert into public.live_game_updates (game_id, update_type)
  values (target_game.id, 'member_joined');

  return query select target_game.id, created_member.id, created_member.display_name, false;
end;
$$;

create or replace function public.resume_live_host(
  raw_join_code text,
  host_pin text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_live_join_code(raw_join_code);
  target_game public.games%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;

  select * into target_game
  from public.games
  where join_code = normalized_code
  for update;

  if not found then
    raise exception 'Unter diesem Code existiert keine Partie.';
  end if;

  if target_game.host_pin_hash is null
     or crypt(host_pin, target_game.host_pin_hash) <> target_game.host_pin_hash then
    raise exception 'Die Spielleiter-PIN ist falsch.' using errcode = '42501';
  end if;

  update public.games
  set host_user_id = auth.uid(), updated_at = now()
  where id = target_game.id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game.id, 'host_resumed');

  return target_game.id;
end;
$$;

create or replace function public.update_own_player_progress(
  target_game_id uuid,
  requested_screen_key text,
  requested_step_key text,
  requested_phase_seen public.game_phase,
  requested_role_revealed boolean default null,
  requested_mission_opened boolean default null,
  requested_advantage_opened boolean default null,
  requested_challenge_opened boolean default null,
  requested_vote_submitted boolean default null,
  requested_role_decision_submitted boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member_id uuid;
begin
  select gm.id into own_member_id
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null then
    raise exception 'Kein persönliches Profil für diese Partie.' using errcode = '42501';
  end if;

  insert into public.player_progress (
    game_id,
    member_id,
    screen_key,
    step_key,
    phase_seen,
    role_revealed,
    mission_opened,
    advantage_opened,
    challenge_briefing_opened,
    vote_submitted,
    role_decision_submitted,
    last_seen_at,
    updated_at
  ) values (
    target_game_id,
    own_member_id,
    left(coalesce(nullif(btrim(requested_screen_key), ''), 'unknown'), 80),
    left(coalesce(nullif(btrim(requested_step_key), ''), 'viewing'), 120),
    requested_phase_seen,
    coalesce(requested_role_revealed, false),
    coalesce(requested_mission_opened, false),
    coalesce(requested_advantage_opened, false),
    coalesce(requested_challenge_opened, false),
    coalesce(requested_vote_submitted, false),
    coalesce(requested_role_decision_submitted, false),
    now(),
    now()
  )
  on conflict (game_id, member_id)
  do update set
    screen_key = excluded.screen_key,
    step_key = excluded.step_key,
    phase_seen = excluded.phase_seen,
    role_revealed = coalesce(requested_role_revealed, player_progress.role_revealed),
    mission_opened = coalesce(requested_mission_opened, player_progress.mission_opened),
    advantage_opened = coalesce(requested_advantage_opened, player_progress.advantage_opened),
    challenge_briefing_opened = coalesce(requested_challenge_opened, player_progress.challenge_briefing_opened),
    vote_submitted = coalesce(requested_vote_submitted, player_progress.vote_submitted),
    role_decision_submitted = coalesce(requested_role_decision_submitted, player_progress.role_decision_submitted),
    last_seen_at = now(),
    updated_at = now();

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'progress');
end;
$$;

create or replace function public.get_host_player_progress(target_game_id uuid)
returns table (
  member_id uuid,
  display_name citext,
  avatar_path text,
  attendance_status public.attendance_status,
  winner_pool_status public.winner_pool_status,
  challenge_team public.challenge_team_code,
  screen_key text,
  step_key text,
  phase_seen public.game_phase,
  role_revealed boolean,
  mission_opened boolean,
  advantage_opened boolean,
  challenge_briefing_opened boolean,
  vote_submitted boolean,
  role_decision_submitted boolean,
  last_seen_at timestamptz,
  current_role public.game_role
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_round smallint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung sieht den Fortschrittsmonitor.' using errcode = '42501';
  end if;

  select g.current_round into active_round from public.games g where g.id = target_game_id;

  return query
  select
    gm.id,
    gm.display_name,
    gm.avatar_path,
    gm.attendance_status,
    gm.winner_pool_status,
    cta.team,
    coalesce(pp.screen_key, 'offline'),
    coalesce(pp.step_key, 'noch_nicht_geöffnet'),
    coalesce(pp.phase_seen, 'lobby'::public.game_phase),
    coalesce(pp.role_revealed, false),
    coalesce(pp.mission_opened, false),
    coalesce(pp.advantage_opened, false),
    coalesce(pp.challenge_briefing_opened, false),
    coalesce(pp.vote_submitted, false),
    coalesce(pp.role_decision_submitted, false),
    pp.last_seen_at,
    coalesce(rr.role, 'none'::public.game_role)
  from public.game_members gm
  left join public.player_progress pp
    on pp.game_id = gm.game_id and pp.member_id = gm.id
  left join public.challenge_team_assignments cta
    on cta.game_id = gm.game_id
   and cta.member_id = gm.id
   and cta.round_number = active_round
  left join public.round_roles rr
    on rr.game_id = gm.game_id
   and rr.member_id = gm.id
   and rr.round_number = active_round
  where gm.game_id = target_game_id
    and gm.approved_at is not null
  order by gm.created_at, gm.display_name;
end;
$$;

create or replace function public.set_live_game_phase(
  target_game_id uuid,
  target_round smallint,
  target_phase public.game_phase,
  expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Phase ändern.' using errcode = '42501';
  end if;

  if target_round not between 1 and 4 then
    raise exception 'Ungültige Rundennummer.';
  end if;

  update public.games
  set current_round = target_round,
      phase = target_phase,
      revision = revision + 1
  where id = target_game_id
    and revision = expected_revision
  returning revision into new_revision;

  if new_revision is null then
    raise exception 'Der Spielstand wurde bereits auf einem anderen Gerät verändert. Bitte neu laden.' using errcode = '40001';
  end if;

  if target_phase in ('lobby', 'role_reveal') then
    update public.player_progress
    set role_revealed = false,
        mission_opened = false,
        advantage_opened = false,
        challenge_briefing_opened = false,
        vote_submitted = false,
        role_decision_submitted = false,
        phase_seen = target_phase,
        updated_at = now()
    where game_id = target_game_id;
  else
    update public.player_progress
    set phase_seen = target_phase, updated_at = now()
    where game_id = target_game_id;
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'phase');

  return new_revision;
end;
$$;

create or replace function public.select_live_round_mission(
  target_game_id uuid,
  target_round smallint,
  mission_catalog_id text,
  mission_title text,
  mission_task text,
  mission_success_criteria text,
  mission_time_window text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_millionaire uuid;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf Missionen auswählen.' using errcode = '42501';
  end if;

  if target_round not between 1 and 4 then
    raise exception 'Ungültige Rundennummer.';
  end if;

  insert into public.round_mission_selections (
    game_id,
    round_number,
    catalog_id,
    title_snapshot,
    task_snapshot,
    success_criteria_snapshot,
    time_window_snapshot,
    selected_at,
    updated_at
  ) values (
    target_game_id,
    target_round,
    mission_catalog_id,
    mission_title,
    mission_task,
    mission_success_criteria,
    mission_time_window,
    now(),
    now()
  )
  on conflict (game_id, round_number)
  do update set
    catalog_id = excluded.catalog_id,
    title_snapshot = excluded.title_snapshot,
    task_snapshot = excluded.task_snapshot,
    success_criteria_snapshot = excluded.success_criteria_snapshot,
    time_window_snapshot = excluded.time_window_snapshot,
    selected_at = now(),
    updated_at = now();

  select g.millionaire_member_id into active_millionaire
  from public.games g
  where g.id = target_game_id and g.current_round = target_round;

  if active_millionaire is not null then
    insert into public.mission_assignments (
      game_id,
      round_number,
      assigned_member_id,
      catalog_id,
      title_snapshot,
      task_snapshot,
      success_criteria_snapshot,
      time_window_snapshot,
      status,
      assigned_at
    ) values (
      target_game_id,
      target_round,
      active_millionaire,
      mission_catalog_id,
      mission_title,
      mission_task,
      mission_success_criteria,
      mission_time_window,
      'assigned',
      now()
    )
    on conflict (game_id, round_number)
    do update set
      assigned_member_id = excluded.assigned_member_id,
      catalog_id = excluded.catalog_id,
      title_snapshot = excluded.title_snapshot,
      task_snapshot = excluded.task_snapshot,
      success_criteria_snapshot = excluded.success_criteria_snapshot,
      time_window_snapshot = excluded.time_window_snapshot,
      status = 'assigned',
      assigned_at = now(),
      reviewed_at = null;
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'mission_selected');
end;
$$;

create or replace function public.select_live_challenge(
  target_game_id uuid,
  target_round smallint,
  challenge_catalog_id text,
  challenge_title text,
  challenge_public_name text,
  challenge_player_briefing text,
  challenge_host_instructions text,
  challenge_duration text,
  challenge_material jsonb,
  challenge_win_condition text,
  challenge_safety_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf Challenges auswählen.' using errcode = '42501';
  end if;

  insert into public.challenge_rounds (
    game_id,
    round_number,
    catalog_id,
    title_snapshot,
    public_name_snapshot,
    player_briefing_snapshot,
    host_instructions_snapshot,
    duration_snapshot,
    material_snapshot,
    win_condition_snapshot,
    safety_note_snapshot,
    winning_team,
    selected_at,
    teams_drawn_at,
    winner_confirmed_at
  ) values (
    target_game_id,
    target_round,
    challenge_catalog_id,
    challenge_title,
    challenge_public_name,
    challenge_player_briefing,
    challenge_host_instructions,
    challenge_duration,
    coalesce(challenge_material, '[]'::jsonb),
    challenge_win_condition,
    challenge_safety_note,
    null,
    now(),
    null,
    null
  )
  on conflict (game_id, round_number)
  do update set
    catalog_id = excluded.catalog_id,
    title_snapshot = excluded.title_snapshot,
    public_name_snapshot = excluded.public_name_snapshot,
    player_briefing_snapshot = excluded.player_briefing_snapshot,
    host_instructions_snapshot = excluded.host_instructions_snapshot,
    duration_snapshot = excluded.duration_snapshot,
    material_snapshot = excluded.material_snapshot,
    win_condition_snapshot = excluded.win_condition_snapshot,
    safety_note_snapshot = excluded.safety_note_snapshot,
    winning_team = null,
    selected_at = now(),
    teams_drawn_at = null,
    winner_confirmed_at = null;

  delete from public.challenge_team_assignments
  where game_id = target_game_id and round_number = target_round;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'challenge_selected');
end;
$$;

create or replace function public.draw_live_challenge_teams(
  target_game_id uuid,
  target_round smallint
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  draw_revision bigint;
  assignment_count integer;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf Teams auslosen.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
  ) then
    raise exception 'Wähle vor der Teamauslosung eine Challenge.';
  end if;

  select revision + 1 into draw_revision
  from public.games where id = target_game_id for update;

  delete from public.challenge_team_assignments
  where game_id = target_game_id and round_number = target_round;

  insert into public.challenge_team_assignments (
    game_id,
    round_number,
    member_id,
    team,
    draw_revision
  )
  select
    target_game_id,
    target_round,
    shuffled.id,
    case when shuffled.position % 2 = 1
      then 'azur'::public.challenge_team_code
      else 'gold'::public.challenge_team_code
    end,
    draw_revision
  from (
    select gm.id, row_number() over (order by gen_random_uuid()) as position
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status <> 'disqualified'
  ) shuffled;

  get diagnostics assignment_count = row_count;

  if assignment_count < 2 then
    raise exception 'Für eine Team-Challenge werden mindestens zwei aktive Spieler benötigt.';
  end if;

  update public.games
  set revision = draw_revision
  where id = target_game_id;

  update public.challenge_rounds
  set teams_drawn_at = now(), winning_team = null, winner_confirmed_at = null
  where game_id = target_game_id and round_number = target_round;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'teams_drawn');

  return assignment_count;
end;
$$;

create or replace function public.confirm_live_challenge_winner(
  target_game_id uuid,
  target_round smallint,
  winning_team_code public.challenge_team_code
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf das Gewinnerteam bestätigen.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.challenge_team_assignments cta
    where cta.game_id = target_game_id
      and cta.round_number = target_round
      and cta.team = winning_team_code
  ) then
    raise exception 'Das gewählte Team hat keine aktiven Mitglieder.';
  end if;

  update public.challenge_rounds
  set winning_team = winning_team_code,
      winner_confirmed_at = now()
  where game_id = target_game_id and round_number = target_round;

  if not found then
    raise exception 'Challenge der Runde wurde nicht gefunden.';
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'challenge_winner');
end;
$$;

create or replace function public.mark_own_role_revealed(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member_id uuid;
  active_round smallint;
begin
  select gm.id, g.current_round
    into own_member_id, active_round
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null then
    raise exception 'Kein persönliches Profil für diese Partie.' using errcode = '42501';
  end if;

  update public.round_roles
  set revealed_at = coalesce(revealed_at, now())
  where game_id = target_game_id
    and round_number = active_round
    and member_id = own_member_id;

  perform public.update_own_player_progress(
    target_game_id,
    'role_card',
    'role_revealed',
    (select phase from public.games where id = target_game_id),
    true,
    null,
    null,
    null,
    null,
    null
  );
end;
$$;

create or replace function public.submit_live_vote(
  target_game_id uuid,
  target_accused_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_stage public.vote_stage := 'main';
  active_phase public.game_phase;
begin
  select gm.id, g.current_round, g.phase
    into own_member_id, active_round, active_phase
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null
    and gm.attendance_status = 'present'
    and gm.winner_pool_status <> 'disqualified';

  if own_member_id is null then
    raise exception 'Du bist in dieser Partie nicht stimmberechtigt.' using errcode = '42501';
  end if;

  if active_phase <> 'voting' then
    raise exception 'Die Abstimmung ist nicht geöffnet.';
  end if;

  if not exists (
    select 1 from public.game_members gm
    where gm.id = target_accused_member_id
      and gm.game_id = target_game_id
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
  ) then
    raise exception 'Dieses Abstimmungsziel ist nicht zulässig.';
  end if;

  insert into public.votes (
    game_id,
    round_number,
    stage,
    voter_member_id,
    accused_member_id,
    is_valid,
    submitted_at
  ) values (
    target_game_id,
    active_round,
    active_stage,
    own_member_id,
    target_accused_member_id,
    true,
    now()
  )
  on conflict (game_id, round_number, stage, voter_member_id)
  do update set
    accused_member_id = excluded.accused_member_id,
    is_valid = true,
    invalid_reason = null,
    submitted_at = now();

  perform public.update_own_player_progress(
    target_game_id,
    'voting',
    'vote_submitted',
    active_phase,
    null,
    null,
    null,
    null,
    true,
    null
  );
end;
$$;

create or replace function public.get_live_private_state(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  result jsonb;
begin
  select gm.id, g.current_round, g.phase
    into own_member_id, active_round, active_phase
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null then
    raise exception 'Kein persönliches Profil für diese Partie.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'memberId', own_member_id,
    'role', (
      select rr.role from public.round_roles rr
      where rr.game_id = target_game_id
        and rr.round_number = active_round
        and rr.member_id = own_member_id
        and active_phase not in ('lobby', 'role_transfer')
    ),
    'roleRevealedAt', (
      select rr.revealed_at from public.round_roles rr
      where rr.game_id = target_game_id
        and rr.round_number = active_round
        and rr.member_id = own_member_id
    ),
    'mission', (
      select to_jsonb(ma) - 'assigned_member_id'
      from public.mission_assignments ma
      where ma.game_id = target_game_id
        and ma.round_number = active_round
        and ma.assigned_member_id = own_member_id
        and active_phase in (
          'mission', 'challenge', 'question', 'mission_review', 'discussion',
          'advantage', 'voting', 'evaluation', 'result'
        )
    ),
    'advantage', (
      select to_jsonb(aa) - 'actor_member_id'
      from public.advantage_assignments aa
      where aa.game_id = target_game_id
        and aa.round_number = active_round
        and aa.actor_member_id = own_member_id
        and active_phase in ('advantage', 'voting', 'evaluation', 'result')
    ),
    'ownVote', (
      select jsonb_build_object(
        'accusedMemberId', v.accused_member_id,
        'stage', v.stage,
        'submittedAt', v.submitted_at
      )
      from public.votes v
      where v.game_id = target_game_id
        and v.round_number = active_round
        and v.voter_member_id = own_member_id
        and v.is_valid
      order by v.submitted_at desc
      limit 1
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.sync_selected_mission_to_millionaire()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.round_mission_selections%rowtype;
begin
  if new.millionaire_member_id is null
     or new.current_round is null
     or new.millionaire_member_id is not distinct from old.millionaire_member_id then
    return new;
  end if;

  select * into selected
  from public.round_mission_selections rms
  where rms.game_id = new.id
    and rms.round_number = new.current_round;

  if found then
    insert into public.mission_assignments (
      game_id,
      round_number,
      assigned_member_id,
      catalog_id,
      title_snapshot,
      task_snapshot,
      success_criteria_snapshot,
      time_window_snapshot,
      status,
      assigned_at
    ) values (
      new.id,
      new.current_round,
      new.millionaire_member_id,
      selected.catalog_id,
      selected.title_snapshot,
      selected.task_snapshot,
      selected.success_criteria_snapshot,
      selected.time_window_snapshot,
      'assigned',
      now()
    )
    on conflict (game_id, round_number)
    do update set
      assigned_member_id = excluded.assigned_member_id,
      catalog_id = excluded.catalog_id,
      title_snapshot = excluded.title_snapshot,
      task_snapshot = excluded.task_snapshot,
      success_criteria_snapshot = excluded.success_criteria_snapshot,
      time_window_snapshot = excluded.time_window_snapshot,
      status = 'assigned',
      assigned_at = now(),
      reviewed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists games_sync_selected_mission on public.games;
create trigger games_sync_selected_mission
after update of millionaire_member_id on public.games
for each row execute function public.sync_selected_mission_to_millionaire();

create or replace function public.emit_live_game_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_json jsonb;
  resolved_game_id uuid;
begin
  row_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  resolved_game_id := coalesce(
    nullif(row_json ->> 'game_id', '')::uuid,
    case when tg_table_name = 'games' then nullif(row_json ->> 'id', '')::uuid else null end
  );

  if resolved_game_id is not null then
    insert into public.live_game_updates (game_id, update_type)
    values (resolved_game_id, tg_table_name);
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'games',
    'game_members',
    'round_roles',
    'mission_assignments',
    'advantage_assignments',
    'questioner_questions',
    'votes',
    'role_decisions',
    'challenge_rounds',
    'challenge_team_assignments',
    'round_mission_selections'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'live_refresh_' || target_table, target_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.emit_live_game_refresh()',
      'live_refresh_' || target_table,
      target_table
    );
  end loop;
end
$$;

-- Private Presence-Kanäle verwenden das Thema game:<uuid>.
-- Der Zugriff wird anhand derselben Host-/Mitgliedschaftsprüfung wie die Datenbank gesteuert.
drop policy if exists secret_millionaire_realtime_read on realtime.messages;
create policy secret_millionaire_realtime_read
on realtime.messages
for select
to authenticated
using (
  split_part((select realtime.topic()), ':', 1) = 'game'
  and (
    public.is_game_host(split_part((select realtime.topic()), ':', 2)::uuid)
    or public.is_approved_game_member(split_part((select realtime.topic()), ':', 2)::uuid)
  )
);

drop policy if exists secret_millionaire_realtime_write on realtime.messages;
create policy secret_millionaire_realtime_write
on realtime.messages
for insert
to authenticated
with check (
  split_part((select realtime.topic()), ':', 1) = 'game'
  and (
    public.is_game_host(split_part((select realtime.topic()), ':', 2)::uuid)
    or public.is_approved_game_member(split_part((select realtime.topic()), ':', 2)::uuid)
  )
);

-- Postgres Changes für ein einziges, bewusst informationsarmes Refresh-Signal.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_game_updates'
  ) then
    alter publication supabase_realtime add table public.live_game_updates;
  end if;
end
$$;

revoke all on function public.create_unique_live_join_code() from public;
revoke all on function public.create_live_game(text, text) from public;
revoke all on function public.lookup_live_game(text) from public;
revoke all on function public.join_or_resume_live_game(text, text, text, text) from public;
revoke all on function public.resume_live_host(text, text) from public;
revoke all on function public.update_own_player_progress(uuid, text, text, public.game_phase, boolean, boolean, boolean, boolean, boolean, boolean) from public;
revoke all on function public.get_host_player_progress(uuid) from public;
revoke all on function public.set_live_game_phase(uuid, smallint, public.game_phase, bigint) from public;
revoke all on function public.select_live_round_mission(uuid, smallint, text, text, text, text, text) from public;
revoke all on function public.select_live_challenge(uuid, smallint, text, text, text, text, text, text, jsonb, text, text) from public;
revoke all on function public.draw_live_challenge_teams(uuid, smallint) from public;
revoke all on function public.confirm_live_challenge_winner(uuid, smallint, public.challenge_team_code) from public;
revoke all on function public.mark_own_role_revealed(uuid) from public;
revoke all on function public.submit_live_vote(uuid, uuid) from public;
revoke all on function public.get_live_private_state(uuid) from public;

grant execute on function public.create_live_game(text, text) to authenticated;
grant execute on function public.lookup_live_game(text) to authenticated;
grant execute on function public.join_or_resume_live_game(text, text, text, text) to authenticated;
grant execute on function public.resume_live_host(text, text) to authenticated;
grant execute on function public.update_own_player_progress(uuid, text, text, public.game_phase, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.get_host_player_progress(uuid) to authenticated;
grant execute on function public.set_live_game_phase(uuid, smallint, public.game_phase, bigint) to authenticated;
grant execute on function public.select_live_round_mission(uuid, smallint, text, text, text, text, text) to authenticated;
grant execute on function public.select_live_challenge(uuid, smallint, text, text, text, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.draw_live_challenge_teams(uuid, smallint) to authenticated;
grant execute on function public.confirm_live_challenge_winner(uuid, smallint, public.challenge_team_code) to authenticated;
grant execute on function public.mark_own_role_revealed(uuid) to authenticated;
grant execute on function public.submit_live_vote(uuid, uuid) to authenticated;
grant execute on function public.get_live_private_state(uuid) to authenticated;

grant select on public.live_game_updates to authenticated;
grant select on public.round_mission_selections to authenticated;
grant select, insert, update on public.player_progress to authenticated;

comment on table public.player_progress is
  'Persistenter, nicht-geheimer Fortschrittsmonitor für die Spielleitung. Presence ergänzt den Online-Status.';

comment on table public.round_mission_selections is
  'Vorab ausgewählte Mission pro Runde. Sichtbar für Host und erst nach Freigabe für den aktuellen Millionär.';

comment on function public.join_or_resume_live_game(text, text, text, text) is
  'Erstellt ein neues persönliches Profil oder bindet nach korrekter PIN ein bestehendes Profil an die aktuelle Gerätesitzung.';
