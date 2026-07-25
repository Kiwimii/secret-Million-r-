-- Notfallsteuerung für einzelne blockierte Spieler.
-- André kann technische Pflichtschritte bestätigen und bei Bedarf eine fehlende
-- Abstimmung oder Korkenentscheidung verbindlich im Namen des Spielers ausführen.

create or replace function public.host_rescue_player_action(
  target_game_id uuid,
  target_member_id uuid,
  requested_action text,
  requested_target_member_id uuid default null,
  requested_decision text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  active_millionaire uuid;
  selected_target uuid;
  decision_value public.role_decision_type;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf Spieler im Notfall manuell weiterführen.' using errcode = '42501';
  end if;

  select g.current_round, g.phase, g.millionaire_member_id
    into active_round, active_phase, active_millionaire
  from public.games g
  where g.id = target_game_id
  for update;

  if not exists (
    select 1 from public.game_members gm
    where gm.id = target_member_id
      and gm.game_id = target_game_id
      and gm.approved_at is not null
  ) then
    raise exception 'Spieler nicht gefunden.';
  end if;

  if requested_action = 'role' then
    update public.round_roles
    set revealed_at = coalesce(revealed_at, now())
    where game_id = target_game_id
      and round_number = active_round
      and member_id = target_member_id;

    update public.player_progress
    set role_revealed = true,
        screen_key = 'role_reveal',
        step_key = 'host_confirmed_role',
        phase_seen = active_phase,
        last_seen_at = now(),
        updated_at = now()
    where game_id = target_game_id and member_id = target_member_id;

  elsif requested_action = 'mission' then
    update public.player_progress
    set mission_opened = true,
        screen_key = 'mission',
        step_key = 'host_confirmed_mission',
        phase_seen = active_phase,
        last_seen_at = now(),
        updated_at = now()
    where game_id = target_game_id and member_id = target_member_id;

  elsif requested_action = 'challenge' then
    update public.player_progress
    set challenge_briefing_opened = true,
        screen_key = 'challenge',
        step_key = 'host_confirmed_challenge',
        phase_seen = active_phase,
        last_seen_at = now(),
        updated_at = now()
    where game_id = target_game_id and member_id = target_member_id;

  elsif requested_action = 'advantage' then
    update public.player_progress
    set advantage_opened = true,
        screen_key = 'advantage',
        step_key = 'host_confirmed_advantage',
        phase_seen = active_phase,
        last_seen_at = now(),
        updated_at = now()
    where game_id = target_game_id and member_id = target_member_id;

  elsif requested_action = 'vote' then
    if active_phase not in ('voting', 'evaluation') then
      raise exception 'Eine Ersatzstimme ist nur während Abstimmung oder Auswertung möglich.';
    end if;
    if requested_target_member_id is null then
      raise exception 'Für die Ersatzstimme muss André ein Abstimmungsziel auswählen.';
    end if;
    if not exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game_id
        and gm.id = requested_target_member_id
        and gm.approved_at is not null
        and gm.attendance_status = 'present'
        and gm.winner_pool_status = 'eligible'
    ) then
      raise exception 'Das gewählte Abstimmungsziel ist nicht verfügbar.';
    end if;

    insert into public.votes (
      game_id, round_number, voter_member_id, accused_member_id,
      stage, submitted_at, is_valid
    ) values (
      target_game_id, active_round, target_member_id, requested_target_member_id,
      'main', now(), true
    )
    on conflict (game_id, round_number, stage, voter_member_id)
    do update set
      accused_member_id = excluded.accused_member_id,
      submitted_at = now(),
      is_valid = true;

    update public.player_progress
    set vote_submitted = true,
        screen_key = 'voting',
        step_key = 'host_submitted_vote',
        phase_seen = active_phase,
        last_seen_at = now(),
        updated_at = now()
    where game_id = target_game_id and member_id = target_member_id;

  elsif requested_action = 'role_decision' then
    if active_phase <> 'role_transfer' or active_round >= 4 then
      raise exception 'Eine Korkenentscheidung ist aktuell nicht offen.';
    end if;
    if target_member_id is distinct from active_millionaire then
      raise exception 'Nur für den aktuellen Millionär kann eine Korkenentscheidung ersetzt werden.';
    end if;
    if requested_decision not in ('keep', 'release') then
      raise exception 'Wähle Millionär bleiben oder zufällig weitergeben.';
    end if;

    if requested_decision = 'keep' then
      selected_target := target_member_id;
      decision_value := 'keep';
    else
      select gm.id into selected_target
      from public.game_members gm
      where gm.game_id = target_game_id
        and gm.approved_at is not null
        and gm.attendance_status = 'present'
        and gm.winner_pool_status = 'eligible'
        and gm.id <> target_member_id
      order by gen_random_uuid()
      limit 1;
      if selected_target is null then
        raise exception 'Für die Weitergabe ist kein anderer zulässiger Spieler verfügbar.';
      end if;
      decision_value := 'release';
    end if;

    insert into public.role_decisions (
      game_id, after_round, member_id, decision, target_member_id, submitted_at
    ) values (
      target_game_id, active_round, target_member_id, decision_value, selected_target, now()
    )
    on conflict (game_id, after_round, member_id)
    do update set
      decision = excluded.decision,
      target_member_id = excluded.target_member_id,
      submitted_at = now();

    update public.player_progress
    set role_decision_submitted = true,
        screen_key = 'role_transfer',
        step_key = 'host_submitted_role_decision',
        phase_seen = active_phase,
        last_seen_at = now(),
        updated_at = now()
    where game_id = target_game_id and member_id = target_member_id;

  else
    raise exception 'Unbekannte Notfallaktion.';
  end if;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  select
    target_game_id,
    auth.uid(),
    'host_rescued_player_action',
    jsonb_build_object(
      'round', active_round,
      'member_id', target_member_id,
      'action', requested_action,
      'target_member_id', requested_target_member_id,
      'decision', requested_decision
    ),
    g.revision
  from public.games g
  where g.id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_rescued_player_action');

  return jsonb_build_object(
    'success', true,
    'action', requested_action,
    'memberId', target_member_id,
    'selectedTargetMemberId', selected_target
  );
end;
$$;

revoke all on function public.host_rescue_player_action(uuid, uuid, text, uuid, text) from public;
grant execute on function public.host_rescue_player_action(uuid, uuid, text, uuid, text) to authenticated;
