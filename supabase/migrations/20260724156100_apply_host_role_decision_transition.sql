-- Härtet auch die bereits vorhandene Sammel-Notfallfunktion ab.
-- Dadurch funktioniert die bestehende Oberfläche ohne Frontend-Umbau.

create or replace function public.prepare_host_rescued_role_decision()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if public.is_game_host(new.game_id) then
    if new.decision::text = 'keep' then
      new.host_confirmed_at := coalesce(new.host_confirmed_at, now());
    elsif new.decision::text = 'release' then
      new.host_confirmed_at := null;
      new.rejected_target_ids := '{}'::uuid[];
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.advance_after_host_rescued_role_decision()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
begin
  if not public.is_game_host(new.game_id) or new.decision::text <> 'keep' then
    return new;
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = new.game_id;

  if active_phase = 'role_transfer'
     and active_round = new.after_round
     and active_round between 1 and 3 then
    perform public.start_live_next_round(new.game_id, active_round);
  end if;

  return new;
end;
$$;

drop trigger if exists role_decisions_prepare_host_recovery on public.role_decisions;
create trigger role_decisions_prepare_host_recovery
before insert or update of decision, target_member_id
on public.role_decisions
for each row
execute function public.prepare_host_rescued_role_decision();

drop trigger if exists role_decisions_advance_host_recovery on public.role_decisions;
create trigger role_decisions_advance_host_recovery
after insert or update of decision, target_member_id
on public.role_decisions
for each row
execute function public.advance_after_host_rescued_role_decision();
