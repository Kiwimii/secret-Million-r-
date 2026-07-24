-- Korrigierter Vorteilsablauf:
-- * André legt Mission und Vorteilsart gemeinsam vor der Runde fest.
-- * Der Millionär kann die festgelegte Art nicht verändern.
-- * Nach bestätigtem Missionserfolg aktiviert der Millionär den Vorteil in der Abstimmung.
-- * Bei der goldenen Umleitung bestimmt nur der Millionär die beiden geheimen Ziele.

create or replace function public.select_live_round_advantage(
  target_game_id uuid,
  target_round smallint,
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
  active_millionaire uuid;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf den geheimen Vorteil der Runde festlegen.' using errcode = '42501';
  end if;
  if target_round not between 1 and 4 then
    raise exception 'Ungültige Rundennummer.';
  end if;
  if advantage_effect not in ('double_vote', 'triple_vote', 'redirect_vote') then
    raise exception 'Zulässig sind nur doppelte Stimme, dreifache Stimme oder goldene Umleitung.';
  end if;
  if advantage_selection_mode is distinct from case when advantage_effect = 'redirect_vote' then 'source_and_target' else 'none' end then
    raise exception 'Die Zielauswahl passt nicht zur gewählten Vorteilsart.';
  end if;
  if exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id and ma.round_number = target_round
      and ma.status in ('completed', 'failed')
  ) or exists (
    select 1 from public.votes v
    where v.game_id = target_game_id and v.round_number = target_round and v.is_valid
  ) then
    raise exception 'Mission und Vorteil können nach der Missionsbewertung oder dem Abstimmungsbeginn nicht mehr geändert werden.';
  end if;

  insert into public.round_advantage_selections (
    game_id, round_number, catalog_id, effect, title_snapshot,
    description_snapshot, player_instructions_snapshot, host_instructions_snapshot,
    limit_snapshot, selection_mode, selected_at, updated_at
  ) values (
    target_game_id, target_round, advantage_catalog_id, advantage_effect,
    advantage_title, advantage_description, advantage_player_instructions,
    advantage_host_instructions, advantage_limit, advantage_selection_mode,
    now(), now()
  )
  on conflict (game_id, round_number)
  do update set
    catalog_id = excluded.catalog_id,
    effect = excluded.effect,
    title_snapshot = excluded.title_snapshot,
    description_snapshot = excluded.description_snapshot,
    player_instructions_snapshot = excluded.player_instructions_snapshot,
    host_instructions_snapshot = excluded.host_instructions_snapshot,
    limit_snapshot = excluded.limit_snapshot,
    selection_mode = excluded.selection_mode,
    selected_at = now(),
    updated_at = now();

  select g.millionaire_member_id into active_millionaire
  from public.games g
  where g.id = target_game_id and g.current_round = target_round;

  if active_millionaire is not null then
    perform public.assign_selected_advantage_to_millionaire(
      target_game_id, target_round, active_millionaire
    );
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_selected_round_advantage');
end;
$$;

