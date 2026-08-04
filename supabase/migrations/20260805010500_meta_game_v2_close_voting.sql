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
  effect := case when mission_status = 'completed' then round_state -> 'bonus' when mission_status = 'failed' then round_state -> 'malus' else jsonb_build_object('kind','none') end;
  effect_kind := coalesce(effect ->> 'kind', 'none');
  selection := coalesce(round_state -> 'effectSelection', '{}'::jsonb);

  for candidate_record in
    select m.id from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  loop
    tally := tally || jsonb_build_object(candidate_record.id::text, jsonb_build_object('regularVotes',0,'adjustment',0));
  end loop;
  if tally = '{}'::jsonb then raise exception 'Keine gültigen Abstimmungsziele vorhanden.'; end if;

  for vote_record in
    select v.member_id, v.target_member_id from public.meta_votes v
    where v.game_id = target_game_id and v.round_number = game_row.current_round
  loop
    tally := public.meta_tally_add(tally, vote_record.target_member_id, 1, 0);
  end loop;

  if effect_kind = 'double_own_vote' then
    select target_member_id into actor_vote_target from public.meta_votes where game_id = target_game_id and round_number = game_row.current_round and member_id = millionaire;
    tally := public.meta_tally_add(tally, actor_vote_target, 0, 1);
  elsif effect_kind = 'block_voter' then
    selected_voter := nullif(selection ->> 'voterId','')::uuid;
    select target_member_id into source_vote_target from public.meta_votes where game_id = target_game_id and round_number = game_row.current_round and member_id = selected_voter;
    tally := public.meta_tally_add(tally, source_vote_target, 0, -1);
  elsif effect_kind = 'redirect_vote' then
    selected_voter := nullif(selection ->> 'voterId','')::uuid;
    selected_target := nullif(selection ->> 'targetId','')::uuid;
    select target_member_id into source_vote_target from public.meta_votes where game_id = target_game_id and round_number = game_row.current_round and member_id = selected_voter;
    tally := public.meta_tally_add(tally, source_vote_target, 0, -1);
    tally := public.meta_tally_add(tally, selected_target, 0, 1);
  elsif effect_kind = 'add_vote' then
    selected_target := nullif(selection ->> 'targetId','')::uuid;
    tally := public.meta_tally_add(tally, selected_target, 0, 1);
  elsif effect_kind = 'remove_self_vote' then
    tally := public.meta_tally_add(tally, millionaire, 0, -1);
  end if;

  for entry_record in select key, value from jsonb_each(tally)
  loop
    regular_value := coalesce((entry_record.value ->> 'regularVotes')::integer, 0);
    adjustment_value := coalesce((entry_record.value ->> 'adjustment')::integer, 0);
    effective_value := greatest(0, regular_value + adjustment_value);
    regular_array := regular_array || jsonb_build_array(jsonb_build_object(
      'memberId', entry_record.key, 'regularVotes', regular_value, 'adjustment', 0, 'effectiveVotes', regular_value
    ));
    effective_array := effective_array || jsonb_build_array(jsonb_build_object(
      'memberId', entry_record.key, 'regularVotes', regular_value, 'adjustment', adjustment_value, 'effectiveVotes', effective_value
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
    if candidate_record.id = millionaire and eliminated <> millionaire then
      points_value := game_row.current_round;
      score_reason := 'millionaire_survived';
    elsif candidate_record.id <> millionaire and exists (
      select 1 from public.meta_votes v
      where v.game_id = target_game_id and v.round_number = game_row.current_round
        and v.member_id = candidate_record.id and v.target_member_id = millionaire
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
  round_state := round_state || jsonb_build_object(
    'votingClosedAt', now(),
    'result', result_value,
    'resultPublished', false
  );
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'reveal_ready' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'host', null, 'voting_closed', 'Abstimmung geschlossen', 'Die Auswertung ist berechnet und bereit für die Enthüllung.', 'critical', jsonb_build_object('missingVoters', to_jsonb(missing_voters)));
  perform public.meta_bump_revision(target_game_id, 'voting_closed');
end;
$$;
