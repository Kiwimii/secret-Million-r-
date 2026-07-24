-- Vereinfacht den Frageprozess nach der Team-Challenge:
-- * Das Siegerteam bestimmt den Fragesteller ausschließlich mündlich untereinander.
-- * Im sichtbaren Spiel wird kein Spielerprofil mehr ausgewählt.
-- * André bestätigt nur noch, dass die Frage gestellt wurde.
-- * Die Bestätigung wechselt die Partie unmittelbar in die Diskussion.
-- Die ältere Auswahlfunktion bleibt ausschließlich rückwärtskompatibel für bereits
-- geöffnete Clients und bestehende Release-Tests; der neue Ablauf benötigt sie nicht.

create or replace function public.complete_live_question(
  target_game_id uuid,
  target_round smallint
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf bestätigen, dass die Frage gestellt wurde.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.challenge_rounds cr
    where cr.game_id = target_game_id
      and cr.round_number = target_round
      and cr.winning_team is not null
      and cr.winner_confirmed_at is not null
  ) then
    raise exception 'André muss zuerst das Siegerteam bestätigen.';
  end if;

  update public.games
  set phase = 'discussion',
      revision = revision + 1,
      updated_at = now()
  where id = target_game_id
    and current_round = target_round
    and phase = 'question'
  returning revision into new_revision;

  if new_revision is null then
    raise exception 'Die Frage kann nur in der laufenden Fragephase bestätigt werden.';
  end if;

  update public.challenge_rounds
  set question_completed_at = now()
  where game_id = target_game_id
    and round_number = target_round;

  update public.player_progress
  set phase_seen = 'discussion',
      updated_at = now()
  where game_id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'question_asked_and_discussion_started');
end;
$$;

