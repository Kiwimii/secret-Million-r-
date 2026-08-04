-- Secret Millionär V2: dauerhaftes Dashboard, flexible Runden, Benachrichtigungen
-- und serverseitig verbindliche Mehrgeräte-Partien.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.meta_games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  join_code text not null unique check (join_code ~ '^[0-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete restrict,
  host_pin_hash text not null,
  total_rounds smallint not null check (total_rounds between 2 and 8),
  current_round smallint not null default 1,
  phase text not null default 'lobby' check (phase in (
    'lobby','round_setup','role_released','mission','challenge','mission_review',
    'voting_open','reveal_ready','report','role_decision','finished'
  )),
  final_rule text not null default 'classic' check (final_rule in ('classic','points')),
  notes_visibility text not null default 'host' check (notes_visibility in ('host','private')),
  accepting_players boolean not null default true,
  revision bigint not null default 1,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_round between 1 and total_rounds)
);

create table if not exists public.meta_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.meta_games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  display_name citext not null,
  pin_hash text not null,
  avatar_path text,
  joined_round smallint not null,
  active_from_round smallint not null,
  attendance_status text not null default 'present' check (attendance_status in ('present','temporarily_absent','departed')),
  competition_status text not null default 'eligible' check (competition_status in ('eligible','eliminated','disqualified')),
  eliminated_round smallint,
  departed_round smallint,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, display_name),
  unique (game_id, user_id)
);

