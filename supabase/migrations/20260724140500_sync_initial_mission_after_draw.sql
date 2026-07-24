-- Wenn André die Mission vor der ersten Millionärsauslosung auswählt,
-- wird sie unmittelbar nach der Auslosung automatisch dem geheimen Millionär zugeordnet.

create or replace function public.sync_selected_mission_to_millionaire()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  selected public.round_mission_selections%rowtype;
begin
  if new.millionaire_member_id is null
     or new.millionaire_member_id is not distinct from old.millionaire_member_id then
    return new;
  end if;

  select * into selected
  from public.round_mission_selections rms
  where rms.game_id = new.id and rms.round_number = new.current_round;

  if not found then return new; end if;

  insert into public.mission_assignments (
    game_id, round_number, assigned_member_id, catalog_id, title_snapshot,
    task_snapshot, success_criteria_snapshot, time_window_snapshot,
    status, assigned_at, reviewed_at
  ) values (
    new.id, new.current_round, new.millionaire_member_id, selected.catalog_id,
    selected.title_snapshot, selected.task_snapshot, selected.success_criteria_snapshot,
    selected.time_window_snapshot, 'assigned', now(), null
  )
  on conflict (game_id, round_number)
  do update set
    assigned_member_id = excluded.assigned_member_id,
    catalog_id = excluded.catalog_id,
    title_snapshot = excluded.title_snapshot,
    task_snapshot = excluded.task_snapshot,
    success_criteria_snapshot = excluded.success_criteria_snapshot,
    time_window_snapshot = excluded.time_window_snapshot,
    status = 'assigned',
    assigned_at = now(),
    reviewed_at = null;

  return new;
end;
$$;

drop trigger if exists games_sync_selected_mission on public.games;
create trigger games_sync_selected_mission
after update of millionaire_member_id on public.games
for each row execute function public.sync_selected_mission_to_millionaire();

revoke all on function public.sync_selected_mission_to_millionaire() from public;
