-- Geheime Freigabe des nächsten zufälligen Millionärs durch André sowie
-- drei zusätzliche Stimmen gegen den Millionär, wenn dessen Challenge-Team verliert.
-- Bereits veröffentlichte Rundenergebnisse werden nicht rückwirkend verändert.

alter table public.role_decisions
  add column if not exists host_confirmed_at timestamptz,
  add column if not exists rejected_target_ids uuid[] not null default '{}'::uuid[];

alter table public.round_results
  add column if not exists challenge_penalty_member_id uuid,
  add column if not exists challenge_penalty_votes integer not null default 0
    check (challenge_penalty_votes in (0, 3));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'round_results_challenge_penalty_member_fk'
  ) then
    alter table public.round_results
      add constraint round_results_challenge_penalty_member_fk
      foreign key (challenge_penalty_member_id)
      references public.game_members(id)
      on delete set null;
  end if;
end
$$;

-- Abgeschlossene oder bereits fortgesetzte Übergänge bleiben freigegeben.
-- Nur ein aktuell noch offener zufälliger Nachfolger wartet nach der Migration
-- auf Andrés geheime Bestätigung.
update public.role_decisions rd
set host_confirmed_at = coalesce(rd.host_confirmed_at, rd.submitted_at)
from public.games g
where g.id = rd.game_id
  and rd.host_confirmed_at is null
  and (
    rd.decision = 'keep'
    or g.phase <> 'role_transfer'
    or g.current_round <> rd.after_round
  );

