-- Akte Midas fixed catalog validation and new straight-forward malus effects.

create or replace function public.meta_host_configure_round(target_game_id uuid, round_package jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  mission_id text := nullif(round_package #>> '{mission,catalogId}', '');
  challenge_id text := nullif(round_package #>> '{challenge,catalogId}', '');
  bonus_id text := nullif(round_package #>> '{bonus,catalogId}', '');
  malus_id text := nullif(round_package #>> '{malus,catalogId}', '');
  bonus_definition jsonb;
  malus_definition jsonb;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Runde konfigurieren.' using errcode = '42501';
  end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase not in ('lobby','round_setup') then
    raise exception 'Die Runde kann jetzt nicht mehr grundlegend geändert werden.';
  end if;
  if mission_id not in ('M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14','M15','M16','M17','M18','M19','M20') then
    raise exception 'Ungültige oder fehlende Missionsauswahl. Bitte die Seite aktualisieren.';
  end if;
  if challenge_id not in ('C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16','C17','C18','C19','C20') then
    raise exception 'Ungültige oder fehlende Challenge-Auswahl. Bitte die Seite aktualisieren.';
  end if;
  bonus_definition := case bonus_id
    when 'B01' then '{"catalogId":"B01","kind":"double_own_vote","title":"Doppelmandat","description":"Die eigene Stimme des Millionärs zählt bei der Auswertung doppelt.","selectionMode":"none"}'::jsonb
    when 'B02' then '{"catalogId":"B02","kind":"block_voter","title":"Störsender","description":"Die Stimme eines vorher ausgewählten Spielers wird nicht gewertet.","selectionMode":"voter"}'::jsonb
    when 'B03' then '{"catalogId":"B03","kind":"redirect_vote","title":"Umleitung","description":"Die Stimme eines ausgewählten Spielers wird auf eine ausgewählte Zielperson umgeleitet.","selectionMode":"source_and_target"}'::jsonb
    when 'B04' then '{"catalogId":"B04","kind":"add_vote","title":"Schattenstimme","description":"Eine zusätzliche Stimme wird auf eine ausgewählte Zielperson gesetzt.","selectionMode":"target"}'::jsonb
    when 'B05' then '{"catalogId":"B05","kind":"remove_self_vote","title":"Spurenwischer","description":"Eine gegen den Millionär gerichtete Stimme wird entfernt.","selectionMode":"none"}'::jsonb
    when 'B06' then '{"catalogId":"B06","kind":"points_bonus","title":"Erfolgsprämie","description":"Der Millionär erhält einen zusätzlichen Punkt.","selectionMode":"none","amount":1}'::jsonb
    else null
  end;
  malus_definition := case malus_id
    when 'X01' then '{"catalogId":"X01","kind":"cancel_own_vote","title":"Stimmenverlust","description":"Die eigene Stimme des Millionärs wird nicht gewertet.","selectionMode":"none"}'::jsonb
    when 'X02' then '{"catalogId":"X02","kind":"add_vote_against_self","title":"Offene Flanke","description":"Eine zusätzliche Stimme wird gegen den Millionär gesetzt.","selectionMode":"none"}'::jsonb
    when 'X03' then '{"catalogId":"X03","kind":"points_penalty","title":"Punktabzug","description":"Dem Millionär wird ein Punkt abgezogen.","selectionMode":"none","amount":1}'::jsonb
    when 'X04' then '{"catalogId":"X04","kind":"points_penalty","title":"Doppelter Punktabzug","description":"Dem Millionär werden zwei Punkte abgezogen.","selectionMode":"none","amount":2}'::jsonb
    when 'X05' then '{"catalogId":"X05","kind":"none","title":"Kein Schutz","description":"Bei Misserfolg wird kein zusätzlicher Missionseffekt angewendet.","selectionMode":"none"}'::jsonb
    else null
  end;
  if bonus_definition is null then raise exception 'Ungültige oder fehlende Bonus-Auswahl. Bitte die Seite aktualisieren.'; end if;
  if malus_definition is null then raise exception 'Ungültige oder fehlende Malus-Auswahl. Bitte die Seite aktualisieren.'; end if;
  round_state := coalesce(game_row.state -> 'rounds' -> game_row.current_round::text, '{}'::jsonb)
    || jsonb_build_object(
      'number', game_row.current_round,
      'points', game_row.current_round,
      'mission', round_package -> 'mission',
      'bonus', bonus_definition,
      'malus', malus_definition,
      'challenge', round_package -> 'challenge',
      'missionStatus', 'pending',
      'missionPublished', false,
      'challengePublished', false,
      'roleReleased', false,
      'resultPublished', false
    );
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'round_setup'
  where id = target_game_id;
  delete from public.meta_votes where game_id = target_game_id and round_number = game_row.current_round;
  delete from public.meta_scores where game_id = target_game_id and round_number = game_row.current_round;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'host', null, 'round_configured', 'Rundenakte versiegelt', 'Mission, Feldoperation, Bonus und Malus wurden aus dem verbindlichen Katalog übernommen.', 'important', jsonb_build_object('missionId', mission_id, 'challengeId', challenge_id, 'bonusId', bonus_id, 'malusId', malus_id));
  perform public.meta_bump_revision(target_game_id, 'round_configured');
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
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Abstimmung schließen.' using errcode = '42501';
  end if;

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
    select target_member_id into actor_vote_target
    from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = millionaire;
    if actor_vote_target is not null then
      tally := public.meta_tally_add(tally, actor_vote_target, 0, 1);
    end if;
  elsif effect_kind = 'block_voter' then
    selected_voter := nullif(selection ->> 'voterId','')::uuid;
    select target_member_id into source_vote_target
    from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = selected_voter;
    if source_vote_target is not null then
      tally := public.meta_tally_add(tally, source_vote_target, 0, -1);
    end if;
  elsif effect_kind = 'redirect_vote' then
    selected_voter := nullif(selection ->> 'voterId','')::uuid;
    selected_target := nullif(selection ->> 'targetId','')::uuid;
    select target_member_id into source_vote_target
    from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = selected_voter;
    if source_vote_target is not null and selected_target is not null then
      tally := public.meta_tally_add(tally, source_vote_target, 0, -1);
      tally := public.meta_tally_add(tally, selected_target, 0, 1);
    end if;
  elsif effect_kind = 'add_vote' then
    selected_target := nullif(selection ->> 'targetId','')::uuid;
    if selected_target is not null then
      tally := public.meta_tally_add(tally, selected_target, 0, 1);
    end if;
  elsif effect_kind = 'remove_self_vote' then
    tally := public.meta_tally_add(tally, millionaire, 0, -1);
  elsif effect_kind = 'cancel_own_vote' then
    select target_member_id into actor_vote_target
    from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = millionaire;
    if actor_vote_target is not null then
      tally := public.meta_tally_add(tally, actor_vote_target, 0, -1);
    end if;
  elsif effect_kind = 'add_vote_against_self' then
    tally := public.meta_tally_add(tally, millionaire, 0, 1);
  end if;

  for entry_record in select key, value from jsonb_each(tally)
  loop
    regular_value := coalesce((entry_record.value ->> 'regularVotes')::integer, 0);
    adjustment_value := coalesce((entry_record.value ->> 'adjustment')::integer, 0);
    effective_value := greatest(0, regular_value + adjustment_value);

    regular_array := regular_array || jsonb_build_array(jsonb_build_object(
      'memberId', entry_record.key,
      'regularVotes', regular_value,
      'adjustment', 0,
      'effectiveVotes', regular_value
    ));

    effective_array := effective_array || jsonb_build_array(jsonb_build_object(
      'memberId', entry_record.key,
      'regularVotes', regular_value,
      'adjustment', adjustment_value,
      'effectiveVotes', effective_value
    ));

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
      select 1
      from public.meta_votes v
      where v.game_id = target_game_id
        and v.round_number = game_row.current_round
        and v.member_id = m.id
    );

  delete from public.meta_scores where game_id = target_game_id and round_number = game_row.current_round;

  for candidate_record in
    select m.*
    from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  loop
    points_value := 0;
    correct_value := false;
    score_reason := 'no_points';

    if candidate_record.id = millionaire and eliminated <> millionaire then
      points_value := game_row.current_round;
      score_reason := 'millionaire_survived';
    elsif candidate_record.id <> millionaire and exists (
      select 1
      from public.meta_votes v
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

    insert into public.meta_scores(game_id, round_number, member_id, points_awarded, correct_guess, reason)
    values (target_game_id, game_row.current_round, candidate_record.id, points_value, correct_value, score_reason);
  end loop;

  update public.meta_members
  set competition_status = 'eliminated',
      eliminated_round = coalesce(eliminated_round, game_row.current_round),
      updated_at = now()
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

  round_state := round_state || jsonb_build_object(
    'votingClosedAt', now(),
    'result', result_value,
    'resultPublished', false
  );

  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true),
      phase = 'reveal_ready'
  where id = target_game_id;

  perform public.meta_emit_event(
    target_game_id,
    game_row.current_round,
    'host',
    null,
    'voting_closed',
    'Stimmen verriegelt',
    'Die Auswertung ist berechnet und für die Enthüllung vorbereitet.',
    'critical',
    jsonb_build_object('missingVoters', to_jsonb(missing_voters))
  );
  perform public.meta_bump_revision(target_game_id, 'voting_closed');
end;
$$;
