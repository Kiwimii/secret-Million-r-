-- Stability hardening after the Akte Midas UI and catalog release.
-- Prevents duplicate host actions, validates mission-effect targets, requires a
-- resolved team challenge before voting, and guarantees that the eliminated
-- participant receives no round points.

create or replace function public.meta_player_set_effect_selection(target_game_id uuid, effect_selection jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  own_member uuid := public.meta_current_member_id(target_game_id);
  effect jsonb;
  selection_mode text;
  selected_voter uuid;
  selected_target uuid;
  normalized_selection jsonb := '{}'::jsonb;
begin
  if own_member is null then raise exception 'Spielerprofil fehlt.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase not in ('mission_review','voting_open') then
    raise exception 'Die Effektauswahl kann nur vor dem Abstimmungsschluss geändert werden.';
  end if;

  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if round_state ->> 'millionaireId' <> own_member::text then
    raise exception 'Nur der aktuelle Millionär kann den Effekt konfigurieren.';
  end if;
  if coalesce(round_state ->> 'missionStatus', 'pending') = 'pending' then
    raise exception 'Die Mission wurde noch nicht bewertet.';
  end if;

  effect := case
    when round_state ->> 'missionStatus' = 'completed' then round_state -> 'bonus'
    when round_state ->> 'missionStatus' = 'failed' then round_state -> 'malus'
    else jsonb_build_object('kind','none','selectionMode','none')
  end;
  selection_mode := coalesce(effect ->> 'selectionMode', 'none');
  if selection_mode = 'none' then
    raise exception 'Dieser Effekt benötigt keine Zielauswahl.';
  end if;

  if nullif(effect_selection ->> 'voterId', '') is not null then
    selected_voter := (effect_selection ->> 'voterId')::uuid;
  end if;
  if nullif(effect_selection ->> 'targetId', '') is not null then
    selected_target := (effect_selection ->> 'targetId')::uuid;
  end if;

  if selection_mode in ('voter','source_and_target') and selected_voter is null then
    raise exception 'Wähle den betroffenen Wähler aus.';
  end if;
  if selection_mode in ('target','source_and_target') and selected_target is null then
    raise exception 'Wähle die Zielperson aus.';
  end if;

  if selected_voter is not null and not exists (
    select 1 from public.meta_members m
    where m.id = selected_voter
      and m.game_id = target_game_id
      and m.id <> own_member
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  ) then
    raise exception 'Der ausgewählte Wähler ist in dieser Runde nicht zulässig.';
  end if;

  if selected_target is not null and not exists (
    select 1 from public.meta_members m
    where m.id = selected_target
      and m.game_id = target_game_id
      and m.id <> own_member
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  ) then
    raise exception 'Die ausgewählte Zielperson ist in dieser Runde nicht zulässig.';
  end if;

  if selected_voter is not null then
    normalized_selection := normalized_selection || jsonb_build_object('voterId', selected_voter);
  end if;
  if selected_target is not null then
    normalized_selection := normalized_selection || jsonb_build_object('targetId', selected_target);
  end if;

  round_state := round_state || jsonb_build_object('effectSelection', normalized_selection);
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true)
  where id = target_game_id;
  perform public.meta_emit_event(
    target_game_id, game_row.current_round, 'member', own_member,
    'effect_selection_saved', 'Effektauswahl gespeichert',
    'Deine Auswahl wird beim Abstimmungsschluss angewendet.', 'important', normalized_selection
  );
  perform public.meta_bump_revision(target_game_id, 'effect_selection_saved');
end;
$$;