create or replace function public.resolve_live_challenge_penalty(
  target_game_id uuid,
  target_round smallint
)
returns table (
  member_id uuid,
  penalty_votes integer
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    millionaire.member_id,
    3::integer
  from (
    select rr.member_id
    from public.round_roles rr
    where rr.game_id = target_game_id
      and rr.round_number = target_round
      and rr.role = 'millionaire'
    limit 1
  ) millionaire
  join public.challenge_team_assignments cta
    on cta.game_id = target_game_id
   and cta.round_number = target_round
   and cta.member_id = millionaire.member_id
  join public.challenge_rounds cr
    on cr.game_id = cta.game_id
   and cr.round_number = cta.round_number
  where cr.winner_confirmed_at is not null
    and cr.winning_team is not null
    and cta.team <> cr.winning_team
  limit 1;
$$;

revoke all on function public.resolve_live_challenge_penalty(uuid, smallint) from public;

create or replace function public.compute_live_round_tally(
  target_game_id uuid,
  target_round smallint
)
returns table (
  member_id uuid,
  display_name citext,
  regular_votes integer,
  adjustment integer,
  effective_votes integer
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with context as (
    select rr.member_id as millionaire_member_id
    from public.round_roles rr
    where rr.game_id = target_game_id
      and rr.round_number = target_round
      and rr.role = 'millionaire'
    limit 1
  ),
  candidates as (
    select gm.id, gm.display_name
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
  ),
  regular as (
    select v.accused_member_id as member_id, count(*)::integer as votes
    from public.votes v
    where v.game_id = target_game_id
      and v.round_number = target_round
      and v.stage = 'main'
      and v.is_valid
    group by v.accused_member_id
  ),
  actor_vote as (
    select v.accused_member_id
    from public.votes v
    join context c on c.millionaire_member_id = v.voter_member_id
    where v.game_id = target_game_id
      and v.round_number = target_round
      and v.stage = 'main'
      and v.is_valid
    limit 1
  ),
  advantage as (
    select aa.*
    from public.advantage_assignments aa
    join context c on c.millionaire_member_id = aa.actor_member_id
    where aa.game_id = target_game_id
      and aa.round_number = target_round
      and aa.used_at is not null
      and aa.expired_at is null
    limit 1
  ),
  challenge_penalty as (
    select penalty.member_id, penalty.penalty_votes
    from public.resolve_live_challenge_penalty(target_game_id, target_round) penalty
  ),
  calculated as (
    select
      candidate.id as member_id,
      candidate.display_name,
      coalesce(regular_votes.votes, 0)::integer as regular_votes,
      (
        case
          when active_advantage.effect = 'double_vote'
               and candidate.id = millionaire_vote.accused_member_id then 1
          when active_advantage.effect = 'triple_vote'
               and candidate.id = millionaire_vote.accused_member_id then 2
          when active_advantage.effect = 'redirect_vote' then
            (case
              when millionaire_vote.accused_member_id is not null
               and millionaire_vote.accused_member_id <> active_advantage.target_member_id
               and candidate.id = millionaire_vote.accused_member_id then -1
              else 0
            end)
            + (case
              when millionaire_vote.accused_member_id is not null
               and millionaire_vote.accused_member_id <> active_advantage.target_member_id
               and candidate.id = active_advantage.target_member_id then 1
              else 0
            end)
            + (case
              when candidate.id = active_advantage.source_target_member_id
               and (
                 coalesce((
                   select other_regular.votes
                   from regular other_regular
                   where other_regular.member_id = active_advantage.source_target_member_id
                 ), 0)
                 - case
                     when millionaire_vote.accused_member_id = active_advantage.source_target_member_id then 1
                     else 0
                   end
               ) > 0 then -1
              else 0
            end)
            + (case
              when candidate.id = active_advantage.target_member_id then 1
              else 0
            end)
          else 0
        end
        + case
            when candidate.id = penalty.member_id then penalty.penalty_votes
            else 0
          end
      )::integer as adjustment
    from candidates candidate
    left join regular regular_votes on regular_votes.member_id = candidate.id
    left join actor_vote millionaire_vote on true
    left join advantage active_advantage on true
    left join challenge_penalty penalty on penalty.member_id = candidate.id
  )
  select
    calculated.member_id,
    calculated.display_name,
    calculated.regular_votes,
    calculated.adjustment,
    greatest(0, calculated.regular_votes + calculated.adjustment)::integer as effective_votes
  from calculated
  order by calculated.display_name;
$$;

create or replace function public.set_round_result_challenge_penalty()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  resolved_member_id uuid;
  resolved_votes integer;
begin
  select penalty.member_id, penalty.penalty_votes
    into resolved_member_id, resolved_votes
  from public.resolve_live_challenge_penalty(new.game_id, new.round_number) penalty;

  new.challenge_penalty_member_id := resolved_member_id;
  new.challenge_penalty_votes := coalesce(resolved_votes, 0);
  return new;
end;
$$;

drop trigger if exists round_results_set_challenge_penalty on public.round_results;
create trigger round_results_set_challenge_penalty
before insert or update of game_id, round_number
on public.round_results
for each row execute function public.set_round_result_challenge_penalty();

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
  next_decision text;
  candidate_confirmed_at timestamptz;
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

  select
    rd.target_member_id,
    rd.decision::text,
    rd.host_confirmed_at
    into next_millionaire, next_decision, candidate_confirmed_at
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

  if next_decision in ('release', 'replacement')
     and candidate_confirmed_at is null then
    return jsonb_build_object(
      'advanced', false,
      'nextRound', next_round,
      'reason', 'candidate_confirmation_required'
    );
  end if;

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
    own_member_id,
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
      screen_key = 'role_transfer',
      step_key = 'cork_decision_submitted',
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = own_member_id;

  if requested_decision = 'keep' then
    transition := public.start_live_next_round(target_game_id, active_round);
  else
    transition := jsonb_build_object(
      'advanced', false,
      'nextRound', active_round + 1,
      'reason', 'candidate_confirmation_required'
    );
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'cork_decision_submitted');

  return jsonb_build_object(
    'decision', requested_decision,
    'randomTransfer', requested_decision = 'release',
    'transition', transition
  );
end;
$$;

create or replace function public.get_live_next_millionaire_candidate(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  decision_row public.role_decisions%rowtype;
  candidate_name citext;
  package_ready boolean;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André sieht den geheimen nächsten Millionär.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id;

  if active_phase <> 'role_transfer' or active_round not between 1 and 3 then
    return jsonb_build_object('available', false);
  end if;

  select rd.*
    into decision_row
  from public.role_decisions rd
  where rd.game_id = target_game_id
    and rd.after_round = active_round
    and rd.target_member_id is not null
  order by rd.submitted_at desc
  limit 1;

  if decision_row.id is null then
    return jsonb_build_object(
      'available', false,
      'nextRound', active_round + 1
    );
  end if;

  select gm.display_name
    into candidate_name
  from public.game_members gm
  where gm.id = decision_row.target_member_id;

  package_ready := exists (
    select 1
    from public.round_mission_selections rms
    where rms.game_id = target_game_id
      and rms.round_number = active_round + 1
  ) and exists (
    select 1
    from public.round_advantage_selections ras
    where ras.game_id = target_game_id
      and ras.round_number = active_round + 1
  );

  return jsonb_build_object(
    'available', true,
    'afterRound', active_round,
    'nextRound', active_round + 1,
    'decision', decision_row.decision,
    'candidateMemberId', decision_row.target_member_id,
    'candidateDisplayName', candidate_name,
    'hostConfirmedAt', decision_row.host_confirmed_at,
    'requiresHostConfirmation',
      decision_row.decision::text in ('release', 'replacement')
      and decision_row.host_confirmed_at is null,
    'canReroll', decision_row.decision::text in ('release', 'replacement'),
    'rejectedCount', cardinality(coalesce(decision_row.rejected_target_ids, '{}'::uuid[])),
    'roundPackageReady', package_ready
  );
end;
$$;

revoke all on function public.get_live_next_millionaire_candidate(uuid) from public;
grant execute on function public.get_live_next_millionaire_candidate(uuid) to authenticated;

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

  -- Sind alle bisher nicht berücksichtigten Kandidaten verbraucht, darf eine
  -- ältere Ablehnung wieder in den Pool zurückkehren. Der gerade abgelehnte
  -- Kandidat und der bisherige Millionär bleiben ausgeschlossen.
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
        select distinct rejected_id
        from unnest(rejected_ids || array[current_candidate]::uuid[]) rejected_id
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

create or replace function public.confirm_live_next_millionaire(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  decision_id uuid;
  candidate_id uuid;
  candidate_name citext;
  transition jsonb;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf den geheimen Nachfolger bestätigen.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if active_phase <> 'role_transfer' or active_round not between 1 and 3 then
    raise exception 'Aktuell steht kein geheimer Nachfolger zur Bestätigung bereit.';
  end if;

  select rd.id, rd.target_member_id
    into decision_id, candidate_id
  from public.role_decisions rd
  where rd.game_id = target_game_id
    and rd.after_round = active_round
    and rd.target_member_id is not null
  order by rd.submitted_at desc
  limit 1
  for update;

  if decision_id is null or candidate_id is null then
    raise exception 'Es wurde noch kein nächster Millionär bestimmt.';
  end if;

  update public.role_decisions
  set host_confirmed_at = now()
  where id = decision_id;

  select gm.display_name
    into candidate_name
  from public.game_members gm
  where gm.id = candidate_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'next_millionaire_confirmed');

  transition := public.start_live_next_round(target_game_id, active_round);

  return jsonb_build_object(
    'candidateMemberId', candidate_id,
    'candidateDisplayName', candidate_name,
    'transition', transition
  );
end;
$$;

revoke all on function public.confirm_live_next_millionaire(uuid) from public;
grant execute on function public.confirm_live_next_millionaire(uuid) to authenticated;

create or replace function public.get_live_host_round_penalties(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André sieht die geheimen Challenge-Mali.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'round', rr.round_number,
    'memberId', rr.challenge_penalty_member_id,
    'displayName', penalized.display_name,
    'penaltyVotes', rr.challenge_penalty_votes
  ) order by rr.round_number), '[]'::jsonb)
    into result
  from public.round_results rr
  left join public.game_members penalized
    on penalized.id = rr.challenge_penalty_member_id
  where rr.game_id = target_game_id;

  return result;
end;
$$;

revoke all on function public.get_live_host_round_penalties(uuid) from public;
grant execute on function public.get_live_host_round_penalties(uuid) to authenticated;

grant execute on function public.submit_live_cork_decision(uuid, text) to authenticated;
