alter type public.role_decision_type add value if not exists 'release';

-- Die geheime Rolle darf nicht über ein direktes Client-Update gesetzt werden.
-- Phasenänderungen erfolgen später über revisionsgesicherte RPCs; die Auslosung
-- ausschließlich über draw_random_millionaire/resolve_random_role_transfer.
revoke update on public.games from authenticated;
grant update (title, current_round, phase) on public.games to authenticated;

create or replace function public.resolve_random_role_transfer(
  target_game_id uuid,
  completed_round smallint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_millionaire_id uuid;
  current_decision public.role_decision_type;
  missing_count integer;
  selected_member_id uuid;
  next_round smallint;
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf die Rollenentscheidung auflösen.'
      using errcode = '42501';
  end if;

  if completed_round not between 1 and 3 then
    raise exception 'Eine Rollenentscheidung ist nur nach Runde 1 bis 3 zulässig.';
  end if;

  next_round := completed_round + 1;

  select millionaire_member_id
    into current_millionaire_id
  from public.games
  where id = target_game_id
    and current_round = completed_round
    and phase = 'role_transfer'
  for update;

  if not found then
    raise exception 'Das Spiel befindet sich nicht in der passenden Rollenentscheidungsphase.';
  end if;

  select count(*)
    into missing_count
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.approved_at is not null
    and gm.attendance_status = 'present'
    and gm.winner_pool_status = 'eligible'
    and not exists (
      select 1
      from public.role_decisions rd
      where rd.game_id = target_game_id
        and rd.after_round = completed_round
        and rd.member_id = gm.id
    );

  if missing_count > 0 then
    raise exception 'Es fehlen noch % Rollenentscheidungen.', missing_count;
  end if;

  if current_millionaire_id is null then
    -- Der bisherige Millionär wurde enttarnt oder ist ausgefallen. Die neue
    -- Rolle wird aus allen verbliebenen Berechtigten zufällig gezogen.
    selected_member_id := public.draw_random_millionaire(target_game_id, null);
    return selected_member_id;
  end if;

  select decision
    into current_decision
  from public.role_decisions
  where game_id = target_game_id
    and after_round = completed_round
    and member_id = current_millionaire_id;

  if current_decision::text = 'keep' then
    -- Auch beim Behalten wird für die folgende Runde ein vollständiger,
    -- eigener Rollensatz angelegt. Die alte Rundenhistorie bleibt unverändert.
    insert into public.round_roles (game_id, round_number, member_id, role)
    select
      gm.game_id,
      next_round,
      gm.id,
      case
        when gm.id = current_millionaire_id
          then 'millionaire'::public.game_role
        when gm.winner_pool_status = 'eligible' and gm.attendance_status = 'present'
          then 'investigator'::public.game_role
        else 'none'::public.game_role
      end
    from public.game_members gm
    where gm.game_id = target_game_id
    on conflict (game_id, round_number, member_id)
    do update set role = excluded.role;

    update public.games
    set revision = revision + 1
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
      'millionaire_kept_cork',
      jsonb_build_object(
        'completed_round', completed_round,
        'next_round', next_round,
        'millionaire_member_id', current_millionaire_id
      ),
      new_revision
    );

    return current_millionaire_id;
  end if;

  if current_decision::text in ('release', 'transfer') then
    -- transfer bleibt nur aus Kompatibilitätsgründen im alten Enum. Eine
    -- Zielperson wird ausdrücklich ignoriert. Der Nachfolger wird ausgelost.
    selected_member_id := public.draw_random_millionaire(
      target_game_id,
      current_millionaire_id
    );
    return selected_member_id;
  end if;

  raise exception 'Die Korkenentscheidung des aktuellen Millionärs ist ungültig oder fehlt.';
end;
$$;

revoke all on function public.resolve_random_role_transfer(uuid, smallint) from public;
grant execute on function public.resolve_random_role_transfer(uuid, smallint) to authenticated;

comment on function public.resolve_random_role_transfer(uuid, smallint) is
  'Löst Behalten oder Abgeben aus. Bei Abgabe wird der Nachfolger geheim und zufällig bestimmt; target_member_id wird nicht verwendet.';
