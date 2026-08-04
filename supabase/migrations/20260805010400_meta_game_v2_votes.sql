create or replace function public.meta_validate_vote_participants(target_game_id uuid, target_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  own_member uuid := public.meta_current_member_id(target_game_id);
begin
  if own_member is null then raise exception 'Spielerprofil fehlt.' using errcode = '42501'; end if;
  select * into game_row from public.meta_games where id = target_game_id;
  if not exists (
    select 1 from public.meta_members m
    where m.id = own_member and m.game_id = target_game_id
      and m.attendance_status = 'present' and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  ) then raise exception 'Du bist in dieser Runde nicht abstimmungsberechtigt.'; end if;
  if target_member_id = own_member then raise exception 'Du kannst dich nicht selbst wählen.'; end if;
  if not exists (
    select 1 from public.meta_members m
    where m.id = target_member_id and m.game_id = target_game_id
      and m.attendance_status = 'present' and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round
  ) then raise exception 'Dieses Abstimmungsziel ist nicht zulässig.'; end if;
  return own_member;
end;
$$;

create or replace function public.meta_save_vote_draft(target_game_id uuid, target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  own_member uuid;
begin
  own_member := public.meta_validate_vote_participants(target_game_id, target_member_id);
  select * into game_row from public.meta_games where id = target_game_id;
  if game_row.phase in ('reveal_ready','report','role_decision','finished') then raise exception 'Für diese Runde kann kein Verdacht mehr geändert werden.'; end if;
  insert into public.meta_vote_drafts(game_id, round_number, member_id, target_member_id, updated_at)
  values (target_game_id, game_row.current_round, own_member, target_member_id, now())
  on conflict (game_id, round_number, member_id)
  do update set target_member_id = excluded.target_member_id, updated_at = now();
  perform public.meta_bump_revision(target_game_id, 'vote_draft_saved');
end;
$$;

create or replace function public.meta_submit_vote(target_game_id uuid, target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  own_member uuid;
begin
  own_member := public.meta_validate_vote_participants(target_game_id, target_member_id);
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.phase <> 'voting_open' then raise exception 'Die Abstimmung ist nicht geöffnet.'; end if;
  if exists (select 1 from public.meta_votes where game_id = target_game_id and round_number = game_row.current_round and member_id = own_member) then
    raise exception 'Deine Stimme ist bereits verbindlich eingeloggt.';
  end if;
  insert into public.meta_votes(game_id, round_number, member_id, target_member_id)
  values (target_game_id, game_row.current_round, own_member, target_member_id);
  perform public.meta_emit_event(target_game_id, game_row.current_round, 'member', own_member, 'vote_submitted', 'Stimme eingeloggt', 'Deine Stimme wurde verbindlich gespeichert.', 'important', jsonb_build_object('targetMemberId', target_member_id));
  perform public.meta_bump_revision(target_game_id, 'vote_submitted');
end;
$$;
