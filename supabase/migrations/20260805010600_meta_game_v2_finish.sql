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

create or replace function public.meta_player_role_decision(target_game_id uuid, role_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  own_member uuid := public.meta_current_member_id(target_game_id);
begin
  if role_decision not in ('keep','transfer') then raise exception 'Ungültige Rollenentscheidung.'; end if;
  if own_member is null then raise exception 'Spielerprofil fehlt.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if round_state ->> 'millionaireId' <> own_member::text then raise exception 'Nur der aktuelle Millionär darf entscheiden.'; end if;
  if not coalesce((round_state -> 'result' ->> 'millionaireSurvived')::boolean, false) then raise exception 'Der enttarnte Millionär kann die Rolle nicht behalten.'; end if;
  if game_row.phase not in ('report','role_decision') then raise exception 'Die Rollenentscheidung ist noch nicht geöffnet.'; end if;
  round_state := round_state || jsonb_build_object('roleDecision', role_decision);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'role_decision' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'member', own_member, 'role_decision_saved', 'Rollenentscheidung gespeichert', case when role_decision = 'keep' then 'Du möchtest Millionär bleiben.' else 'Du gibst die Rolle für die nächste Runde ab.' end, 'important', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'role_decision_saved');
end;
$$;

create or replace function public.meta_host_advance_round(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  next_round_state jsonb;
  current_money uuid;
  next_money uuid;
  survived boolean;
  decision text;
  leaderboard jsonb;
  timeline jsonb;
  winner uuid;
  winner_reason text;
  final_result jsonb;
  candidate_count integer;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf fortfahren.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if not coalesce((round_state ->> 'resultPublished')::boolean, false) then raise exception 'Veröffentliche zuerst das Rundenergebnis.'; end if;

  current_money := (round_state ->> 'millionaireId')::uuid;
  survived := coalesce((round_state -> 'result' ->> 'millionaireSurvived')::boolean, false);
  decision := coalesce(round_state ->> 'roleDecision', 'keep');

  if game_row.current_round = game_row.total_rounds then
    select coalesce(jsonb_agg(jsonb_build_object(
      'memberId', m.id,
      'points', coalesce(s.points,0),
      'correctGuesses', coalesce(s.correct_guesses,0)
    ) order by coalesce(s.points,0) desc, coalesce(s.correct_guesses,0) desc, m.display_name), '[]'::jsonb)
    into leaderboard
    from public.meta_members m
    left join (
      select member_id, sum(points_awarded)::integer points, count(*) filter (where correct_guess)::integer correct_guesses
      from public.meta_scores where game_id = target_game_id group by member_id
    ) s on s.member_id = m.id
    where m.game_id = target_game_id;

    if game_row.final_rule = 'classic' and survived then
      winner := current_money;
      winner_reason := 'final_millionaire_survived';
    else
      select m.id into winner
      from public.meta_members m
      left join (
        select member_id, sum(points_awarded)::integer points, count(*) filter (where correct_guess)::integer correct_guesses
        from public.meta_scores where game_id = target_game_id group by member_id
      ) s on s.member_id = m.id
      where m.game_id = target_game_id
        and m.competition_status = 'eligible'
        and m.attendance_status <> 'departed'
      order by coalesce(s.points,0) desc, coalesce(s.correct_guesses,0) desc, random()
      limit 1;
      if winner is null then
        select m.id into winner from public.meta_members m where m.game_id = target_game_id and m.competition_status <> 'disqualified' order by random() limit 1;
      end if;
      winner_reason := 'points';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'roundNumber', r.n,
      'millionaireId', game_row.state -> 'rounds' -> r.n::text ->> 'millionaireId',
      'eliminatedId', game_row.state -> 'rounds' -> r.n::text -> 'result' ->> 'eliminatedId',
      'mission', game_row.state -> 'rounds' -> r.n::text -> 'mission',
      'missionStatus', game_row.state -> 'rounds' -> r.n::text ->> 'missionStatus',
      'winningTeam', game_row.state -> 'rounds' -> r.n::text ->> 'winningTeam',
      'effect', game_row.state -> 'rounds' -> r.n::text -> 'result' -> 'effect',
      'votes', coalesce((
        select jsonb_agg(jsonb_build_object('voterId', v.member_id, 'targetId', v.target_member_id) order by v.submitted_at)
        from public.meta_votes v where v.game_id = target_game_id and v.round_number = r.n
      ), '[]'::jsonb),
      'scores', coalesce((
        select jsonb_agg(jsonb_build_object('memberId', sc.member_id, 'pointsAwarded', sc.points_awarded, 'correctGuess', sc.correct_guess) order by sc.member_id)
        from public.meta_scores sc where sc.game_id = target_game_id and sc.round_number = r.n
      ), '[]'::jsonb)
    ) order by r.n), '[]'::jsonb)
    into timeline
    from generate_series(1, game_row.total_rounds) as r(n);

    final_result := jsonb_build_object(
      'winnerId', winner,
      'reason', winner_reason,
      'leaderboard', leaderboard,
      'timeline', timeline
    );
    update public.meta_games
    set state = jsonb_set(state, '{finalResult}', final_result, true), phase = 'finished', accepting_players = false
    where id = target_game_id;
    perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'game_finished', 'Das große Finale beginnt', 'Die vollständige Spielgeschichte und der Gewinner werden enthüllt.', 'critical', jsonb_build_object('winnerId', winner));
    perform public.meta_bump_revision(target_game_id, 'game_finished');
    return;
  end if;

  if survived and decision = 'keep' and exists (
    select 1 from public.meta_members m where m.id = current_money and m.attendance_status = 'present' and m.competition_status = 'eligible'
  ) then
    next_money := current_money;
  else
    select count(*) into candidate_count from public.meta_members m
    where m.game_id = target_game_id and m.attendance_status = 'present' and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round + 1;
    if candidate_count = 0 then raise exception 'Für die nächste Runde gibt es keinen gültigen Millionär.'; end if;
    select m.id into next_money
    from public.meta_members m
    where m.game_id = target_game_id and m.attendance_status = 'present' and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round + 1
      and (candidate_count = 1 or decision <> 'transfer' or m.id <> current_money)
    order by random() limit 1;
  end if;

  next_round_state := coalesce(game_row.state -> 'rounds' -> (game_row.current_round + 1)::text, '{}'::jsonb)
    || jsonb_build_object(
      'number', game_row.current_round + 1,
      'points', game_row.current_round + 1,
      'millionaireId', next_money,
      'roleReleased', false,
      'missionPublished', false,
      'missionStatus', 'pending',
      'challengePublished', false,
      'resultPublished', false
    );
  update public.meta_games
  set current_round = current_round + 1,
      state = jsonb_set(state, array['rounds', (current_round + 1)::text], next_round_state, true),
      phase = 'round_setup'
  where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round + 1, 'public', null, 'round_started', 'Neue Runde vorbereitet', 'Runde ' || (game_row.current_round + 1)::text || ' beginnt. Die Rolle bleibt bis zur Freigabe versiegelt.', 'important', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'round_started');
end;
$$;
