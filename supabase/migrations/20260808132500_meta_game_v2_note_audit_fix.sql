-- Fix the note audit RPC by avoiding the legacy implementation's ambiguous
-- subject_member_id reference. Keep note privacy and host audit behavior intact.

create or replace function public.meta_save_note(target_game_id uuid, subject_member_id uuid, note_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member uuid := public.meta_current_member_id(target_game_id);
  author_name text;
  subject_name text;
  visibility_mode text;
  saved_note text := left(coalesce(note_text, ''), 1000);
  active_round smallint;
begin
  if own_member is null then
    raise exception 'Spielerprofil fehlt.' using errcode = '42501';
  end if;
  if $2 = own_member then
    raise exception 'Für dich selbst ist keine Verdachtsnotiz nötig.';
  end if;

  select g.notes_visibility, g.current_round, a.display_name::text, s.display_name::text
  into visibility_mode, active_round, author_name, subject_name
  from public.meta_games g
  join public.meta_members a on a.id = own_member and a.game_id = g.id
  join public.meta_members s on s.id = $2 and s.game_id = g.id
  where g.id = target_game_id;

  if subject_name is null then
    raise exception 'Teilnehmer nicht gefunden.';
  end if;

  insert into public.meta_notes(game_id, author_member_id, subject_member_id, note, updated_at)
  values (target_game_id, own_member, $2, saved_note, now())
  on conflict (game_id, author_member_id, subject_member_id)
  do update set note = excluded.note, updated_at = now();

  if visibility_mode = 'host' then
    perform public.meta_emit_event(
      target_game_id,
      active_round,
      'host',
      null,
      'note_saved_host',
      'Aktenvermerk gespeichert',
      author_name || ' → ' || subject_name || ': ' || case
        when btrim(saved_note) = '' then 'Notiz geleert.'
        else '„' || saved_note || '“'
      end,
      'info',
      jsonb_build_object(
        'actorMemberId', own_member,
        'subjectMemberId', $2,
        'note', saved_note
      )
    );
  end if;

  perform public.meta_bump_revision(target_game_id, 'note_saved');
end;
$$;

grant execute on function public.meta_save_note(uuid, uuid, text) to authenticated;
revoke execute on function public.meta_save_note(uuid, uuid, text) from public, anon;