create or replace function public.mark_live_mission_status(
  target_game_id uuid,
  target_round smallint,
  requested_status public.mission_status
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_millionaire uuid;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Mission bewerten.' using errcode = '42501';
  end if;
  if requested_status not in ('completed'::public.mission_status, 'failed'::public.mission_status) then
    raise exception 'Die Mission kann nur als erfolgreich oder gescheitert markiert werden.';
  end if;

  update public.mission_assignments
  set status = requested_status, reviewed_at = now()
  where game_id = target_game_id and round_number = target_round;
  if not found then
    raise exception 'Für diese Runde wurde noch keine Mission zugewiesen.';
  end if;

  update public.rounds
  set mission_status = requested_status
  where game_id = target_game_id and round_number = target_round;

  select g.millionaire_member_id into active_millionaire
  from public.games g
  where g.id = target_game_id and g.current_round = target_round;

  if not exists (
    select 1 from public.round_advantage_selections ras
    where ras.game_id = target_game_id and ras.round_number = target_round
  ) then
    raise exception 'André muss für diese Runde gemeinsam mit der Mission eine Vorteilsart festlegen.';
  end if;

  if active_millionaire is not null then
    perform public.assign_selected_advantage_to_millionaire(
      target_game_id, target_round, active_millionaire
    );
  end if;

  if requested_status = 'completed' then
    update public.advantage_assignments
    set used_at = null,
        expired_at = null,
        target_member_id = null,
        source_target_member_id = null,
        updated_at = now()
    where game_id = target_game_id and round_number = target_round;
  else
    update public.advantage_assignments
    set used_at = null,
        expired_at = now(),
        target_member_id = null,
        source_target_member_id = null,
        updated_at = now()
    where game_id = target_game_id and round_number = target_round;
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (
    target_game_id,
    case when requested_status = 'completed'
      then 'mission_completed_host_advantage_unlocked'
      else 'mission_failed_host_advantage_expired'
    end
  );
end;
$$;

create or replace function public.choose_live_millionaire_advantage(
  target_game_id uuid,
  target_round smallint,
  requested_effect text,
  requested_source_member_id uuid default null,
  requested_target_member_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  active_millionaire uuid;
  assigned public.advantage_assignments%rowtype;
begin
  select gm.id, g.current_round, g.phase, g.millionaire_member_id
    into own_member_id, active_round, active_phase, active_millionaire
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null or own_member_id is distinct from active_millionaire then
    raise exception 'Nur der aktuelle Millionär darf den freigeschalteten Vorteil anwenden.' using errcode = '42501';
  end if;
  if target_round <> active_round then
    raise exception 'Der Vorteil kann nur in der laufenden Runde angewendet werden.';
  end if;
  if active_phase <> 'voting' then
    raise exception 'Der Vorteil wird erst während der Abstimmung angewendet.';
  end if;
  if not exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id
      and ma.round_number = target_round
      and ma.assigned_member_id = own_member_id
      and ma.status = 'completed'
  ) then
    raise exception 'Der Vorteil wird erst durch Andrés Bestätigung des Missionserfolgs freigeschaltet.';
  end if;

  select aa.* into assigned
  from public.advantage_assignments aa
  where aa.game_id = target_game_id
    and aa.round_number = target_round
    and aa.actor_member_id = own_member_id
  for update;

  if not found then
    raise exception 'André hat für diese Runde noch keinen Vorteil festgelegt.';
  end if;
  if assigned.expired_at is not null then
    raise exception 'Der Vorteil ist wegen der gescheiterten Mission verfallen.';
  end if;
  if assigned.effect is distinct from requested_effect then
    raise exception 'Die Vorteilsart wurde bereits von André festgelegt und kann vom Millionär nicht geändert werden.';
  end if;
  if assigned.used_at is not null then
    raise exception 'Der Vorteil wurde in dieser Runde bereits angewendet.';
  end if;

  if assigned.effect = 'redirect_vote' then
    if requested_source_member_id is null or requested_target_member_id is null then
      raise exception 'Für die goldene Umleitung werden Ausgangsziel und Endziel benötigt.';
    end if;
    if requested_source_member_id = requested_target_member_id then
      raise exception 'Ausgangsziel und Endziel müssen verschieden sein.';
    end if;
    if not exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game_id and gm.id = requested_source_member_id
        and gm.attendance_status = 'present' and gm.winner_pool_status = 'eligible'
    ) then raise exception 'Das Ausgangsziel ist nicht mehr verfügbar.'; end if;
    if not exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game_id and gm.id = requested_target_member_id
        and gm.attendance_status = 'present' and gm.winner_pool_status = 'eligible'
    ) then raise exception 'Das Endziel ist nicht mehr verfügbar.'; end if;
  else
    requested_source_member_id := null;
    requested_target_member_id := null;
  end if;

  update public.advantage_assignments
  set source_target_member_id = requested_source_member_id,
      target_member_id = requested_target_member_id,
      used_at = now(),
      expired_at = null,
      updated_at = now()
  where id = assigned.id;

  update public.player_progress
  set advantage_opened = true,
      screen_key = 'voting',
      step_key = 'host_selected_advantage_applied',
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = own_member_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'millionaire_applied_host_selected_advantage');
end;
$$;

create or replace function public.get_live_host_round_control(target_game_id uuid)
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
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André sieht die vollständige Rundensteuerung.' using errcode = '42501';
  end if;
  select current_round into active_round from public.games where id = target_game_id;
  select jsonb_build_object(
    'round', active_round,
    'mission', (
      select jsonb_build_object(
        'status', ma.status, 'title', ma.title_snapshot,
        'assignedMemberId', ma.assigned_member_id,
        'reviewedAt', ma.reviewed_at
      ) from public.mission_assignments ma
      where ma.game_id = target_game_id and ma.round_number = active_round
    ),
    'advantage', (
      select jsonb_build_object(
        'catalogId', aa.catalog_id, 'effect', aa.effect, 'title', aa.title_snapshot,
        'description', aa.description_snapshot,
        'playerInstructions', aa.player_instructions_snapshot,
        'hostInstructions', aa.host_instructions_snapshot,
        'limit', aa.limit_snapshot, 'selectionMode', aa.selection_mode,
        'actorMemberId', aa.actor_member_id,
        'targetMemberId', aa.target_member_id,
        'secondaryTargetMemberId', aa.secondary_target_member_id,
        'sourceTargetMemberId', aa.source_target_member_id,
        'voterMemberId', aa.voter_member_id,
        'tieOpponentMemberId', aa.tie_opponent_member_id,
        'usedAt', aa.used_at, 'expiredAt', aa.expired_at
      ) from public.advantage_assignments aa
      where aa.game_id = target_game_id and aa.round_number = active_round
    ),
    'votes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'voterMemberId', v.voter_member_id,
        'accusedMemberId', v.accused_member_id,
        'stage', v.stage,
        'submittedAt', v.submitted_at
      ) order by v.submitted_at)
      from public.votes v
      where v.game_id = target_game_id and v.round_number = active_round and v.is_valid
    ), '[]'::jsonb)
  ) into result;
  return coalesce(result, '{}'::jsonb);