create or replace function public.meta_host_draw_millionaire(target_game_id uuid, force_redraw boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  selected_member uuid;
  previous_member uuid;
  candidate_count integer;
  was_released boolean;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf auslosen.' using errcode = '42501';
  end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase in ('voting_open','reveal_ready','report','role_decision','finished') then
    raise exception 'Nach Öffnung der Abstimmung kann der Millionär nicht mehr neu ausgelost werden.';
  end if;

  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  previous_member := nullif(round_state ->> 'millionaireId', '')::uuid;
  was_released := coalesce((round_state ->> 'roleReleased')::boolean, false);
  if previous_member is not null and not force_redraw then
    if was_released then
      raise exception 'Die Rolle wurde bereits veröffentlicht. Nutze die bestätigte Notfall-Neuauslosung.';
    end if;
    return;
  end if;

  select count(*) into candidate_count
  from public.meta_members m
  where m.game_id = target_game_id
    and m.attendance_status = 'present'
    and m.competition_status = 'eligible'
    and m.active_from_round <= game_row.current_round;
  if candidate_count = 0 then raise exception 'Es gibt keinen gültigen Millionärskandidaten.'; end if;

  select m.id into selected_member
  from public.meta_members m
  where m.game_id = target_game_id
    and m.attendance_status = 'present'
    and m.competition_status = 'eligible'
    and m.active_from_round <= game_row.current_round
    and (candidate_count = 1 or previous_member is null or m.id <> previous_member)
  order by random()
  limit 1;

  round_state := round_state || jsonb_build_object(
    'millionaireId', selected_member,
    'roleReleased', false,
    'missionPublished', false,
    'missionStatus', 'pending',
    'effectSelection', null,
    'result', null,
    'resultPublished', false
  );
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true),
      phase = 'round_setup'
  where id = target_game_id;

  perform public.meta_emit_event(
    target_game_id, game_row.current_round, 'host', null,
    case when force_redraw and previous_member is not null then 'millionaire_redrawn' else 'millionaire_drawn' end,
    case when force_redraw and previous_member is not null then 'Millionär neu ausgelost' else 'Millionär ausgelost' end,
    'Die geheime Rolle ist vorbereitet und noch nicht veröffentlicht.',
    case when force_redraw and previous_member is not null then 'critical' else 'important' end,
    jsonb_build_object('memberId', selected_member)
  );
  if force_redraw and previous_member is not null and was_released then
    perform public.meta_emit_event(
      target_game_id, game_row.current_round, 'public', null,
      'millionaire_redraw_notice', 'Rolle wurde administrativ neu ausgelost',
      'Die vorherige Rollenfreigabe ist ungültig. Eine neue Rolle wird erneut freigegeben.',
      'critical', '{}'::jsonb
    );
  end if;
  perform public.meta_bump_revision(target_game_id, 'millionaire_drawn');
end;
$$;

create or replace function public.meta_host_release_roles(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf Rollen freigeben.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if coalesce((round_state ->> 'roleReleased')::boolean, false) then return; end if;
  if game_row.phase <> 'round_setup' then raise exception 'Die Rollen können in dieser Phase nicht freigegeben werden.'; end if;
  if round_state ->> 'millionaireId' is null then raise exception 'Der Millionär wurde noch nicht ausgelost.'; end if;
  if round_state -> 'mission' is null then raise exception 'Die Runde ist noch nicht vollständig vorbereitet.'; end if;
  round_state := round_state || jsonb_build_object('roleReleased', true);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'role_released' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'roles_released', 'Deine Rolle ist verfügbar', 'Öffne im Dashboard den Bereich „Eigene Rolle“.', 'critical', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'roles_released');
end;
$$;

create or replace function public.meta_host_publish_mission(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  millionaire uuid;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf die Mission veröffentlichen.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if coalesce((round_state ->> 'missionPublished')::boolean, false) then return; end if;
  if game_row.phase <> 'role_released' then raise exception 'Der Auftrag kann in dieser Phase nicht entsiegelt werden.'; end if;
  if not coalesce((round_state ->> 'roleReleased')::boolean, false) then raise exception 'Gib zuerst die Rollen frei.'; end if;
  millionaire := (round_state ->> 'millionaireId')::uuid;
  round_state := round_state || jsonb_build_object('missionPublished', true);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'mission' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'member', millionaire, 'mission_published_private', 'Deine geheime Mission ist verfügbar', 'Mission, Bonus und Malus stehen jetzt in deinem Dashboard.', 'critical', '{}'::jsonb);
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'mission_published_public', 'Die geheime Mission wurde ausgegeben', 'Der Millionär kennt jetzt seine Aufgabe.', 'important', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'mission_published');
end;
$$;

create or replace function public.meta_host_draw_teams(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  teams jsonb;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf Teams auslosen.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if coalesce((round_state ->> 'challengePublished')::boolean, false) then return; end if;
  if game_row.phase <> 'mission' then raise exception 'Die Feldoperation kann in dieser Phase nicht freigegeben werden.'; end if;
  if round_state -> 'challenge' is null then raise exception 'Die Challenge wurde noch nicht festgelegt.'; end if;

  with randomized as (
    select m.id, row_number() over (order by random()) as rn
    from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status <> 'disqualified'
  )
  select coalesce(jsonb_object_agg(id::text, case when rn % 2 = 1 then 'azur' else 'gold' end), '{}'::jsonb)
  into teams from randomized;

  round_state := round_state || jsonb_build_object('teams', teams, 'challengePublished', true, 'winningTeam', null);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'challenge' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'teams_published', 'Teams und Challenge veröffentlicht', 'Dein Team und die Regeln stehen im Dashboard.', 'critical', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'teams_published');
end;
$$;

