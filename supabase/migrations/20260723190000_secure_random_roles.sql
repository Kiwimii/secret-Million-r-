-- Verhindert, dass bestätigte Spieler den geheimen Millionär über die
-- games-Tabelle auslesen können. RLS schützt Zeilen, nicht einzelne Spalten.
drop policy if exists games_member_read on public.games;

create or replace function public.get_public_game_state(target_game_id uuid)
returns table (
  id uuid,
  title text,
  current_round smallint,
  phase public.game_phase,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf dieses Spiel.' using errcode = '42501';
  end if;

  return query
  select g.id, g.title, g.current_round, g.phase, g.revision, g.updated_at
  from public.games g
  where g.id = target_game_id;
end;
$$;

revoke all on function public.get_public_game_state(uuid) from public;
grant execute on function public.get_public_game_state(uuid) to authenticated;

comment on function public.get_public_game_state(uuid) is
  'Liefert ausschließlich den öffentlichen Spielzustand und niemals millionaire_member_id.';

create or replace function public.draw_random_millionaire(
  target_game_id uuid,
  excluded_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_member_id uuid;
  current_round_number smallint;
  role_round_number smallint;
  current_phase public.game_phase;
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die geheime Auslosung starten.'
      using errcode = '42501';
  end if;

  -- Serialisiert parallele Auslosungsversuche für dieselbe Partie.
  select current_round, phase
    into current_round_number, current_phase
  from public.games
  where id = target_game_id
  for update;

  if current_round_number is null then
    raise exception 'Spiel nicht gefunden.';
  end if;

  if current_phase in ('result', 'finished') then
    raise exception 'In dieser Phase ist keine direkte Auslosung zulässig. Nutze die Rollenentscheidung.';
  end if;

  -- In der Rollenentscheidungsphase wird bereits die Rolle der folgenden
  -- Runde vorbereitet. In allen anderen Phasen ersetzt die Ziehung den
  -- Millionär der laufenden Runde, etwa bei einer vorzeitigen Abreise.
  role_round_number := case
    when current_phase = 'role_transfer' then current_round_number + 1
    else current_round_number
  end;

  if role_round_number not between 1 and 4 then
    raise exception 'Für diese Partie existiert keine weitere Runde.';
  end if;

  select gm.id
    into selected_member_id
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.approved_at is not null
    and gm.attendance_status = 'present'
    and gm.winner_pool_status = 'eligible'
    and (excluded_member_id is null or gm.id <> excluded_member_id)
  order by gen_random_uuid()
  limit 1;

  if selected_member_id is null then
    raise exception 'Kein zulässiger Kandidat für die Millionärsrolle vorhanden.';
  end if;

  -- Zuerst alle Rollen der Zielrunde neutralisieren. So kann der partielle
  -- Unique-Index niemals vorübergehend zwei Millionäre sehen.
  insert into public.round_roles (game_id, round_number, member_id, role)
  select
    gm.game_id,
    role_round_number,
    gm.id,
    case
      when gm.winner_pool_status = 'eligible' and gm.attendance_status = 'present'
        then 'investigator'::public.game_role
      else 'none'::public.game_role
    end
  from public.game_members gm
  where gm.game_id = target_game_id
  on conflict (game_id, round_number, member_id)
  do update set role = excluded.role;

  update public.round_roles
  set role = 'millionaire'
  where game_id = target_game_id
    and round_number = role_round_number
    and member_id = selected_member_id;

  update public.games
  set millionaire_member_id = selected_member_id,
      revision = revision + 1
  where id = target_game_id
  returning revision into new_revision;

  insert into public.game_events (
    game_id,
    actor_user_id,
    event_type,
    payload,
    revision
  ) values (
    target_game_id,
    auth.uid(),
    'millionaire_randomly_drawn',
    jsonb_build_object(
      'round', role_round_number,
      'source_phase', current_phase,
      'selected_member_id', selected_member_id,
      'excluded_member_id', excluded_member_id
    ),
    new_revision
  );

  return selected_member_id;
end;
$$;

revoke all on function public.draw_random_millionaire(uuid, uuid) from public;
grant execute on function public.draw_random_millionaire(uuid, uuid) to authenticated;

comment on function public.draw_random_millionaire(uuid, uuid) is
  'Host-only Zufallsauslosung. Bei Korkenabgabe wird der bisherige Millionär ausgeschlossen; die Rolle wird für die korrekte Zielrunde gespeichert.';
