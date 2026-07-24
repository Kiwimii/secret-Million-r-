-- Die RETURNS TABLE-Ausgabespalten game_id und member_id sind in PL/pgSQL
-- zugleich Variablen. Benannte Constraints verhindern, dass PostgreSQL die
-- ON-CONFLICT-Spalten als mehrdeutige Variablen interpretiert.

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
set search_path = public, extensions
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
    extensions.crypt(host_pin, extensions.gen_salt('bf', 10)),
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
  on conflict on constraint rounds_game_id_round_number_key do nothing;

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
set search_path = public, extensions
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
  from public.games g
  where g.join_code = normalized_code
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
       or extensions.crypt(player_pin, existing_member.pin_hash) <> existing_member.pin_hash then
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

    update public.game_members gm
    set user_id = auth.uid(),
        avatar_path = coalesce(requested_avatar_path, gm.avatar_path),
        attendance_status = 'present',
        approved_at = coalesce(gm.approved_at, now()),
        profile_completed_at = coalesce(gm.profile_completed_at, now()),
        updated_at = now()
    where gm.id = existing_member.id
    returning gm.* into created_member;

    insert into public.player_progress (game_id, member_id, screen_key, step_key, phase_seen)
    values (target_game.id, created_member.id, 'lobby', 'profile_resumed', target_game.phase)
    on conflict on constraint player_progress_game_id_member_id_key
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
    extensions.crypt(player_pin, extensions.gen_salt('bf', 10)),
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
