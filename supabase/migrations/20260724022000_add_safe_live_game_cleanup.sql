-- Kaskadierende Löschungen dürfen kein Refresh-Signal mehr für eine bereits
-- entfernte Partie erzeugen. Andernfalls verletzt das Signal seinen Fremdschlüssel.
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

  if resolved_game_id is not null
     and exists (select 1 from public.games g where g.id = resolved_game_id) then
    insert into public.live_game_updates (game_id, update_type)
    values (resolved_game_id, tg_table_name);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Entfernt ausschließlich künstliche Release-Testpartien aus früheren Smoke-Tests.
delete from public.games
where title like 'Automatischer Live-Test %'
   or title like 'Release-Smoke-Test %';

-- Eine Spielleitung darf ausschließlich ihre eigene Partie löschen. Die Funktion
-- wird als Security Definer ausgeführt, damit dafür keine allgemeinen DELETE-
-- Rechte auf der Tabelle games freigegeben werden müssen.
create or replace function public.delete_own_live_game(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';
  end if;

  delete from public.games g
  where g.id = target_game_id
    and g.host_user_id = auth.uid();

  if not found then
    raise exception 'Die Partie wurde nicht gefunden oder gehört nicht zu dieser Spielleitung.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.delete_own_live_game(uuid) from public;
grant execute on function public.delete_own_live_game(uuid) to authenticated;

comment on function public.delete_own_live_game(uuid) is
  'Löscht ausschließlich eine Partie, deren aktuelle Spielleitung dem angemeldeten Gerät gehört.';
