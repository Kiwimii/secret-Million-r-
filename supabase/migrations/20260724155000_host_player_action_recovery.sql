-- Sichere Notfallaktionen für André, wenn ein Spielergerät nicht weiterkommt.
-- Reine Anzeige-Schritte werden nur als erledigt markiert. Entscheidungen wie
-- Abstimmung und Korkenweitergabe werden mit einer konkreten Auswahl gespeichert.

create or replace function public.host_complete_player_step(
  target_game_id uuid,
  target_member_id uuid,
  requested_step text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_phase public.game_phase;
  active_round smallint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf einen technischen Schritt manuell abschließen.' using errcode = '42501';
  end if;

  if requested_step not in ('role', 'mission', 'advantage', 'challenge') then
    raise exception 'Dieser Schritt benötigt eine konkrete Spielerentscheidung und kann nicht nur abgehakt werden.';
  end if;

  select g.phase, g.current_round
    into active_phase, active_round
  from public.games g
  where g.id = target_game_id;

  if active_phase is null then
    raise exception 'Partie nicht gefunden.';
  end if;

  if not exists (
    select 1 from public.game_members gm
    where gm.id = target_member_id
      and gm.game_id = target_game_id
      and gm.approved_at is not null
  ) then
    raise exception 'Spieler nicht gefunden.';
  end if;

  if requested_step = 'role' then
    update public.round_roles
    set revealed_at = coalesce(revealed_at, now())
    where game_id = target_game_id
      and round_number = active_round
      and member_id = target_member_id;
    if not found then
      raise exception 'Für diesen Spieler ist in der aktuellen Runde keine Rolle hinterlegt.';
    end if;
  end if;

  insert into public.player_progress (game_id, member_id, screen_key, step_key, phase_seen)
  values (
    target_game_id,
    target_member_id,
    'host_override',
    'host_completed_' || requested_step,
    active_phase
  )
  on conflict (game_id, member_id)
  do update set
    screen_key = 'host_override',
    step_key = 'host_completed_' || requested_step,
    phase_seen = active_phase,
    role_revealed = case when requested_step = 'role' then true else player_progress.role_revealed end,
    mission_opened = case when requested_step = 'mission' then true else player_progress.mission_opened end,
    advantage_opened = case when requested_step = 'advantage' then true else player_progress.advantage_opened end,
    challenge_briefing_opened = case when requested_step = 'challenge' then true else player_progress.challenge_briefing_opened end,
    updated_at = now(),
    last_seen_at = now();

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  select
    target_game_id,
    auth.uid(),
    'host_completed_player_step',
    jsonb_build_object(
      'member_id', target_member_id,
      'step', requested_step,
      'round', active_round,
      'phase', active_phase
    ),
    g.revision
  from public.games g
  where g.id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_progress_override');
end;
$$;

create or replace function public.host_submit_player_vote(
  target_game_id uuid,
  target_voter_member_id uuid,
  target_accused_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf im Notfall eine Stimme für einen Spieler abgeben.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if active_phase <> 'voting' then
    raise exception 'Eine Ersatzstimme kann nur während der Abstimmung abgegeben werden.';
  end if;

  if not exists (
    select 1 from public.game_members gm
    where gm.game_id = target_game_id
      and gm.id = target_voter_member_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status <> 'disqualified'
  ) then
    raise exception 'Dieser Spieler ist aktuell nicht stimmberechtigt.';
  end if;

  if not exists (
    select 1 from public.game_members gm
    where gm.game_id = target_game_id
      and gm.id = target_accused_member_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
  ) then
    raise exception 'Das gewählte Abstimmungsziel ist nicht verfügbar.';
  end if;

  insert into public.votes (
    game_id,
    round_number,
    voter_member_id,
    accused_member_id,
    stage,
    is_valid,
    submitted_at
  ) values (
    target_game_id,
    active_round,
    target_voter_member_id,
    target_accused_member_id,
    'main',
    true,
    now()
  )
  on conflict (game_id, round_number, voter_member_id, stage)
  do update set
    accused_member_id = excluded.accused_member_id,
    is_valid = true,
    submitted_at = now();

  update public.player_progress
  set vote_submitted = true,
      screen_key = 'vote',
      step_key = 'host_submitted_vote',
      phase_seen = active_phase,
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = target_voter_member_id;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  select
    target_game_id,
    auth.uid(),
    'host_submitted_player_vote',
    jsonb_build_object(
      'round', active_round,
      'voter_member_id', target_voter_member_id,
      'accused_member_id', target_accused_member_id
    ),
    g.revision
  from public.games g
  where g.id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_submitted_player_vote');
end;
$$;

create or replace function public.host_submit_cork_decision(
  target_game_id uuid,
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
  millionaire_id uuid;
  selected_target uuid;
  decision_value public.role_decision_type;
  transition jsonb;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Korkenentscheidung im Notfall übernehmen.' using errcode = '42501';
  end if;

  select g.current_round, g.phase, g.millionaire_member_id
    into active_round, active_phase, millionaire_id
  from public.games g
  where g.id = target_game_id
  for update;

  if active_phase <> 'role_transfer' or active_round >= 4 then
    raise exception 'Aktuell ist keine Korkenentscheidung offen.';
  end if;

  if requested_decision not in ('keep', 'release') then
    raise exception 'Wähle Millionär bleiben oder zufällig weitergeben.';
  end if;

  if not exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id
      and rr.round_number = active_round
      and rr.millionaire_member_id = millionaire_id
      and rr.millionaire_survived
  ) then
    raise exception 'Der aktuelle Millionär hat diese Runde nicht überlebt oder das Ergebnis fehlt.';
  end if;

  if requested_decision = 'keep' then
    selected_target := millionaire_id;
    decision_value := 'keep';
  else
    select gm.id
      into selected_target
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
      and gm.id <> millionaire_id
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
    millionaire_id,
    decision_value,
    selected_target,
    now(),
    case when decision_value = 'keep' then now() else null end,
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
      screen_key = 'role_transfer',
      step_key = 'host_submitted_cork_decision',
      phase_seen = active_phase,
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = millionaire_id;

  transition := public.start_live_next_round(target_game_id, active_round);

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  select
    target_game_id,
    auth.uid(),
    'host_submitted_cork_decision',
    jsonb_build_object(
      'round', active_round,
      'millionaire_member_id', millionaire_id,
      'decision', requested_decision,
      'target_member_id', selected_target
    ),
    g.revision
  from public.games g
  where g.id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_submitted_cork_decision');

  return jsonb_build_object(
    'decision', requested_decision,
    'targetMemberId', selected_target,
    'transition', transition
  );
end;
$$;

revoke all on function public.host_complete_player_step(uuid, uuid, text) from public;
revoke all on function public.host_submit_player_vote(uuid, uuid, uuid) from public;
revoke all on function public.host_submit_cork_decision(uuid, text) from public;

grant execute on function public.host_complete_player_step(uuid, uuid, text) to authenticated;
grant execute on function public.host_submit_player_vote(uuid, uuid, uuid) to authenticated;
grant execute on function public.host_submit_cork_decision(uuid, text) to authenticated;

comment on function public.host_submit_player_vote(uuid, uuid, uuid) is
  'Notfallfunktion: André speichert während der Abstimmung eine konkrete Stimme im Namen eines blockierten Spielers.';
comment on function public.host_submit_cork_decision(uuid, text) is
  'Notfallfunktion: André übernimmt die offene Korkenentscheidung des überlebenden Millionärs.';