create or replace function public.meta_host_open_voting(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf die Abstimmung öffnen.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase = 'voting_open' then return; end if;
  if game_row.phase <> 'mission_review' then raise exception 'Die Abstimmung kann in dieser Phase nicht geöffnet werden.'; end if;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if coalesce(round_state ->> 'missionStatus', 'pending') = 'pending' then raise exception 'Bewerte zuerst die Mission.'; end if;
  if not coalesce((round_state ->> 'challengePublished')::boolean, false) then raise exception 'Veröffentliche zuerst die Feldoperation.'; end if;
  if nullif(round_state ->> 'winningTeam', '') is null then raise exception 'Bestätige zuerst das Siegerteam der Feldoperation.'; end if;
  round_state := round_state || jsonb_build_object('votingOpenedAt', now(), 'votingClosedAt', null);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'voting_open' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'voting_opened', 'Abstimmung geöffnet', 'Prüfe deinen Verdacht und gib deine Stimme verbindlich ab.', 'critical', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'voting_opened');
end;
$$;

create or replace function public.meta_host_publish_result(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf das Ergebnis veröffentlichen.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if coalesce((round_state ->> 'resultPublished')::boolean, false) then return; end if;
  if game_row.phase <> 'reveal_ready' then raise exception 'Der Abschlussbericht kann in dieser Phase nicht veröffentlicht werden.'; end if;
  if round_state -> 'result' is null then raise exception 'Die Abstimmung wurde noch nicht ausgewertet.'; end if;
  round_state := round_state || jsonb_build_object(
    'resultPublished', true,
    'result', (round_state -> 'result') || jsonb_build_object('published', true)
  );
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'report' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'result_published', 'Rundenergebnis veröffentlicht', 'Die Auszählung und dein persönlicher Rundenbericht sind verfügbar.', 'critical', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'result_published');
end;
$$;