create table if not exists public.meta_vote_drafts (
  game_id uuid not null references public.meta_games(id) on delete cascade,
  round_number smallint not null,
  member_id uuid not null references public.meta_members(id) on delete cascade,
  target_member_id uuid not null references public.meta_members(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (game_id, round_number, member_id)
);

create table if not exists public.meta_votes (
  game_id uuid not null references public.meta_games(id) on delete cascade,
  round_number smallint not null,
  member_id uuid not null references public.meta_members(id) on delete cascade,
  target_member_id uuid not null references public.meta_members(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (game_id, round_number, member_id)
);

create table if not exists public.meta_scores (
  game_id uuid not null references public.meta_games(id) on delete cascade,
  round_number smallint not null,
  member_id uuid not null references public.meta_members(id) on delete cascade,
  points_awarded integer not null default 0,
  correct_guess boolean not null default false,
  reason text not null default 'no_points',
  created_at timestamptz not null default now(),
  primary key (game_id, round_number, member_id)
);

create table if not exists public.meta_notes (
  game_id uuid not null references public.meta_games(id) on delete cascade,
  author_member_id uuid not null references public.meta_members(id) on delete cascade,
  subject_member_id uuid not null references public.meta_members(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (game_id, author_member_id, subject_member_id),
  check (author_member_id <> subject_member_id)
);

create table if not exists public.meta_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.meta_games(id) on delete cascade,
  round_number smallint,
  visibility text not null default 'public' check (visibility in ('public','host','member')),
  target_member_id uuid references public.meta_members(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info','important','critical')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.meta_event_reads (
  event_id bigint not null references public.meta_events(id) on delete cascade,
  member_id uuid not null references public.meta_members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create table if not exists public.meta_game_updates (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.meta_games(id) on delete cascade,
  revision bigint not null,
  update_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists meta_members_game_idx on public.meta_members(game_id);
create index if not exists meta_votes_game_round_idx on public.meta_votes(game_id, round_number);
create index if not exists meta_scores_game_member_idx on public.meta_scores(game_id, member_id);
create index if not exists meta_events_game_created_idx on public.meta_events(game_id, created_at desc);
create index if not exists meta_updates_game_idx on public.meta_game_updates(game_id, id desc);

alter table public.meta_games enable row level security;
alter table public.meta_members enable row level security;
alter table public.meta_vote_drafts enable row level security;
alter table public.meta_votes enable row level security;
alter table public.meta_scores enable row level security;
alter table public.meta_notes enable row level security;
alter table public.meta_events enable row level security;
alter table public.meta_event_reads enable row level security;
alter table public.meta_game_updates enable row level security;

create or replace function public.meta_is_host(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.meta_games g
    where g.id = target_game_id and g.host_user_id = auth.uid()
  );
$$;

create or replace function public.meta_current_member_id(target_game_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.meta_members m
  where m.game_id = target_game_id and m.user_id = auth.uid()
  limit 1;
$$;

create policy meta_updates_participant_read on public.meta_game_updates
for select to authenticated
using (
  public.meta_is_host(game_id)
  or public.meta_current_member_id(game_id) is not null
);

create or replace function public.meta_normalize_code(raw_code text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(raw_code, ''), '[^0-9]', '', 'g');
$$;

create or replace function public.meta_new_join_code()
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
    exit when not exists (select 1 from public.meta_games where join_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.meta_emit_event(
  target_game_id uuid,
  target_round smallint,
  event_visibility text,
  target_member uuid,
  event_name text,
  event_title text,
  event_body text,
  event_severity text default 'info',
  event_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id bigint;
begin
  insert into public.meta_events (
    game_id, round_number, visibility, target_member_id,
    event_type, title, body, severity, payload
  ) values (
    target_game_id, target_round, event_visibility, target_member,
    event_name, event_title, event_body, event_severity, coalesce(event_payload, '{}'::jsonb)
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.meta_bump_revision(target_game_id uuid, update_name text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_revision bigint;
begin
  update public.meta_games
  set revision = revision + 1, updated_at = now()
  where id = target_game_id
  returning revision into next_revision;

  insert into public.meta_game_updates(game_id, revision, update_type)
  values (target_game_id, next_revision, update_name);
  return next_revision;
end;
$$;

create or replace function public.meta_round_path(round_number smallint, field_name text)
returns text[]
language sql
immutable
as $$
  select array['rounds', round_number::text, field_name];
$$;

create or replace function public.meta_tally_add(
  tally jsonb,
  target_member uuid,
  regular_delta integer,
  adjustment_delta integer
)
returns jsonb
language plpgsql
immutable
as $$
declare
  entry jsonb;
  regular_value integer;
  adjustment_value integer;
begin
  if target_member is null or not (tally ? target_member::text) then
    return tally;
  end if;
  entry := tally -> target_member::text;
  regular_value := coalesce((entry ->> 'regularVotes')::integer, 0) + regular_delta;
  adjustment_value := coalesce((entry ->> 'adjustment')::integer, 0) + adjustment_delta;
  entry := jsonb_set(entry, '{regularVotes}', to_jsonb(regular_value), true);
  entry := jsonb_set(entry, '{adjustment}', to_jsonb(adjustment_value), true);
  return jsonb_set(tally, array[target_member::text], entry, true);
end;
$$;

create or replace function public.meta_create_game(
  game_title text,
  host_pin text,
  requested_rounds integer,
  requested_final_rule text default 'classic',
  requested_notes_visibility text default 'host'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.meta_games%rowtype;
  rounds jsonb;
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;
  if host_pin !~ '^[0-9]{4}$' then
    raise exception 'Die Spielleiter-PIN muss genau vier Ziffern enthalten.';
  end if;
  if requested_rounds not between 2 and 8 then
    raise exception 'Es sind zwischen 2 und 8 Runden möglich.';
  end if;
  if requested_final_rule not in ('classic','points') then
    raise exception 'Ungültige Finalregel.';
  end if;
  if requested_notes_visibility not in ('host','private') then
    raise exception 'Ungültiger Notizmodus.';
  end if;

  select jsonb_object_agg(
    n::text,
    jsonb_build_object(
      'number', n,
      'points', n,
      'roleReleased', false,
      'missionPublished', false,
      'missionStatus', 'pending',
      'challengePublished', false,
      'resultPublished', false
    )
  ) into rounds
  from generate_series(1, requested_rounds) n;

  insert into public.meta_games (
    title, join_code, host_user_id, host_pin_hash, total_rounds,
    current_round, phase, final_rule, notes_visibility, accepting_players, state
  ) values (
    coalesce(nullif(btrim(game_title), ''), 'Secret Millionär'),
    public.meta_new_join_code(), auth.uid(), crypt(host_pin, gen_salt('bf', 10)),
    requested_rounds, 1, 'lobby', requested_final_rule, requested_notes_visibility, true,
    jsonb_build_object('rounds', rounds)
  ) returning * into created;

  perform public.meta_emit_event(
    created.id, 1, 'host', null, 'game_created', 'Partie erstellt',
    'Lege die erste Runde fest und öffne anschließend die Rollen.', 'important', '{}'::jsonb
  );
  insert into public.meta_game_updates(game_id, revision, update_type)
  values (created.id, created.revision, 'game_created');

  return jsonb_build_object(
    'game_id', created.id,
    'join_code', created.join_code
  );
end;
$$;

create or replace function public.meta_join_game(
  raw_join_code text,
  requested_name text,
  player_pin text,
  requested_avatar_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.meta_normalize_code(raw_join_code);
  normalized_name text := regexp_replace(btrim(coalesce(requested_name, '')), '\s+', ' ', 'g');
  game_row public.meta_games%rowtype;
  member_row public.meta_members%rowtype;
  active_round integer;
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;
  if normalized_code !~ '^[0-9]{6}$' then
    raise exception 'Der Zugangscode muss sechs Ziffern enthalten.';
  end if;
  if length(normalized_name) not between 2 and 28 then
    raise exception 'Der Spielername muss zwischen 2 und 28 Zeichen lang sein.';
  end if;
  if player_pin !~ '^[0-9]{4}$' then
    raise exception 'Die Spieler-PIN muss genau vier Ziffern enthalten.';
  end if;

  select * into game_row
  from public.meta_games
  where join_code = normalized_code
  for update;
  if not found then raise exception 'Unter diesem Code existiert keine Partie.'; end if;

  select * into member_row
  from public.meta_members
  where game_id = game_row.id and lower(display_name::text) = lower(normalized_name)
  for update;

  if found then
    if crypt(player_pin, member_row.pin_hash) <> member_row.pin_hash then
      raise exception 'Name gefunden, PIN falsch.' using errcode = '42501';
    end if;
    update public.meta_members
    set user_id = auth.uid(),
        avatar_path = coalesce(requested_avatar_path, avatar_path),
        last_seen_at = now(), updated_at = now()
    where id = member_row.id
    returning * into member_row;
  else
    if not game_row.accepting_players or game_row.phase = 'finished' then
      raise exception 'Die Spielleitung hat den Beitritt geschlossen.';
    end if;
    if exists (
      select 1 from public.meta_members
      where game_id = game_row.id and user_id = auth.uid()
    ) then
      raise exception 'Dieses Gerät ist bereits einem anderen Profil zugeordnet.';
    end if;

    active_round := case
      when game_row.phase in ('lobby','round_setup','role_released','mission','challenge','mission_review')
        then game_row.current_round
      else game_row.current_round + 1
    end;

    insert into public.meta_members (
      game_id, user_id, display_name, pin_hash, avatar_path,
      joined_round, active_from_round
    ) values (
      game_row.id, auth.uid(), normalized_name, crypt(player_pin, gen_salt('bf', 10)),
      requested_avatar_path, game_row.current_round, active_round
    ) returning * into member_row;

    perform public.meta_emit_event(
      game_row.id, game_row.current_round, 'public', null, 'member_joined',
      'Neuer Teilnehmer', normalized_name || ' ist der Partie beigetreten.', 'info',
      jsonb_build_object('memberId', member_row.id)
    );
    perform public.meta_bump_revision(game_row.id, 'member_joined');
  end if;

  return jsonb_build_object(
    'game_id', game_row.id,
    'join_code', game_row.join_code,
    'member_id', member_row.id
  );
end;
$$;

create or replace function public.meta_resume_host(raw_join_code text, host_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.meta_normalize_code(raw_join_code);
  game_row public.meta_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Gerätesitzung fehlt.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where join_code = normalized_code for update;
  if not found then raise exception 'Partie nicht gefunden.'; end if;
  if crypt(host_pin, game_row.host_pin_hash) <> game_row.host_pin_hash then
    raise exception 'Spielleiter-PIN falsch.' using errcode = '42501';
  end if;
  update public.meta_games set host_user_id = auth.uid(), updated_at = now() where id = game_row.id;
  return jsonb_build_object('game_id', game_row.id, 'join_code', game_row.join_code);
end;
$$;
