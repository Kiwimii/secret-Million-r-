-- Härtet ausschließlich die Speicherung bereits abgelehnter Kandidaten.
-- Die Funktion aus der vorherigen Migration wird mit einer eindeutigen
-- Spaltenbenennung ersetzt, bevor sie produktiv genutzt wird.

create or replace function public.reroll_live_next_millionaire(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  decision_id uuid;
  decision_actor uuid;
  current_candidate uuid;
  decision_kind text;
  rejected_ids uuid[];
  excluded_ids uuid[];
  next_candidate uuid;
  next_candidate_name citext;
  next_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf den geheimen Nachfolger neu auslosen.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if active_phase <> 'role_transfer' or active_round not between 1 and 3 then
    raise exception 'Aktuell steht keine geheime Nachfolger-Auslosung bereit.';
  end if;

  select
    rd.id,
    rd.member_id,
    rd.target_member_id,
    rd.decision::text,
    coalesce(rd.rejected_target_ids, '{}'::uuid[])
    into decision_id, decision_actor, current_candidate, decision_kind, rejected_ids
  from public.role_decisions rd
  where rd.game_id = target_game_id
    and rd.after_round = active_round
    and rd.target_member_id is not null
  order by rd.submitted_at desc
  limit 1
  for update;

  if decision_id is null or decision_kind not in ('release', 'replacement') then
    raise exception 'Nur ein zufällig bestimmter neuer Millionär kann abgelehnt werden.';
  end if;

  excluded_ids := coalesce(rejected_ids, '{}'::uuid[])
    || array[current_candidate, decision_actor]::uuid[];

  select gm.id
    into next_candidate
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.approved_at is not null
    and gm.attendance_status = 'present'
    and gm.winner_pool_status = 'eligible'
    and not (gm.id = any(excluded_ids))
  order by gen_random_uuid()
  limit 1;

  if next_candidate is null then
    select gm.id
      into next_candidate
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
      and gm.id <> current_candidate
      and gm.id <> decision_actor
    order by gen_random_uuid()
    limit 1;
  end if;

  if next_candidate is null then
    raise exception 'Es steht keine weitere zulässige Person für eine neue Auslosung bereit.';
  end if;

  update public.role_decisions
  set target_member_id = next_candidate,
      rejected_target_ids = array(
        select distinct rejected.rejected_id
        from unnest(rejected_ids || array[current_candidate]::uuid[])
          as rejected(rejected_id)
      ),
      host_confirmed_at = null,
      submitted_at = now()
  where id = decision_id;

  select gm.display_name
    into next_candidate_name
  from public.game_members gm
  where gm.id = next_candidate;

  update public.games
  set revision = revision + 1,
      updated_at = now()
  where id = target_game_id
  returning revision into next_revision;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  values (
    target_game_id,
    auth.uid(),
    'next_millionaire_rerolled',
    jsonb_build_object(
      'after_round', active_round,
      'rejected_member_id', current_candidate,
      'new_candidate_member_id', next_candidate
    ),
    next_revision
  );

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'next_millionaire_rerolled');

  return jsonb_build_object(
    'candidateMemberId', next_candidate,
    'candidateDisplayName', next_candidate_name,
    'rejectedMemberId', current_candidate
  );
end;
$$;

revoke all on function public.reroll_live_next_millionaire(uuid) from public;
grant execute on function public.reroll_live_next_millionaire(uuid) to authenticated;
