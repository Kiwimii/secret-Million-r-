-- Behebt die Kollision zwischen den RETURNS-TABLE-Ausgabevariablen game_id/member_id
-- und den gleichnamigen Spalten im ON-CONFLICT-Ausdruck.

create or replace function public.resume_live_player_by_member(
  raw_join_code text,
  target_member_id uuid,
  player_pin text
)
returns table (
  game_id uuid,
  member_id uuid,
  display_name citext,
  resumed boolean
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
#variable_conflict use_column
declare
  normalized_code text := public.normalize_live_join_code(raw_join_code);
  target_game public.games%rowtype;
  target_member public.game_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;

  if normalized_code !~ '^[0-9]{6}$' then
    raise exception 'Der Sitzungscode muss genau sechs Ziffern enthalten.';
  end if;

  if player_pin !~ '^[0-9]{4}$' then
    raise exception 'Die Profil-PIN muss genau vier Ziffern enthalten.';
  end if;

  select g.* into target_game
  from public.games g
  where g.join_code = normalized_code
  for update;

  if not found then
    raise exception 'Unter diesem Sitzungscode wurde keine laufende Partie gefunden.';
  end if;

  select gm.* into target_member
  from public.game_members gm
  where gm.game_id = target_game.id
    and gm.id = target_member_id
    and gm.approved_at is not null
  for update;

  if not found then
    raise exception 'Das ausgewählte Profil gehört nicht zu dieser Partie.' using errcode = '42501';
  end if;

  if target_member.pin_hash is null
     or crypt(player_pin, target_member.pin_hash) <> target_member.pin_hash then
    raise exception 'Die Profil-PIN ist falsch.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.game_members gm
    where gm.game_id = target_game.id
      and gm.user_id = auth.uid()
      and gm.id <> target_member.id
  ) then
    raise exception 'Dieses Gerät ist bereits mit einem anderen Profil dieser Partie verbunden.' using errcode = '42501';
  end if;

  update public.game_members gm
  set user_id = auth.uid(),
      attendance_status = 'present',
      approved_at = coalesce(gm.approved_at, now()),
      profile_completed_at = coalesce(gm.profile_completed_at, now()),
      updated_at = now()
  where gm.id = target_member.id;

  insert into public.player_progress (
    game_id,
    member_id,
    screen_key,
    step_key,
    phase_seen,
    last_seen_at,
    updated_at
  ) values (
    target_game.id,
    target_member.id,
    'rejoin',
    'profile_resumed_from_picker',
    target_game.phase,
    now(),
    now()
  )
  on conflict on constraint player_progress_game_id_member_id_key
  do update set
    screen_key = excluded.screen_key,
    step_key = excluded.step_key,
    phase_seen = excluded.phase_seen,
    last_seen_at = now(),
    updated_at = now();

  insert into public.live_game_updates (game_id, update_type)
  values (target_game.id, 'member_resumed_from_picker');

  return query
  select target_game.id, target_member.id, target_member.display_name, true;
end;
$$;

revoke all on function public.resume_live_player_by_member(text, uuid, text) from public;
grant execute on function public.resume_live_player_by_member(text, uuid, text) to authenticated;
