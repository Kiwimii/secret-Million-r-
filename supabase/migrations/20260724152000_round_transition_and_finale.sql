-- Verbindlicher Übergang nach dem Rundenergebnis und öffentliches Finale.
-- Runde 1-3: Ergebnis -> Korkenentscheidung -> nächste Runde.
-- Runde 4: Millionär überlebt = direkter Sieg; Millionär enttarnt = höchster
-- Punktestand unter den noch gewinnberechtigten Personen gewinnt.

create table if not exists public.game_final_results (
  game_id uuid primary key references public.games(id) on delete cascade,
  winner_member_id uuid not null references public.game_members(id) on delete restrict,
  winner_reason text not null check (winner_reason in ('millionaire_survived', 'points_after_millionaire_exposed')),
  millionaire_member_id uuid not null references public.game_members(id) on delete restrict,
  millionaire_survived boolean not null,
  ranking jsonb not null,
  finalized_at timestamptz not null default now()
);

alter table public.game_final_results enable row level security;
revoke all on public.game_final_results from anon, authenticated;

create or replace function public.start_live_next_round(
  target_game_id uuid,
  completed_round smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  next_round smallint;
  next_millionaire uuid;
  next_revision bigint;
begin
  if completed_round not between 1 and 3 then
    raise exception 'Eine nächste Runde kann nur nach Runde 1 bis 3 gestartet werden.';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if active_round <> completed_round or active_phase <> 'role_transfer' then
    raise exception 'Die Partie befindet sich nicht in der Korkenentscheidung dieser Runde.';
  end if;

  select rd.target_member_id
    into next_millionaire
  from public.role_decisions rd
  where rd.game_id = target_game_id
    and rd.after_round = completed_round
    and rd.target_member_id is not null
  order by rd.submitted_at desc
  limit 1;

  if next_millionaire is null then
    raise exception 'Die Korkenentscheidung oder automatische Ersatz-Auslosung fehlt noch.';
  end if;

  next_round := completed_round + 1;

  if not exists (
    select 1 from public.round_mission_selections rms
    where rms.game_id = target_game_id and rms.round_number = next_round
  ) or not exists (
    select 1 from public.round_advantage_selections ras
    where ras.game_id = target_game_id and ras.round_number = next_round
  ) then
    return jsonb_build_object(
      'advanced', false,
      'nextRound', next_round,
      'reason', 'round_package_missing'
    );
  end if;

  if not exists (
    select 1 from public.game_members gm
    where gm.game_id = target_game_id
      and gm.id = next_millionaire
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
  ) then
    raise exception 'Der bestimmte nächste Millionär ist nicht mehr verfügbar oder gewinnberechtigt.';
  end if;

  insert into public.round_roles (game_id, round_number, member_id, role, revealed_at)
  select
    gm.game_id,
    next_round,
    gm.id,
    case
      when gm.id = next_millionaire then 'millionaire'::public.game_role
      when gm.attendance_status = 'present' and gm.winner_pool_status <> 'disqualified'
        then 'investigator'::public.game_role
      else 'none'::public.game_role
    end,
    null
  from public.game_members gm
  where gm.game_id = target_game_id and gm.approved_at is not null
  on conflict (game_id, round_number, member_id)
  do update set role = excluded.role, revealed_at = null;

  insert into public.mission_assignments (
    game_id, round_number, assigned_member_id, catalog_id, title_snapshot,
    task_snapshot, success_criteria_snapshot, time_window_snapshot,
    status, assigned_at, reviewed_at
  )
  select
    rms.game_id,
    rms.round_number,
    next_millionaire,
    rms.catalog_id,
    rms.title_snapshot,
    rms.task_snapshot,
    rms.success_criteria_snapshot,
    rms.time_window_snapshot,
    'assigned'::public.mission_status,
    now(),
    null
  from public.round_mission_selections rms
  where rms.game_id = target_game_id and rms.round_number = next_round
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

  perform public.assign_selected_advantage_to_millionaire(
    target_game_id,
    next_round,
    next_millionaire
  );

  update public.games
  set current_round = next_round,
      phase = 'role_reveal',
      millionaire_member_id = next_millionaire,
      revision = revision + 1,
      updated_at = now()
  where id = target_game_id
  returning revision into next_revision;

  update public.player_progress
  set role_revealed = false,
      mission_opened = false,
      advantage_opened = false,
      challenge_briefing_opened = false,
      vote_submitted = false,
      role_decision_submitted = false,
      screen_key = 'role_reveal',
      step_key = 'new_round_ready',
      phase_seen = 'role_reveal',
      updated_at = now()
  where game_id = target_game_id;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  values (
    target_game_id,
    auth.uid(),
    'next_round_started',
    jsonb_build_object(
      'completed_round', completed_round,
      'next_round', next_round,
      'millionaire_member_id', next_millionaire
    ),
    next_revision
  );

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'next_round_started');

  return jsonb_build_object(
    'advanced', true,
    'nextRound', next_round,
    'phase', 'role_reveal'
  );