create or replace function public.get_live_public_round_flow(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  result jsonb;
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf den Rundenablauf.' using errcode = '42501';
  end if;

  select current_round into active_round
  from public.games
  where id = target_game_id;

  select jsonb_build_object(
    'round', active_round,
    'challengeSelected', cr.id is not null,
    'teamsDrawn', cr.teams_drawn_at is not null,
    'winningTeam', cr.winning_team,
    'winnerConfirmedAt', cr.winner_confirmed_at,
    -- Alte Clients erhalten eine vorhandene Legacy-ID. Ohne Legacy-Auswahl dient der
    -- Textmarker nur dazu, den bereits bestätigten Offline-Teamprozess zu kennzeichnen.
    'questionerMemberId', coalesce(
      cr.questioner_member_id::text,
      case
        when cr.winning_team is not null and cr.winner_confirmed_at is not null
          then 'team-decides-offline'
        else null
      end
    ),
    'questionCompletedAt', cr.question_completed_at,
    'questionSelectionMode', 'offline_team_choice'
  ) into result
  from (select 1) seed
  left join public.challenge_rounds cr
    on cr.game_id = target_game_id and cr.round_number = active_round;

  return coalesce(result, '{}'::jsonb);
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
set search_path = public, extensions, pg_temp
as $$
declare
  new_revision bigint;
  active_round smallint;
  active_phase public.game_phase;
  next_millionaire uuid;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Phase ändern.' using errcode = '42501';
  end if;
  if target_round not between 1 and 4 then
    raise exception 'Ungültige Rundennummer.';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if target_phase = 'challenge' then
    if not exists (
      select 1 from public.challenge_rounds cr
      where cr.game_id = target_game_id and cr.round_number = target_round
        and cr.teams_drawn_at is not null
    ) then
      raise exception 'Vor dem Start der Challenge müssen Challenge und Teams feststehen.';
    end if;
    if (select count(*) from public.challenge_team_assignments cta
        where cta.game_id = target_game_id and cta.round_number = target_round) < 2 then
      raise exception 'Die Teamzuteilung ist noch nicht vollständig.';
    end if;
  end if;

  if target_phase = 'question' and not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
      and cr.winning_team is not null and cr.winner_confirmed_at is not null
  ) then
    raise exception 'André muss zuerst das Siegerteam bestätigen.';
  end if;

  if target_phase = 'discussion' and not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
      and cr.winning_team is not null
      and cr.question_completed_at is not null
  ) then
    raise exception 'André muss zuerst bestätigen, dass die Frage gestellt wurde.';
  end if;

  if target_phase = 'voting' and exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id and ma.round_number = target_round and ma.status = 'completed'
  ) and not exists (
    select 1 from public.advantage_assignments aa
    where aa.game_id = target_game_id and aa.round_number = target_round
      and aa.used_at is not null and aa.expired_at is null
  ) then
    raise exception 'Der Millionär muss zuerst seinen freigeschalteten Vorteil auswählen.';
  end if;

  if target_phase = 'evaluation' then
    if (select count(*) from public.game_members gm
        where gm.game_id = target_game_id and gm.approved_at is not null
          and gm.attendance_status = 'present' and gm.winner_pool_status <> 'disqualified')
       >
       (select count(distinct v.voter_member_id) from public.votes v
        where v.game_id = target_game_id and v.round_number = target_round
          and v.stage = 'main' and v.is_valid) then
      raise exception 'Vor der Auswertung müssen alle anwesenden stimmberechtigten Personen abgestimmt haben.';
    end if;
  end if;

  if target_phase = 'result' and not exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id and rr.round_number = target_round and rr.published_at is not null
  ) then
    raise exception 'André muss die Abstimmung zuerst auswerten und veröffentlichen.';
  end if;

  if target_round = active_round + 1 and target_phase = 'role_reveal' then
    if active_phase <> 'role_transfer' then
      raise exception 'Die nächste Runde beginnt erst nach der Korkenentscheidung.';
    end if;

    select rd.target_member_id into next_millionaire
    from public.role_decisions rd
    where rd.game_id = target_game_id and rd.after_round = active_round
    order by rd.submitted_at desc
    limit 1;

    if next_millionaire is null then
      raise exception 'Die Korkenentscheidung oder automatische Ersatz-Auslosung fehlt noch.';
    end if;
    if not exists (
      select 1 from public.round_mission_selections rms
      where rms.game_id = target_game_id and rms.round_number = target_round
    ) then
      raise exception 'André muss vor der nächsten Runde die neue geheime Mission auswählen.';
    end if;

    insert into public.round_roles (game_id, round_number, member_id, role)
    select gm.game_id, target_round, gm.id,
      case
        when gm.id = next_millionaire then 'millionaire'::public.game_role
        when gm.attendance_status = 'present' and gm.winner_pool_status <> 'disqualified'
          then 'investigator'::public.game_role
        else 'none'::public.game_role
      end
    from public.game_members gm
    where gm.game_id = target_game_id and gm.approved_at is not null
    on conflict (game_id, round_number, member_id)
    do update set role = excluded.role, revealed_at = null;

    insert into public.mission_assignments (
      game_id, round_number, assigned_member_id, catalog_id, title_snapshot,
      task_snapshot, success_criteria_snapshot, time_window_snapshot, status,
      assigned_at, reviewed_at
    )
    select rms.game_id, rms.round_number, next_millionaire, rms.catalog_id,
      rms.title_snapshot, rms.task_snapshot, rms.success_criteria_snapshot,
      rms.time_window_snapshot, 'assigned'::public.mission_status, now(), null
    from public.round_mission_selections rms
    where rms.game_id = target_game_id and rms.round_number = target_round
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

    delete from public.advantage_assignments
    where game_id = target_game_id and round_number = target_round;

    update public.games
    set current_round = target_round,
        phase = target_phase,
        millionaire_member_id = next_millionaire,
        revision = revision + 1,
        updated_at = now()
    where id = target_game_id and revision = expected_revision
    returning revision into new_revision;
  else
    update public.games
    set current_round = target_round,
        phase = target_phase,
        revision = revision + 1,
        updated_at = now()
    where id = target_game_id and revision = expected_revision
    returning revision into new_revision;
  end if;

  if new_revision is null then
    raise exception 'Der Spielstand wurde bereits verändert. Bitte neu laden.' using errcode = '40001';
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

revoke all on function public.complete_live_question(uuid, smallint) from public;
grant execute on function public.complete_live_question(uuid, smallint) to authenticated;

comment on function public.complete_live_question(uuid, smallint) is
  'André bestätigt nur, dass die vom Siegerteam mündlich organisierte Frage gestellt wurde; danach startet automatisch die Diskussion.';
