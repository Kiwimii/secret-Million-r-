-- Mission und Vorteilsart werden als ein einziges Rundenpaket gespeichert.
-- Schlägt eine der beiden Festlegungen fehl, wird keine Teiländerung übernommen.

create or replace function public.select_live_round_package(
  target_game_id uuid,
  target_round smallint,
  mission_catalog_id text,
  mission_title text,
  mission_task text,
  mission_success_criteria text,
  mission_time_window text,
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
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf Mission und Vorteilsart festlegen.' using errcode = '42501';
  end if;

  perform public.select_live_round_mission(
    target_game_id,
    target_round,
    mission_catalog_id,
    mission_title,
    mission_task,
    mission_success_criteria,
    mission_time_window
  );

  perform public.select_live_round_advantage(
    target_game_id,
    target_round,
    advantage_catalog_id,
    advantage_effect,
    advantage_title,
    advantage_description,
    advantage_player_instructions,
    advantage_host_instructions,
    advantage_limit,
    advantage_selection_mode
  );

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_selected_atomic_round_package');
end;
$$;

-- Auch direkte oder erzwungene Auswertungen dürfen einen nach Missionserfolg
-- freigeschalteten, aber noch nicht angewendeten Vorteil nicht überspringen.
create or replace function public.guard_round_result_advantage_application()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if exists (
    select 1
    from public.mission_assignments ma
    where ma.game_id = new.game_id
      and ma.round_number = new.round_number
      and ma.status = 'completed'
  ) and not exists (
    select 1
    from public.advantage_assignments aa
    where aa.game_id = new.game_id
      and aa.round_number = new.round_number
      and aa.used_at is not null
      and aa.expired_at is null
  ) then
    raise exception 'Der Millionär muss den von André festgelegten Vorteil während der Abstimmung anwenden.';
  end if;

  return new;
end;
$$;

drop trigger if exists round_results_require_applied_advantage on public.round_results;
create trigger round_results_require_applied_advantage
before insert or update on public.round_results
for each row execute function public.guard_round_result_advantage_application();

revoke all on function public.select_live_round_package(
  uuid, smallint, text, text, text, text, text,
  text, text, text, text, text, text, text, text
) from public;
grant execute on function public.select_live_round_package(
  uuid, smallint, text, text, text, text, text,
  text, text, text, text, text, text, text, text
) to authenticated;

revoke all on function public.guard_round_result_advantage_application() from public;
