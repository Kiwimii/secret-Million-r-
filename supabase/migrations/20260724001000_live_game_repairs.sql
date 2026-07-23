-- Reparaturen für die Live-Mehrgeräte-Migration.

create or replace function public.emit_live_game_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_json jsonb;
  resolved_game_id uuid;
begin
  if tg_op = 'DELETE' then
    row_json := to_jsonb(old);
  else
    row_json := to_jsonb(new);
  end if;

  if tg_table_name = 'games' then
    resolved_game_id := nullif(row_json ->> 'id', '')::uuid;
  else
    resolved_game_id := nullif(row_json ->> 'game_id', '')::uuid;
  end if;

  if resolved_game_id is not null then
    insert into public.live_game_updates (game_id, update_type)
    values (resolved_game_id, tg_table_name);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Der Spielleiter darf die geheimen Missionsvorlagen vollständig lesen,
-- während Spieler ausschließlich die ihnen zugewiesene Mission erhalten.
grant select, insert, update, delete on public.round_mission_selections to authenticated;

-- Das informationsarme Refresh-Signal ist nur lesbar; geschrieben wird es
-- über Security-Definer-Funktionen und Trigger.
revoke insert, update, delete on public.live_game_updates from authenticated;