end;
$$;

revoke all on function public.start_live_next_round(uuid, smallint) from public;

create or replace function public.submit_live_cork_decision(
  target_game_id uuid,
  requested_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  current_millionaire uuid;
  selected_target uuid;
  decision_value public.role_decision_type;
  transition jsonb;
begin
  select gm.id, g.current_round, g.phase, g.millionaire_member_id
    into own_member_id, active_round, active_phase, current_millionaire
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null or own_member_id is distinct from current_millionaire then
    raise exception 'Nur der überlebende Millionär entscheidet über den goldenen Korken.' using errcode = '42501';
  end if;
  if active_round >= 4 then
    raise exception 'Nach Runde 4 folgt direkt das Finale.';
  end if;
  if active_phase <> 'role_transfer' then
    raise exception 'Die Korkenentscheidung ist erst nach dem veröffentlichten Rundenergebnis möglich.';
  end if;
  if not exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id
      and rr.round_number = active_round
      and rr.millionaire_member_id = own_member_id
      and rr.millionaire_survived
  ) then
    raise exception 'Für dieses Profil ist keine Korkenentscheidung offen.';
  end if;
  if requested_decision not in ('keep', 'release') then
    raise exception 'Wähle Millionär bleiben oder zufällig weitergeben.';
  end if;

  if requested_decision = 'keep' then
    selected_target := own_member_id;
    decision_value := 'keep';
  else
    select gm.id
      into selected_target
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
      and gm.id <> own_member_id
    order by gen_random_uuid()
    limit 1;
    if selected_target is null then
      raise exception 'Es ist keine andere gewinnberechtigte Person für die zufällige Weitergabe verfügbar.';
    end if;
    decision_value := 'release';
  end if;

  insert into public.role_decisions (
    game_id, after_round, member_id, decision, target_member_id, submitted_at
  ) values (
    target_game_id, active_round, own_member_id, decision_value, selected_target, now()
  )
  on conflict (game_id, after_round, member_id)
  do update set
    decision = excluded.decision,
    target_member_id = excluded.target_member_id,
    submitted_at = now();

  update public.player_progress
  set role_decision_submitted = true,
      screen_key = 'role_transfer',
      step_key = 'cork_decision_submitted',
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = own_member_id;

  transition := public.start_live_next_round(target_game_id, active_round);

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'cork_decision_submitted');

  return jsonb_build_object(
    'decision', requested_decision,
    'randomTransfer', requested_decision = 'release',
    'transition', transition
  );
end;
$$;

