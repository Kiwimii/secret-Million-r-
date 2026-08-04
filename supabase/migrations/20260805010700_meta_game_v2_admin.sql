create or replace function public.meta_host_set_member_status(
  target_game_id uuid,
  target_member_id uuid,
  new_attendance_status text default null,
  new_competition_status text default null,
  change_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  member_name text;
  invalidate_role boolean := false;
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf Teilnehmerstatus ändern.' using errcode = '42501'; end if;
  if new_attendance_status is not null and new_attendance_status not in ('present','temporarily_absent','departed') then raise exception 'Ungültiger Anwesenheitsstatus.'; end if;
  if new_competition_status is not null and new_competition_status not in ('eligible','eliminated','disqualified') then raise exception 'Ungültiger Wettbewerbsstatus.'; end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  select display_name::text into member_name from public.meta_members where id = target_member_id and game_id = target_game_id;
  if member_name is null then raise exception 'Teilnehmer nicht gefunden.'; end if;

  update public.meta_members
  set attendance_status = coalesce(new_attendance_status, attendance_status),
      competition_status = case
        when new_attendance_status = 'departed' and competition_status = 'eligible' then 'eliminated'
        else coalesce(new_competition_status, competition_status)
      end,
      eliminated_round = case
        when new_competition_status in ('eliminated','disqualified') or new_attendance_status = 'departed'
          then coalesce(eliminated_round, game_row.current_round)
        when new_competition_status = 'eligible' then null
        else eliminated_round
      end,
      departed_round = case
        when new_attendance_status = 'departed' then coalesce(departed_round, game_row.current_round)
        when new_attendance_status = 'present' then null
        else departed_round
      end,
      updated_at = now()
  where id = target_member_id;

  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  invalidate_role := (round_state ->> 'millionaireId') = target_member_id::text
    and (
      new_attendance_status in ('temporarily_absent','departed')
      or new_competition_status in ('eliminated','disqualified')
    )
    and game_row.phase not in ('reveal_ready','report','role_decision','finished');
  if invalidate_role then
    round_state := round_state || jsonb_build_object('millionaireId', null, 'roleReleased', false, 'missionPublished', false);
    update public.meta_games set state = jsonb_set(state, array['rounds', current_round::text], round_state, true), phase = 'round_setup' where id = target_game_id;
  end if;

  perform public.meta_emit_event(target_game_id, game_row.current_round, 'public', null, 'member_status_changed', 'Teilnehmerstatus geändert', member_name || ' hat jetzt einen neuen Spielstatus.', 'important', jsonb_build_object('memberId', target_member_id, 'reason', change_reason));
  perform public.meta_bump_revision(target_game_id, 'member_status_changed');
end;
$$;

create or replace function public.meta_save_note(target_game_id uuid, subject_member_id uuid, note_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member uuid := public.meta_current_member_id(target_game_id);
begin
  if own_member is null then raise exception 'Spielerprofil fehlt.' using errcode = '42501'; end if;
  if subject_member_id = own_member then raise exception 'Für dich selbst ist keine Verdachtsnotiz nötig.'; end if;
  if not exists (select 1 from public.meta_members where id = subject_member_id and game_id = target_game_id) then raise exception 'Teilnehmer nicht gefunden.'; end if;
  insert into public.meta_notes(game_id, author_member_id, subject_member_id, note, updated_at)
  values (target_game_id, own_member, subject_member_id, left(coalesce(note_text,''), 1000), now())
  on conflict (game_id, author_member_id, subject_member_id)
  do update set note = excluded.note, updated_at = now();
  perform public.meta_bump_revision(target_game_id, 'note_saved');
end;
$$;

create or replace function public.meta_mark_notifications_read(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member uuid := public.meta_current_member_id(target_game_id);
begin
  if own_member is null then return; end if;
  insert into public.meta_event_reads(event_id, member_id)
  select e.id, own_member
  from public.meta_events e
  where e.game_id = target_game_id
    and (e.visibility = 'public' or (e.visibility = 'member' and e.target_member_id = own_member))
  on conflict do nothing;
end;
$$;

create or replace function public.meta_host_set_accepting_players(target_game_id uuid, accepting boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.meta_is_host(target_game_id) then raise exception 'Nur die Spielleitung darf den Beitritt steuern.' using errcode = '42501'; end if;
  update public.meta_games set accepting_players = accepting where id = target_game_id;
  perform public.meta_bump_revision(target_game_id, 'accepting_players_changed');
end;
$$;

grant execute on function public.meta_create_game(text,text,integer,text,text) to authenticated;
grant execute on function public.meta_join_game(text,text,text,text) to authenticated;
grant execute on function public.meta_resume_host(text,text) to authenticated;
grant execute on function public.meta_get_game_view(uuid) to authenticated;
grant execute on function public.meta_host_configure_round(uuid,jsonb) to authenticated;
grant execute on function public.meta_host_draw_millionaire(uuid,boolean) to authenticated;
grant execute on function public.meta_host_release_roles(uuid) to authenticated;
grant execute on function public.meta_host_publish_mission(uuid) to authenticated;
grant execute on function public.meta_host_draw_teams(uuid) to authenticated;
grant execute on function public.meta_host_set_challenge_winner(uuid,text) to authenticated;
grant execute on function public.meta_host_set_mission_status(uuid,text) to authenticated;
grant execute on function public.meta_player_set_effect_selection(uuid,jsonb) to authenticated;
grant execute on function public.meta_host_open_voting(uuid) to authenticated;
grant execute on function public.meta_save_vote_draft(uuid,uuid) to authenticated;
grant execute on function public.meta_submit_vote(uuid,uuid) to authenticated;
grant execute on function public.meta_host_close_voting(uuid) to authenticated;
grant execute on function public.meta_host_publish_result(uuid) to authenticated;
grant execute on function public.meta_player_role_decision(uuid,text) to authenticated;
grant execute on function public.meta_host_advance_round(uuid) to authenticated;
grant execute on function public.meta_host_set_member_status(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.meta_save_note(uuid,uuid,text) to authenticated;
grant execute on function public.meta_mark_notifications_read(uuid) to authenticated;
grant execute on function public.meta_host_set_accepting_players(uuid,boolean) to authenticated;

-- Realtime-Updates für getrennte Geräte aktivieren.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meta_game_updates'
  ) then
    alter publication supabase_realtime add table public.meta_game_updates;
  end if;
end $$;

grant select on public.meta_game_updates to authenticated;

-- SECURITY DEFINER-Hilfsfunktionen sind intern und nicht direkt aufrufbar.
revoke execute on function public.meta_is_host(uuid) from public, anon, authenticated;
revoke execute on function public.meta_current_member_id(uuid) from public, anon, authenticated;
revoke execute on function public.meta_normalize_code(text) from public, anon, authenticated;
revoke execute on function public.meta_new_join_code() from public, anon, authenticated;
revoke execute on function public.meta_emit_event(uuid,smallint,text,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.meta_bump_revision(uuid,text) from public, anon, authenticated;
revoke execute on function public.meta_round_path(smallint,text) from public, anon, authenticated;
revoke execute on function public.meta_tally_add(jsonb,uuid,integer,integer) from public, anon, authenticated;
revoke execute on function public.meta_validate_vote_participants(uuid,uuid) from public, anon, authenticated;

-- Öffentliche RPC-Oberfläche explizit einschränken und freigeben.
revoke execute on function public.meta_create_game(text,text,integer,text,text) from public, anon;
revoke execute on function public.meta_join_game(text,text,text,text) from public, anon;
revoke execute on function public.meta_resume_host(text,text) from public, anon;
revoke execute on function public.meta_get_game_view(uuid) from public, anon;
revoke execute on function public.meta_host_configure_round(uuid,jsonb) from public, anon;
revoke execute on function public.meta_host_draw_millionaire(uuid,boolean) from public, anon;
revoke execute on function public.meta_host_release_roles(uuid) from public, anon;
revoke execute on function public.meta_host_publish_mission(uuid) from public, anon;
revoke execute on function public.meta_host_draw_teams(uuid) from public, anon;
revoke execute on function public.meta_host_set_challenge_winner(uuid,text) from public, anon;
revoke execute on function public.meta_host_set_mission_status(uuid,text) from public, anon;
revoke execute on function public.meta_player_set_effect_selection(uuid,jsonb) from public, anon;
revoke execute on function public.meta_host_open_voting(uuid) from public, anon;
revoke execute on function public.meta_save_vote_draft(uuid,uuid) from public, anon;
revoke execute on function public.meta_submit_vote(uuid,uuid) from public, anon;
revoke execute on function public.meta_host_close_voting(uuid) from public, anon;
revoke execute on function public.meta_host_publish_result(uuid) from public, anon;
revoke execute on function public.meta_player_role_decision(uuid,text) from public, anon;
revoke execute on function public.meta_host_advance_round(uuid) from public, anon;
revoke execute on function public.meta_host_set_member_status(uuid,uuid,text,text,text) from public, anon;
revoke execute on function public.meta_save_note(uuid,uuid,text) from public, anon;
revoke execute on function public.meta_mark_notifications_read(uuid) from public, anon;
revoke execute on function public.meta_host_set_accepting_players(uuid,boolean) from public, anon;