end;
$$;

-- Eintritt in die Abstimmung ist erlaubt, sobald die Mission bewertet wurde.
-- Vor der Auswertung muss ein freigeschalteter Vorteil jedoch angewendet worden sein.
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
  if target_round not between 1 and 4 then raise exception 'Ungültige Rundennummer.'; end if;

  select g.current_round, g.phase into active_round, active_phase
  from public.games g where g.id = target_game_id for update;

  if target_phase = 'challenge' then
    if not exists (
      select 1 from public.challenge_rounds cr
      where cr.game_id = target_game_id and cr.round_number = target_round
        and cr.teams_drawn_at is not null
    ) then raise exception 'Vor dem Start der Challenge müssen Challenge und Teams feststehen.'; end if;
    if (select count(*) from public.challenge_team_assignments cta
        where cta.game_id = target_game_id and cta.round_number = target_round) < 2 then
      raise exception 'Die Teamzuteilung ist noch nicht vollständig.';
    end if;
  end if;

  if target_phase = 'question' and not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
      and cr.winning_team is not null and cr.winner_confirmed_at is not null
  ) then raise exception 'André muss zuerst das Siegerteam bestätigen.'; end if;

  if target_phase = 'discussion' and not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
      and cr.question_completed_at is not null
  ) then raise exception 'André muss bestätigen, dass die Frage gestellt wurde.'; end if;

  if target_phase = 'voting' and not exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id and ma.round_number = target_round
      and ma.status in ('completed', 'failed')
  ) then raise exception 'André muss die geheime Mission zuerst als erfolgreich oder gescheitert markieren.'; end if;

  if target_phase = 'evaluation' then
    if exists (
      select 1 from public.mission_assignments ma
      where ma.game_id = target_game_id and ma.round_number = target_round and ma.status = 'completed'
    ) and not exists (
      select 1 from public.advantage_assignments aa
      where aa.game_id = target_game_id and aa.round_number = target_round
        and aa.used_at is not null and aa.expired_at is null
    ) then raise exception 'Der Millionär muss den von André festgelegten Vorteil während der Abstimmung anwenden.'; end if;

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
  ) then raise exception 'André muss die Abstimmung zuerst auswerten und veröffentlichen.'; end if;

  if target_round = active_round + 1 and target_phase = 'role_reveal' then
    if active_phase <> 'role_transfer' then raise exception 'Die nächste Runde beginnt erst nach der Korkenentscheidung.'; end if;
    select rd.target_member_id into next_millionaire
    from public.role_decisions rd
    where rd.game_id = target_game_id and rd.after_round = active_round
    order by rd.submitted_at desc limit 1;
    if next_millionaire is null then
      raise exception 'Die Korkenentscheidung oder automatische Ersatz-Auslosung fehlt noch.';
    end if;
    if not exists (
      select 1 from public.round_mission_selections rms
      where rms.game_id = target_game_id and rms.round_number = target_round
    ) then raise exception 'André muss vor der nächsten Runde die neue geheime Mission auswählen.'; end if;
    if not exists (
      select 1 from public.round_advantage_selections ras
      where ras.game_id = target_game_id and ras.round_number = target_round
    ) then raise exception 'André muss vor der nächsten Runde die Vorteilsart auswählen.'; end if;

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
      task_snapshot, success_criteria_snapshot, time_window_snapshot, status, assigned_at, reviewed_at
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
      status = 'assigned', assigned_at = now(), reviewed_at = null;

    perform public.assign_selected_advantage_to_millionaire(
      target_game_id, target_round, next_millionaire
    );
  end if;

  update public.games
  set current_round = target_round, phase = target_phase,
      revision = revision + 1, updated_at = now()
  where id = target_game_id and revision = expected_revision
  returning revision into new_revision;

  if new_revision is null then raise exception 'Der Spielstand wurde zwischenzeitlich geändert. Bitte neu laden.'; end if;

  update public.player_progress
  set phase_seen = target_phase, updated_at = now()
  where game_id = target_game_id;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  values (target_game_id, auth.uid(), 'phase_changed',
    jsonb_build_object('round', target_round, 'phase', target_phase), new_revision);
  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'phase_changed');
  return new_revision;
end;
$$;

revoke all on function public.select_live_round_advantage(uuid, smallint, text, text, text, text, text, text, text, text) from public;
grant execute on function public.select_live_round_advantage(uuid, smallint, text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.choose_live_millionaire_advantage(uuid, smallint, text, uuid, uuid) from public;
grant execute on function public.choose_live_millionaire_advantage(uuid, smallint, text, uuid, uuid) to authenticated;
