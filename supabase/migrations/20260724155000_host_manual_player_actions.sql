-- André kann blockierte Spieleraktionen technisch abschließen.
-- Die bestehende Rollen-, Punkte- und Abstimmungslogik bleibt unverändert.

create or replace function public.host_submit_live_cork_decision(
  target_game_id uuid,
  target_member_id uuid,
  requested_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  current_millionaire uuid;
  selected_target uuid;
  decision_value public.role_decision_type;
  transition jsonb;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf eine blockierte Korkenentscheidung übernehmen.' using errcode = '42501';
  end if;

  select g.current_round, g.phase, g.millionaire_member_id
    into active_round, active_phase, current_millionaire
  from public.games g
  where g.id = target_game_id
  for update;

  if active_phase <> 'role_transfer' or active_round not between 1 and 3 then
    raise exception 'Aktuell ist keine Korkenentscheidung offen.';
  end if;
  if target_member_id is distinct from current_millionaire then
    raise exception 'Nur die Entscheidung des aktuellen Millionärs kann übernommen werden.';
  end if;
  if not exists (
    select 1
    from public.round_results rr
    where rr.game_id = target_game_id
      and rr.round_number = active_round
      and rr.millionaire_member_id = target_member_id
      and rr.millionaire_survived
  ) then
    raise exception 'Der aktuelle Millionär hat diese Runde nicht überlebt oder das Ergebnis fehlt.';
  end if;
  if requested_decision not in ('keep', 'release') then
    raise exception 'Wähle Millionär bleiben oder zufällig weitergeben.';
  end if;

  if requested_decision = 'keep' then
    selected_target := target_member_id;
    decision_value := 'keep';
  else
    select gm.id
      into selected_target
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
      and gm.id <> target_member_id
    order by gen_random_uuid()
    limit 1;

    if selected_target is null then
      raise exception 'Es ist keine andere gewinnberechtigte Person für die zufällige Weitergabe verfügbar.';
    end if;
    decision_value := 'release';
  end if;

  insert into public.role_decisions (
    game_id,
    after_round,
    member_id,
    decision,
    target_member_id,
    submitted_at,
    host_confirmed_at,
    rejected_target_ids
  ) values (
    target_game_id,
    active_round,
    target_member_id,
    decision_value,
    selected_target,
    now(),
    case when requested_decision = 'keep' then now() else null end,
    '{}'::uuid[]
  )
  on conflict (game_id, after_round, member_id)
  do update set
    decision = excluded.decision,
    target_member_id = excluded.target_member_id,
    submitted_at = now(),
    host_confirmed_at = excluded.host_confirmed_at,
    rejected_target_ids = '{}'::uuid[];

  update public.player_progress
  set role_decision_submitted = true,
      screen_key = 'host_override',
      step_key = 'host_submitted_cork_decision',
      phase_seen = active_phase,
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = target_member_id;

  if requested_decision = 'keep' then
    transition := public.start_live_next_round(target_game_id, active_round);
  else
    transition := jsonb_build_object(
      'advanced', false,
      'nextRound', active_round + 1,
      'reason', 'candidate_confirmation_required'
    );
  end if;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  select
    target_game_id,
    auth.uid(),
    'host_completed_player_action',
    jsonb_build_object(
      'member_id', target_member_id,
      'action', 'role_decision',
      'decision', requested_decision
    ),
    g.revision
  from public.games g
  where g.id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_completed_role_decision');

  return jsonb_build_object(
    'decision', requested_decision,
    'targetMemberId', selected_target,
    'randomTransfer', requested_decision = 'release',
    'transition', transition
  );
end;
$$;

revoke all on function public.host_submit_live_cork_decision(uuid, uuid, text) from public;
grant execute on function public.host_submit_live_cork_decision(uuid, uuid, text) to authenticated;

comment on function public.host_submit_live_cork_decision(uuid, uuid, text) is
  'Notfallfunktion: André übernimmt die offene Korkenentscheidung des aktuellen Millionärs.';
