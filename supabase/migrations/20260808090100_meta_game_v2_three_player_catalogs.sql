-- Add Akte Midas missions and challenges that are intentionally playable with three present participants.
-- The public configure RPC keeps server-authoritative catalog validation and minimum participant counts.

create or replace function public.meta_host_configure_round_catalog_base(target_game_id uuid, round_package jsonb)
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
  if mission_id not in ('M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14','M15','M16','M17','M18','M19','M20','M21','M22','M23','M24') then
    raise exception 'Ungültige oder fehlende Missionsauswahl. Bitte die Seite aktualisieren.';
  end if;
  if challenge_id not in ('C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16','C17','C18','C19','C20','C21','C22','C23','C24') then
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

create or replace function public.meta_host_configure_round(target_game_id uuid, round_package jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  mission_id text := nullif(round_package #>> '{mission,catalogId}', '');
  challenge_id text := nullif(round_package #>> '{challenge,catalogId}', '');
  available_count integer;
  mission_minimum integer;
  challenge_minimum integer;
  required_count integer;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Runde konfigurieren.' using errcode = '42501';
  end if;

  select * into game_row from public.meta_games where id = target_game_id for update;

  mission_minimum := case mission_id
    when 'M21' then 3
    when 'M22' then 3
    when 'M23' then 3
    when 'M24' then 3
    when 'M13' then 5
    else 4
  end;
  challenge_minimum := case challenge_id
    when 'C21' then 3
    when 'C22' then 3
    when 'C23' then 3
    when 'C24' then 3
    when 'C08' then 6
    else 4
  end;
  required_count := greatest(mission_minimum, challenge_minimum);

  select count(*) into available_count
  from public.meta_members m
  where m.game_id = target_game_id
    and m.attendance_status = 'present'
    and m.competition_status <> 'disqualified'
    and m.active_from_round <= game_row.current_round;

  if available_count < required_count then
    raise exception 'Dieses Rundenpaket benötigt mindestens % anwesende Teilnehmer; verfügbar sind %.', required_count, available_count;
  end if;

  perform public.meta_host_configure_round_catalog_base(target_game_id, round_package);
end;
$$;

revoke execute on function public.meta_host_configure_round_catalog_base(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.meta_host_configure_round(uuid, jsonb) to authenticated;
revoke execute on function public.meta_host_configure_round(uuid, jsonb) from public, anon;