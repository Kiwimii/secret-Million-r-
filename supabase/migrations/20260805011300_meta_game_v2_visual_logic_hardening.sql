-- Visual and game-logic hardening.
-- Enforces catalog player counts, validates the live millionaire before voting,
-- prevents eliminated players from being reactivated, and cleans invalid votes
-- when participant status changes during an active round.

alter function public.meta_host_configure_round(uuid, jsonb)
  rename to meta_host_configure_round_catalog_base;

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
  active_count integer;
  mission_minimum integer;
  challenge_minimum integer;
  required_count integer;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Runde konfigurieren.' using errcode = '42501';
  end if;

  select * into game_row from public.meta_games where id = target_game_id for update;

  mission_minimum := case mission_id
    when 'M13' then 5
    else 4
  end;
  challenge_minimum := case challenge_id
    when 'C08' then 6
    else 4
  end;
  required_count := greatest(mission_minimum, challenge_minimum);

  select count(*) into active_count
  from public.meta_members m
  where m.game_id = target_game_id
    and m.attendance_status = 'present'
    and m.competition_status = 'eligible'
    and m.active_from_round <= game_row.current_round;

  if active_count < required_count then
    raise exception 'Dieses Rundenpaket benötigt mindestens % aktive Spieler; verfügbar sind %.', required_count, active_count;
  end if;

  perform public.meta_host_configure_round_catalog_base(target_game_id, round_package);
end;
$$;

revoke execute on function public.meta_host_configure_round_catalog_base(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.meta_host_configure_round(uuid, jsonb) to authenticated;
revoke execute on function public.meta_host_configure_round(uuid, jsonb) from public, anon;

alter function public.meta_host_open_voting(uuid)
  rename to meta_host_open_voting_phase_base;

create or replace function public.meta_host_open_voting(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  millionaire uuid;
  eligible_count integer;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Abstimmung öffnen.' using errcode = '42501';
  end if;

  select * into game_row from public.meta_games where id = target_game_id for update;
  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  millionaire := nullif(round_state ->> 'millionaireId', '')::uuid;

  if millionaire is null or not exists (
    select 1 from public.meta_members m
    where m.id = millionaire
      and m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  ) then
    raise exception 'Der aktuelle Millionär ist nicht mehr spielberechtigt. Lose die Rolle neu aus.';
  end if;

  select count(*) into eligible_count
  from public.meta_members m
  where m.game_id = target_game_id
    and m.attendance_status = 'present'
    and m.competition_status = 'eligible'
    and m.active_from_round <= game_row.current_round;

  if eligible_count < 2 then
    raise exception 'Für eine Abstimmung werden mindestens zwei aktive Spieler benötigt.';
  end if;

  perform public.meta_host_open_voting_phase_base(target_game_id);
end;
$$;

revoke execute on function public.meta_host_open_voting_phase_base(uuid) from public, anon, authenticated;
grant execute on function public.meta_host_open_voting(uuid) to authenticated;
revoke execute on function public.meta_host_open_voting(uuid) from public, anon;

alter function public.meta_host_set_member_status(uuid, uuid, text, text, text)
  rename to meta_host_set_member_status_base;

create or replace function public.meta_host_set_member_status(
  target_game_id uuid,
  target_member_id uuid,
  new_attendance_status text default null,
  new_competition_status text default null,
  change_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  member_row public.meta_members%rowtype;
  round_state jsonb;
  was_millionaire boolean := false;
  becomes_unavailable boolean := false;
  can_affect_round boolean := false;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf Teilnehmerstatus ändern.' using errcode = '42501';
  end if;

  select * into game_row from public.meta_games where id = target_game_id for update;
  select * into member_row
  from public.meta_members
  where id = target_member_id and game_id = target_game_id
  for update;
  if not found then raise exception 'Teilnehmer nicht gefunden.'; end if;

  if member_row.competition_status in ('eliminated','disqualified')
     and new_competition_status = 'eligible' then
    raise exception 'Ausgeschiedene oder disqualifizierte Spieler können nicht wieder in die Wertung aufgenommen werden.';
  end if;

  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  was_millionaire := (round_state ->> 'millionaireId') = target_member_id::text;
  becomes_unavailable :=
    new_attendance_status in ('temporarily_absent','departed')
    or new_competition_status in ('eliminated','disqualified');
  can_affect_round := game_row.phase in (
    'lobby','round_setup','role_released','mission','challenge','mission_review','voting_open'
  );

  perform public.meta_host_set_member_status_base(
    target_game_id,
    target_member_id,
    new_attendance_status,
    new_competition_status,
    change_reason
  );

  if becomes_unavailable and can_affect_round then
    if was_millionaire then
      delete from public.meta_votes
      where game_id = target_game_id and round_number = game_row.current_round;
      delete from public.meta_vote_drafts
      where game_id = target_game_id and round_number = game_row.current_round;
      delete from public.meta_scores
      where game_id = target_game_id and round_number = game_row.current_round;

      select state -> 'rounds' -> current_round::text into round_state
      from public.meta_games where id = target_game_id;
      round_state := round_state || jsonb_build_object(
        'millionaireId', null,
        'roleReleased', false,
        'missionPublished', false,
        'missionStatus', 'pending',
        'challengePublished', false,
        'teams', null,
        'winningTeam', null,
        'effectSelection', null,
        'result', null,
        'resultPublished', false,
        'votingOpenedAt', null,
        'votingClosedAt', null
      );
      update public.meta_games
      set state = jsonb_set(state, array['rounds', current_round::text], round_state, true),
          phase = 'round_setup'
      where id = target_game_id;
    else
      delete from public.meta_votes
      where game_id = target_game_id
        and round_number = game_row.current_round
        and (member_id = target_member_id or target_member_id = public.meta_host_set_member_status.target_member_id);
      delete from public.meta_vote_drafts
      where game_id = target_game_id
        and round_number = game_row.current_round
        and (member_id = target_member_id or target_member_id = public.meta_host_set_member_status.target_member_id);

      select state -> 'rounds' -> current_round::text into round_state
      from public.meta_games where id = target_game_id;
      if round_state -> 'effectSelection' ->> 'voterId' = target_member_id::text
         or round_state -> 'effectSelection' ->> 'targetId' = target_member_id::text then
        round_state := round_state || jsonb_build_object('effectSelection', null);
        update public.meta_games
        set state = jsonb_set(state, array['rounds', current_round::text], round_state, true)
        where id = target_game_id;
      end if;
    end if;

    perform public.meta_bump_revision(target_game_id, 'member_status_round_cleanup');
  end if;
end;
$$;

revoke execute on function public.meta_host_set_member_status_base(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.meta_host_set_member_status(uuid, uuid, text, text, text) to authenticated;
revoke execute on function public.meta_host_set_member_status(uuid, uuid, text, text, text) from public, anon;
