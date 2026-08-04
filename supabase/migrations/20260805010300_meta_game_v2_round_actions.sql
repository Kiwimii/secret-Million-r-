create or replace function public.meta_host_configure_round(target_game_id uuid, round_package jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf die Runde konfigurieren.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase not in ('lobby','round_setup') then raise exception 'Die Runde kann jetzt nicht mehr grundlegend geändert werden.'; end if;
  if round_package -> 'mission' is null or round_package -> 'challenge' is null then raise exception 'Mission und Challenge fehlen.'; end if;

  round_state := coalesce(game_row.state -> 'rounds' -> game_row.current_round::text, '{}'::jsonb)
    || jsonb_build_object(
      'number', game_row.current_round,
      'points', game_row.current_round,
      'mission', round_package -> 'mission',
      'bonus', coalesce(round_package -> 'bonus', jsonb_build_object('kind','none','title','Kein Bonus','description','')),
      'malus', coalesce(round_package -> 'malus', jsonb_build_object('kind','none','title','Kein Malus','description','')),
      'challenge', round_package -> 'challenge',
      'missionStatus', 'pending',
      'missionPublished', false,
      'challengePublished', false,
      'roleReleased', false,
      'resultPublished', false
    );

  update public.meta_games
  set state = jsonb_set(state, array['rounds', current_round::text], round_state, true),
      phase = 'round_setup'
  where id = target_game_id;
  delete from public.meta_votes where game_id = target_game_id and round_number = game_row.current_round;
  delete from public.meta_scores where game_id = target_game_id and round_number = game_row.current_round;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'host', null, 'round_configured', 'Runde vorbereitet', 'Mission, Bonus, Malus und Challenge sind hinterlegt.', 'important', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'round_configured');
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
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf auslosen.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  previous_member := nullif(round_state ->> 'millionaireId', '')::uuid;
  if coalesce((round_state ->> 'roleReleased')::boolean, false) and not force_redraw then
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
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf das Siegerteam bestätigen.' using errcode = '42501'; end if;
  if winning_team not in ('azur','gold') then raise exception 'Ungültiges Team.'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  round_state := round_state || jsonb_build_object('winningTeam', winning_team);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true) where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'challenge_winner', 'Challenge entschieden', case when winning_team = 'azur' then 'Team Azur gewinnt die Challenge.' else 'Team Gold gewinnt die Challenge.' end, 'important', jsonb_build_object('team', winning_team));
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
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf die Mission bewerten.' using errcode = '42501'; end if;
  if mission_result not in ('completed','failed','neutral') then raise exception 'Ungültiges Missionsergebnis.'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  millionaire := (round_state ->> 'millionaireId')::uuid;
  round_state := round_state || jsonb_build_object('missionStatus', mission_result);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'mission_review' where id = target_game_id;
  private_body := case mission_result when 'completed' then 'Deine Mission war erfolgreich. Der Bonus ist aktiv.' when 'failed' then 'Deine Mission ist gescheitert. Der Malus ist aktiv.' else 'Die Mission wurde neutral abgeschlossen.' end;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'member', millionaire, 'mission_result_private', 'Mission bewertet', private_body, 'critical', jsonb_build_object('status', mission_result));
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'mission_result_public', 'Die Mission wurde bewertet', 'Das Ergebnis wird bei der Auszählung vollständig aufgelöst.', 'important', '{}'::jsonb);
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
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if round_state ->> 'millionaireId' <> own_member::text then raise exception 'Nur der aktuelle Millionär kann den Effekt konfigurieren.'; end if;
  if coalesce(round_state ->> 'missionStatus', 'pending') = 'pending' then raise exception 'Die Mission wurde noch nicht bewertet.'; end if;
  round_state := round_state || jsonb_build_object('effectSelection', coalesce(effect_selection, '{}'::jsonb));
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true) where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'member', own_member, 'effect_selection_saved', 'Effektauswahl gespeichert', 'Deine Auswahl wird beim Abstimmungsschluss angewendet.', 'important', effect_selection);
  perform public.meta_bump_revision(target_game_id, 'effect_selection_saved');
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
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if coalesce(round_state ->> 'missionStatus', 'pending') = 'pending' then raise exception 'Bewerte zuerst die Mission.'; end if;
  round_state := round_state || jsonb_build_object('votingOpenedAt', now(), 'votingClosedAt', null);
  update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'voting_open' where id = target_game_id;
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'voting_opened', 'Abstimmung geöffnet', 'Prüfe deinen Verdacht und gib deine Stimme verbindlich ab.', 'critical', '{}'::jsonb);
  perform public.meta_bump_revision(target_game_id, 'voting_opened');
end;
$$;
