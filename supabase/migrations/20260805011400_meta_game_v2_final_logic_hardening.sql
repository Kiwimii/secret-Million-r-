-- Final logic corrections found during the manual visual and rule audit.
-- Present eliminated players still participate in missions and challenges, while
-- an unavailable or eliminated final millionaire cannot receive the classic win.

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
    when 'M13' then 5
    else 4
  end;
  challenge_minimum := case challenge_id
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

alter function public.meta_host_advance_round(uuid)
  rename to meta_host_advance_round_final_base;

create or replace function public.meta_host_advance_round(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  current_money uuid;
  survived boolean;
  direct_winner_available boolean := false;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf fortfahren.' using errcode = '42501';
  end if;

  select * into game_row from public.meta_games where id = target_game_id for update;

  if game_row.current_round = game_row.total_rounds and game_row.final_rule = 'classic' then
    round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
    current_money := nullif(round_state ->> 'millionaireId', '')::uuid;
    survived := coalesce((round_state -> 'result' ->> 'millionaireSurvived')::boolean, false);

    if survived and current_money is not null then
      select exists (
        select 1 from public.meta_members m
        where m.id = current_money
          and m.game_id = target_game_id
          and m.attendance_status = 'present'
          and m.competition_status = 'eligible'
      ) into direct_winner_available;
    end if;

    if survived and not direct_winner_available then
      -- Force the base finalizer through its points branch for this transaction.
      -- Restore the configured rule afterwards so the game settings remain true.
      update public.meta_games set final_rule = 'points' where id = target_game_id;
      perform public.meta_host_advance_round_final_base(target_game_id);
      update public.meta_games set final_rule = 'classic' where id = target_game_id;
      return;
    end if;
  end if;

  perform public.meta_host_advance_round_final_base(target_game_id);
end;
$$;

revoke execute on function public.meta_host_advance_round_final_base(uuid) from public, anon, authenticated;
grant execute on function public.meta_host_advance_round(uuid) to authenticated;
revoke execute on function public.meta_host_advance_round(uuid) from public, anon;
