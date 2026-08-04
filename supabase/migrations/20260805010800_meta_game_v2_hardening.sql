-- Hardening after the first complete V2 release.

create or replace function public.meta_zero_positive_score_without_vote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.points_awarded > 0 and not exists (
    select 1
    from public.meta_votes v
    where v.game_id = new.game_id
      and v.round_number = new.round_number
      and v.member_id = new.member_id
  ) then
    new.points_awarded := 0;
    new.correct_guess := false;
    new.reason := 'missing_vote';
  end if;
  return new;
end;
$$;

drop trigger if exists meta_scores_require_vote on public.meta_scores;
create trigger meta_scores_require_vote
before insert or update on public.meta_scores
for each row execute function public.meta_zero_positive_score_without_vote();

create or replace function public.meta_host_set_challenge_winner(target_game_id uuid, winning_team text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf das Siegerteam bestätigen.' using errcode = '42501';
  end if;
  if winning_team not in ('azur','gold') then raise exception 'Ungültiges Team.'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase not in ('challenge','mission_review') then
    raise exception 'Das Challenge-Ergebnis kann nach Öffnung der Abstimmung nicht mehr geändert werden.';
  end if;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  round_state := round_state || jsonb_build_object('winningTeam', winning_team);
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true)
  where id = target_game_id;
  perform public.meta_emit_event(
    target_game_id, game_row.current_round, 'public', null, 'challenge_winner',
    'Challenge entschieden',
    case when winning_team = 'azur' then 'Team Azur gewinnt die Challenge.' else 'Team Gold gewinnt die Challenge.' end,
    'important', jsonb_build_object('team', winning_team)
  );
  perform public.meta_bump_revision(target_game_id, 'challenge_winner');
end;
$$;

create or replace function public.meta_host_set_mission_status(target_game_id uuid, mission_result text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  millionaire uuid;
  private_body text;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Mission bewerten.' using errcode = '42501';
  end if;
  if mission_result not in ('completed','failed','neutral') then raise exception 'Ungültiges Missionsergebnis.'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase not in ('challenge','mission_review') then
    raise exception 'Das Missionsergebnis kann nach Öffnung der Abstimmung nicht mehr geändert werden.';
  end if;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  millionaire := (round_state ->> 'millionaireId')::uuid;
  round_state := round_state || jsonb_build_object('missionStatus', mission_result);
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true),
      phase = 'mission_review'
  where id = target_game_id;
  private_body := case mission_result
    when 'completed' then 'Deine Mission war erfolgreich. Der Bonus ist aktiv.'
    when 'failed' then 'Deine Mission ist gescheitert. Der Malus ist aktiv.'
    else 'Die Mission wurde neutral abgeschlossen.'
  end;
  perform public.meta_emit_event(
    target_game_id, game_row.current_round, 'member', millionaire,
    'mission_result_private', 'Mission bewertet', private_body, 'critical',
    jsonb_build_object('status', mission_result)
  );
  perform public.meta_emit_event(
    target_game_id, game_row.current_round, 'public', null,
    'mission_result_public', 'Die Mission wurde bewertet',
    'Das Ergebnis wird bei der Auszählung vollständig aufgelöst.', 'important', '{}'::jsonb
  );
  perform public.meta_bump_revision(target_game_id, 'mission_result');
end;
$$;

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
  round_state := round_state || jsonb_build_object('effectSelection', coalesce(effect_selection, '{}'::jsonb));
  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true)
  where id = target_game_id;
  perform public.meta_emit_event(
    target_game_id, game_row.current_round, 'member', own_member,
    'effect_selection_saved', 'Effektauswahl gespeichert',
    'Deine Auswahl wird beim Abstimmungsschluss angewendet.', 'important', effect_selection
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
  if was_released and not force_redraw then
    raise exception 'Die Rolle wurde bereits veröffentlicht. Nutze die bestätigte Notfall-Neuauslosung.';
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

create or replace function public.meta_delete_own_game(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die eigene Testpartie löschen.' using errcode = '42501';
  end if;
  delete from public.meta_games where id = target_game_id;
end;
$$;

grant execute on function public.meta_delete_own_game(uuid) to authenticated;
revoke execute on function public.meta_delete_own_game(uuid) from public, anon;
revoke execute on function public.meta_zero_positive_score_without_vote() from public, anon, authenticated;