create or replace function public.continue_live_after_round(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die nächste Runde manuell starten.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id;

  if active_phase <> 'role_transfer' or active_round >= 4 then
    raise exception 'Aktuell steht keine nächste Runde bereit.';
  end if;

  return public.start_live_next_round(target_game_id, active_round);
end;
$$;

revoke all on function public.continue_live_after_round(uuid) from public;
grant execute on function public.continue_live_after_round(uuid) to authenticated;

create or replace function public.select_live_round_package(
  target_game_id uuid,
  target_round smallint,
  mission_catalog_id text,
  mission_title text,
  mission_task text,
  mission_success_criteria text,
  mission_time_window text,
  advantage_catalog_id text,
  advantage_effect text,
  advantage_title text,
  advantage_description text,
  advantage_player_instructions text,
  advantage_host_instructions text,
  advantage_limit text,
  advantage_selection_mode text
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
    raise exception 'Nur André darf Mission und Vorteilsart festlegen.' using errcode = '42501';
  end if;

  perform public.select_live_round_mission(
    target_game_id, target_round, mission_catalog_id, mission_title,
    mission_task, mission_success_criteria, mission_time_window
  );
  perform public.select_live_round_advantage(
    target_game_id, target_round, advantage_catalog_id, advantage_effect,
    advantage_title, advantage_description, advantage_player_instructions,
    advantage_host_instructions, advantage_limit, advantage_selection_mode
  );

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_selected_atomic_round_package');

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id;

  if active_phase = 'role_transfer'
     and active_round between 1 and 3
     and target_round = active_round + 1
     and exists (
       select 1 from public.role_decisions rd
       where rd.game_id = target_game_id
         and rd.after_round = active_round
         and rd.target_member_id is not null
     ) then
    perform public.start_live_next_round(target_game_id, active_round);
  end if;
end;
$$;

create or replace function public.get_live_final_result(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf das Finale.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'published', true,
    'winnerMemberId', gfr.winner_member_id,
    'winnerDisplayName', winner.display_name,
    'winnerReason', gfr.winner_reason,
    'millionaireMemberId', gfr.millionaire_member_id,
    'millionaireDisplayName', millionaire.display_name,
    'millionaireSurvived', gfr.millionaire_survived,
    'ranking', gfr.ranking,
    'finalizedAt', gfr.finalized_at
  )
  into result
  from public.game_final_results gfr
  join public.game_members winner on winner.id = gfr.winner_member_id
  join public.game_members millionaire on millionaire.id = gfr.millionaire_member_id
  where gfr.game_id = target_game_id;

  return coalesce(result, jsonb_build_object('published', false, 'ranking', '[]'::jsonb));
end;
$$;

revoke all on function public.get_live_final_result(uuid) from public;
grant execute on function public.get_live_final_result(uuid) to authenticated;

create or replace function public.finalize_live_round_vote(
  target_game_id uuid,
  target_round smallint
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
  eliminated_id uuid;
  eliminated_name citext;
  max_votes integer;
  top_count integer;
  expected_voters integer;
  submitted_voters integer;
  round_points integer;
  survived boolean;
  regular_json jsonb;
  effective_json jsonb;
  advantage_id uuid;
  replacement_id uuid;
  winner_id uuid;
  winner_reason text;
  final_ranking jsonb;
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die geheime Abstimmung auswerten.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if active_round <> target_round or active_phase not in ('voting', 'evaluation') then
    raise exception 'Die Abstimmung kann nur in der laufenden Abstimmungs- oder Auswertungsphase abgeschlossen werden.';
  end if;
  if exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id and rr.round_number = target_round
  ) then
    return public.get_live_public_round_result(target_game_id, target_round);
  end if;

  select rr.member_id into millionaire_id
  from public.round_roles rr
  where rr.game_id = target_game_id
    and rr.round_number = target_round
    and rr.role = 'millionaire';
  if millionaire_id is null then
    raise exception 'Für diese Runde ist kein Millionär gespeichert.';
  end if;

  select count(*) into expected_voters
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.approved_at is not null
    and gm.attendance_status = 'present'
    and gm.winner_pool_status <> 'disqualified';

  select count(distinct v.voter_member_id) into submitted_voters
  from public.votes v
  where v.game_id = target_game_id
    and v.round_number = target_round
    and v.stage = 'main'
    and v.is_valid;

  if submitted_voters < expected_voters then
    raise exception 'Es fehlen noch % von % Stimmen.', expected_voters - submitted_voters, expected_voters;
  end if;

  select max(t.effective_votes) into max_votes
  from public.compute_live_round_tally(target_game_id, target_round) t;
  if max_votes is null then
    raise exception 'Es stehen keine zulässigen Kandidaten mehr zur Verfügung.';
  end if;

  select count(*) into top_count
  from public.compute_live_round_tally(target_game_id, target_round) t
  where t.effective_votes = max_votes;

  select t.member_id, t.display_name
    into eliminated_id, eliminated_name
  from public.compute_live_round_tally(target_game_id, target_round) t
  where t.effective_votes = max_votes
  order by gen_random_uuid()
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', t.member_id,
    'displayName', t.display_name,
    'votes', t.regular_votes
  ) order by t.display_name), '[]'::jsonb)
  into regular_json
  from public.compute_live_round_tally(target_game_id, target_round) t;

  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', t.member_id,
    'displayName', t.display_name,
    'totalVotes', t.effective_votes
  ) order by t.effective_votes desc, t.display_name), '[]'::jsonb)
  into effective_json
  from public.compute_live_round_tally(target_game_id, target_round) t;

  select aa.id into advantage_id
  from public.advantage_assignments aa
  where aa.game_id = target_game_id
    and aa.round_number = target_round
    and aa.used_at is not null
    and aa.expired_at is null;

  survived := eliminated_id is distinct from millionaire_id;

  select r.points into round_points
  from public.rounds r
  where r.game_id = target_game_id and r.round_number = target_round;

  insert into public.round_results (
    game_id, round_number, millionaire_member_id, eliminated_member_id,
    millionaire_survived, regular_tally, effective_tally,
    advantage_assignment_id, published_at, tie_resolved_randomly
  ) values (
    target_game_id, target_round, millionaire_id, eliminated_id,
    survived, regular_json, effective_json, advantage_id, now(), top_count > 1
  );

  update public.game_members
  set winner_pool_status = 'eliminated',
      eliminated_in_round = target_round,
      exit_reason = 'vote',
      updated_at = now()
  where id = eliminated_id and game_id = target_game_id;

  update public.rounds
  set eliminated_member_id = eliminated_id,
      completed_at = now()
  where game_id = target_game_id and round_number = target_round;

  insert into public.round_scores (
    game_id, round_number, member_id, points_awarded, correct_guess, reason
  )
  select
    target_game_id,
    target_round,
    gm.id,
    case when v.accused_member_id = millionaire_id then round_points else 0 end,
    v.accused_member_id = millionaire_id,
    case when v.accused_member_id = millionaire_id
      then 'Millionär in Runde ' || target_round || ' korrekt gewählt'
      else 'Keine korrekte Millionärsstimme in Runde ' || target_round end
  from public.game_members gm
  left join public.votes v
    on v.game_id = gm.game_id
   and v.round_number = target_round
   and v.stage = 'main'
   and v.voter_member_id = gm.id
   and v.is_valid
  where gm.game_id = target_game_id and gm.approved_at is not null
  on conflict (game_id, round_number, member_id)
  do update set
    points_awarded = excluded.points_awarded,
    correct_guess = excluded.correct_guess,
    reason = excluded.reason;

  if target_round < 4 then
    if not survived then
      select gm.id into replacement_id
      from public.game_members gm
      where gm.game_id = target_game_id
        and gm.approved_at is not null
        and gm.attendance_status = 'present'
        and gm.winner_pool_status = 'eligible'
        and gm.id <> millionaire_id
      order by gen_random_uuid()
      limit 1;
      if replacement_id is null then
        raise exception 'Nach dem Ausscheiden des Millionärs ist kein zulässiger Nachfolger mehr vorhanden.';
      end if;

      insert into public.role_decisions (
        game_id, after_round, member_id, decision, target_member_id, submitted_at
      ) values (
        target_game_id, target_round, millionaire_id, 'replacement', replacement_id, now()
      )
      on conflict (game_id, after_round, member_id)
      do update set
        decision = 'replacement',
        target_member_id = excluded.target_member_id,
        submitted_at = now();

      update public.games
      set millionaire_member_id = null
      where id = target_game_id;
    end if;

    update public.games
    set phase = 'role_transfer',
        revision = revision + 1,
        updated_at = now()
    where id = target_game_id
    returning revision into new_revision;
  else
    if survived then
      winner_id := millionaire_id;
      winner_reason := 'millionaire_survived';
    else
      select ranked.member_id
        into winner_id
      from (
        select
          gm.id as member_id,
          coalesce(sum(rs.points_awarded), 0)::integer as total_points,
          count(*) filter (where rs.correct_guess)::integer as correct_guesses,
          max(rs.round_number) filter (where rs.correct_guess) as last_correct_round
        from public.game_members gm
        left join public.round_scores rs
          on rs.game_id = gm.game_id and rs.member_id = gm.id
        where gm.game_id = target_game_id
          and gm.approved_at is not null
          and gm.winner_pool_status = 'eligible'
        group by gm.id
      ) ranked
      order by ranked.total_points desc,
               ranked.correct_guesses desc,
               ranked.last_correct_round desc nulls last,
               gen_random_uuid()
      limit 1;

      if winner_id is null then
        raise exception 'Nach der finalen Enttarnung ist keine gewinnberechtigte Person übrig.';
      end if;
      winner_reason := 'points_after_millionaire_exposed';
    end if;

    with standings as (
      select
        gm.id as member_id,
        gm.display_name,
        gm.winner_pool_status,
        coalesce(sum(rs.points_awarded), 0)::integer as total_points,
        count(*) filter (where rs.correct_guess)::integer as correct_guesses,
        max(rs.round_number) filter (where rs.correct_guess) as last_correct_round
      from public.game_members gm
      left join public.round_scores rs
        on rs.game_id = gm.game_id and rs.member_id = gm.id
      where gm.game_id = target_game_id and gm.approved_at is not null
      group by gm.id, gm.display_name, gm.winner_pool_status
    ), ordered as (
      select
        standings.*,
        row_number() over (
          order by
            case when standings.member_id = winner_id then 0 else 1 end,
            standings.total_points desc,
            standings.correct_guesses desc,
            standings.last_correct_round desc nulls last,
            standings.display_name
        ) as ranking_position
      from standings
    )
    select jsonb_agg(jsonb_build_object(
      'rank', ordered.ranking_position,
      'memberId', ordered.member_id,
      'displayName', ordered.display_name,
      'totalPoints', ordered.total_points,
      'correctGuesses', ordered.correct_guesses,
      'lastCorrectRound', ordered.last_correct_round,
      'winnerPoolStatus', ordered.winner_pool_status,
      'isWinner', ordered.member_id = winner_id
    ) order by ordered.ranking_position)
    into final_ranking
    from ordered;

    insert into public.game_final_results (
      game_id, winner_member_id, winner_reason, millionaire_member_id,
      millionaire_survived, ranking, finalized_at
    ) values (
      target_game_id, winner_id, winner_reason, millionaire_id,
      survived, final_ranking, now()
    )
    on conflict (game_id)
    do update set
      winner_member_id = excluded.winner_member_id,
      winner_reason = excluded.winner_reason,
      millionaire_member_id = excluded.millionaire_member_id,
      millionaire_survived = excluded.millionaire_survived,
      ranking = excluded.ranking,
      finalized_at = now();

    update public.games
    set phase = 'finished',
        revision = revision + 1,
        updated_at = now()
    where id = target_game_id
    returning revision into new_revision;
  end if;

  update public.player_progress
  set phase_seen = case when target_round = 4 then 'finished'::public.game_phase else 'role_transfer'::public.game_phase end,
      screen_key = case when target_round = 4 then 'finale' else 'round_result' end,
      step_key = case when target_round = 4 then 'final_ranking_published' else 'round_result_published' end,
      updated_at = now()
  where game_id = target_game_id;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  values (
    target_game_id,
    auth.uid(),
    case when target_round = 4 then 'game_finalized' else 'round_vote_finalized' end,
    jsonb_build_object(
      'round', target_round,
      'eliminated_member_id', eliminated_id,
      'millionaire_survived', survived,
      'winner_member_id', winner_id,
      'winner_reason', winner_reason,
      'tie_resolved_randomly', top_count > 1
    ),
    new_revision
  );

  insert into public.live_game_updates (game_id, update_type)
  values (
    target_game_id,
    case when target_round = 4 then 'final_ranking_published' else 'round_result_published' end
  );

  return jsonb_build_object(
    'round', target_round,
    'published', true,
    'eliminatedMemberId', eliminated_id,
    'eliminatedDisplayName', eliminated_name,
    'tally', effective_json,
    'phase', case when target_round = 4 then 'finished' else 'role_transfer' end,
    'millionaireSurvived', survived,
    'winnerMemberId', winner_id,
    'winnerReason', winner_reason
  );
end;
$$;

revoke all on function public.submit_live_cork_decision(uuid, text) from public;
grant execute on function public.submit_live_cork_decision(uuid, text) to authenticated;
revoke all on function public.finalize_live_round_vote(uuid, smallint) from public;
grant execute on function public.finalize_live_round_vote(uuid, smallint) to authenticated;