create or replace function public.meta_host_close_voting(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  millionaire uuid;
  mission_status text;
  effect jsonb;
  effect_kind text;
  selection jsonb;
  tally jsonb := '{}'::jsonb;
  entry_record record;
  vote_record record;
  candidate_record record;
  regular_array jsonb := '[]'::jsonb;
  effective_array jsonb := '[]'::jsonb;
  regular_value integer;
  adjustment_value integer;
  effective_value integer;
  max_votes integer := -1;
  tied_members uuid[] := array[]::uuid[];
  eliminated uuid;
  actor_vote_target uuid;
  selected_voter uuid;
  selected_target uuid;
  source_vote_target uuid;
  missing_voters uuid[];
  points_value integer;
  correct_value boolean;
  score_reason text;
  effect_amount integer;
  result_value jsonb;
  tie_method text := 'none';
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf die Abstimmung schließen.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase <> 'voting_open' then raise exception 'Die Abstimmung ist nicht geöffnet.'; end if;

  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  millionaire := (round_state ->> 'millionaireId')::uuid;
  mission_status := coalesce(round_state ->> 'missionStatus', 'neutral');
  effect := case
    when mission_status = 'completed' then round_state -> 'bonus'
    when mission_status = 'failed' then round_state -> 'malus'
    else jsonb_build_object('kind','none','title','Kein Effekt','description','')
  end;
  effect_kind := coalesce(effect ->> 'kind', 'none');
  selection := coalesce(round_state -> 'effectSelection', '{}'::jsonb);

  for candidate_record in
    select m.id
    from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  loop
    tally := tally || jsonb_build_object(candidate_record.id::text, jsonb_build_object('regularVotes',0,'adjustment',0));
  end loop;
  if tally = '{}'::jsonb then raise exception 'Keine gültigen Abstimmungsziele vorhanden.'; end if;

  for vote_record in
    select v.member_id, v.target_member_id
    from public.meta_votes v
    where v.game_id = target_game_id and v.round_number = game_row.current_round
  loop
    tally := public.meta_tally_add(tally, vote_record.target_member_id, 1, 0);
  end loop;

  if effect_kind = 'double_own_vote' then
    select target_member_id into actor_vote_target from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = millionaire;
    if actor_vote_target is not null then tally := public.meta_tally_add(tally, actor_vote_target, 0, 1); end if;
  elsif effect_kind = 'block_voter' then
    selected_voter := nullif(selection ->> 'voterId','')::uuid;
    select target_member_id into source_vote_target from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = selected_voter;
    if source_vote_target is not null then tally := public.meta_tally_add(tally, source_vote_target, 0, -1); end if;
  elsif effect_kind = 'redirect_vote' then
    selected_voter := nullif(selection ->> 'voterId','')::uuid;
    selected_target := nullif(selection ->> 'targetId','')::uuid;
    select target_member_id into source_vote_target from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = selected_voter;
    if source_vote_target is not null and selected_target is not null and tally ? selected_target::text then
      tally := public.meta_tally_add(tally, source_vote_target, 0, -1);
      tally := public.meta_tally_add(tally, selected_target, 0, 1);
    end if;
  elsif effect_kind = 'add_vote' then
    selected_target := nullif(selection ->> 'targetId','')::uuid;
    if selected_target is not null and tally ? selected_target::text then tally := public.meta_tally_add(tally, selected_target, 0, 1); end if;
  elsif effect_kind = 'remove_self_vote' then
    tally := public.meta_tally_add(tally, millionaire, 0, -1);
  elsif effect_kind = 'cancel_own_vote' then
    select target_member_id into actor_vote_target from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = millionaire;
    if actor_vote_target is not null then tally := public.meta_tally_add(tally, actor_vote_target, 0, -1); end if;
  elsif effect_kind = 'add_vote_against_self' then
    tally := public.meta_tally_add(tally, millionaire, 0, 1);
  end if;

  for entry_record in select key, value from jsonb_each(tally)
  loop
    regular_value := coalesce((entry_record.value ->> 'regularVotes')::integer, 0);
    adjustment_value := coalesce((entry_record.value ->> 'adjustment')::integer, 0);
    effective_value := greatest(0, regular_value + adjustment_value);
    regular_array := regular_array || jsonb_build_array(jsonb_build_object('memberId', entry_record.key, 'regularVotes', regular_value, 'adjustment', 0, 'effectiveVotes', regular_value));
    effective_array := effective_array || jsonb_build_array(jsonb_build_object('memberId', entry_record.key, 'regularVotes', regular_value, 'adjustment', adjustment_value, 'effectiveVotes', effective_value));
    if effective_value > max_votes then
      max_votes := effective_value;
      tied_members := array[entry_record.key::uuid];
    elsif effective_value = max_votes then
      tied_members := array_append(tied_members, entry_record.key::uuid);
    end if;
  end loop;

  if array_length(tied_members, 1) > 1 then
    eliminated := tied_members[1 + floor(random() * array_length(tied_members, 1))::integer];
    tie_method := 'lot';
  else
    eliminated := tied_members[1];
  end if;

  select coalesce(array_agg(m.id), array[]::uuid[]) into missing_voters
  from public.meta_members m
  where m.game_id = target_game_id
    and m.attendance_status = 'present'
    and m.competition_status = 'eligible'
    and m.active_from_round <= game_row.current_round
    and not exists (
      select 1 from public.meta_votes v
      where v.game_id = target_game_id and v.round_number = game_row.current_round and v.member_id = m.id
    );

  delete from public.meta_scores where game_id = target_game_id and round_number = game_row.current_round;
  for candidate_record in
    select m.* from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  loop
    points_value := 0;
    correct_value := false;
    score_reason := 'no_points';

    if candidate_record.id = eliminated then
      score_reason := 'eliminated_before_scoring';
    else
      if candidate_record.id = millionaire then
        points_value := game_row.current_round;
        score_reason := 'millionaire_survived';
      elsif exists (
        select 1 from public.meta_votes v
        where v.game_id = target_game_id
          and v.round_number = game_row.current_round
          and v.member_id = candidate_record.id
          and v.target_member_id = millionaire
      ) then
        points_value := game_row.current_round;
        correct_value := true;
        score_reason := 'correct_guess';
      end if;

      effect_amount := greatest(1, coalesce((effect ->> 'amount')::integer, 1));
      if candidate_record.id = millionaire and effect_kind = 'points_bonus' then
        points_value := points_value + effect_amount;
        score_reason := score_reason || '+mission_bonus';
      elsif candidate_record.id = millionaire and effect_kind = 'points_penalty' then
        points_value := points_value - effect_amount;
        score_reason := score_reason || '+mission_malus';
      end if;
    end if;

    insert into public.meta_scores(game_id, round_number, member_id, points_awarded, correct_guess, reason)
    values (target_game_id, game_row.current_round, candidate_record.id, points_value, correct_value, score_reason);
  end loop;

  update public.meta_members
  set competition_status = 'eliminated', eliminated_round = coalesce(eliminated_round, game_row.current_round), updated_at = now()
  where id = eliminated and competition_status = 'eligible';

  result_value := jsonb_build_object(
    'millionaireId', millionaire,
    'eliminatedId', eliminated,
    'millionaireSurvived', eliminated <> millionaire,
    'regularTally', regular_array,
    'effectiveTally', effective_array,
    'missingVoterIds', to_jsonb(missing_voters),
    'effect', effect || jsonb_build_object('selection', selection),
    'tieResolvedBy', tie_method,
    'published', false
  );
  round_state := round_state || jsonb_build_object('votingClosedAt', now(), 'result', result_value, 'resultPublished', false);
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'reveal_ready'
  where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'host', null, 'voting_closed', 'Stimmen verriegelt', 'Die Auswertung ist berechnet und für die Enthüllung vorbereitet.', 'critical', jsonb_build_object('missingVoters', to_jsonb(missing_voters)));
  perform public.meta_bump_revision(target_game_id, 'voting_closed');
end;
$$;
