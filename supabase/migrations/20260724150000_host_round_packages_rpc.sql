-- Lädt Andrés Missions- und Vorteilsfestlegungen ohne direkten Tabellenzugriff aus dem Browser.
create or replace function public.get_live_host_round_packages(target_game_id uuid)
returns table (
  round_number smallint,
  mission_catalog_id text,
  advantage_catalog_id text
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die geheimen Rundenpakete sehen.' using errcode = '42501';
  end if;

  return query
  select
    rounds.round_number::smallint,
    mission.catalog_id,
    advantage.catalog_id
  from generate_series(1, 4) as rounds(round_number)
  left join public.round_mission_selections mission
    on mission.game_id = target_game_id
   and mission.round_number = rounds.round_number
  left join public.round_advantage_selections advantage
    on advantage.game_id = target_game_id
   and advantage.round_number = rounds.round_number
  order by rounds.round_number;
end;
$$;

revoke all on function public.get_live_host_round_packages(uuid) from public;
grant execute on function public.get_live_host_round_packages(uuid) to authenticated;

comment on function public.get_live_host_round_packages(uuid) is
  'Host-only RPC für Missions- und Vorteilsfestlegungen; verhindert direkten Browserzugriff auf geheime Tabellen.';
