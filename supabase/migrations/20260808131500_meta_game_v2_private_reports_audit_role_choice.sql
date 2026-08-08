-- Keep the millionaire secret between rounds, enrich the host audit trail,
-- and let the millionaire's private keep/transfer decision start the next round.

alter function public.meta_get_game_view(uuid)
  rename to meta_get_game_view_report_privacy_base;

create or replace function public.meta_get_game_view(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  view_json jsonb;
  round_json jsonb;
  result_json jsonb;
  history_json jsonb := '[]'::jsonb;
  host_events_json jsonb := '[]'::jsonb;
  host_access boolean;
begin
  view_json := public.meta_get_game_view_report_privacy_base(target_game_id);
  host_access := coalesce((view_json ->> 'isHost')::boolean, false);

  if host_access then
    select coalesce(jsonb_agg(event_json order by created_at desc), '[]'::jsonb)
    into host_events_json
    from (
      select
        e.created_at,
        jsonb_build_object(
          'id', e.id,
          'roundNumber', e.round_number,
          'eventType', e.event_type,
          'title', case
            when e.event_type = 'vote_submitted' then 'Stimme abgegeben'
            when e.event_type = 'effect_selection_saved' then 'Missionsfolge konfiguriert'
            when e.event_type = 'role_decision_saved' then 'Rollenentscheidung getroffen'
            else e.title
          end,
          'body', case
            when e.event_type = 'vote_submitted' and actor.display_name is not null
              then actor.display_name::text || ' hat seine Stimme verbindlich abgegeben.'
            when e.event_type = 'effect_selection_saved' and actor.display_name is not null
              then actor.display_name::text || ' hat die Zielauswahl für den Missionseffekt gespeichert.'
            when e.event_type = 'role_decision_saved' and actor.display_name is not null
              then actor.display_name::text || ' hat die private Rollenentscheidung getroffen.'
            else e.body
          end,
          'severity', e.severity,
          'createdAt', e.created_at,
          'read', true,
          'payload', e.payload || case
            when actor.id is not null then jsonb_build_object('actorMemberId', actor.id)
            else '{}'::jsonb
          end
        ) as event_json
      from (
        select * from public.meta_events
        where game_id = target_game_id
        order by created_at desc
        limit 100
      ) e
      left join public.meta_members actor
        on actor.game_id = target_game_id
       and actor.id = case
         when e.event_type in ('vote_submitted','effect_selection_saved','role_decision_saved')
           then e.target_member_id
         when e.event_type = 'member_joined' and nullif(e.payload ->> 'memberId', '') is not null
           then nullif(e.payload ->> 'memberId', '')::uuid
         when e.event_type = 'note_saved_host' and nullif(e.payload ->> 'actorMemberId', '') is not null
           then nullif(e.payload ->> 'actorMemberId', '')::uuid
         else null
       end
    ) events;

    return jsonb_set(view_json, '{notifications}', host_events_json, true);
  end if;

  round_json := coalesce(view_json -> 'currentRoundState', '{}'::jsonb);
  result_json := round_json -> 'result';
  if result_json is not null then
    result_json := result_json - 'millionaireId' - 'millionaireSurvived';
    round_json := jsonb_set(round_json, '{result}', result_json, true);
    view_json := jsonb_set(view_json, '{currentRoundState}', round_json, true);
  end if;

  if jsonb_typeof(view_json -> 'personalHistory') = 'array' then
    select coalesce(jsonb_agg(entry - 'millionaireId' order by ordinal), '[]'::jsonb)
    into history_json
    from jsonb_array_elements(view_json -> 'personalHistory') with ordinality as h(entry, ordinal);
    view_json := jsonb_set(view_json, '{personalHistory}', history_json, true);
  end if;

  return view_json;
end;
$$;

revoke execute on function public.meta_get_game_view_report_privacy_base(uuid) from public, anon, authenticated;
grant execute on function public.meta_get_game_view(uuid) to authenticated;
revoke execute on function public.meta_get_game_view(uuid) from public, anon;

alter function public.meta_save_note(uuid, uuid, text)
  rename to meta_save_note_audit_base;

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
begin
  if own_member is null then raise exception 'Spielerprofil fehlt.' using errcode = '42501'; end if;

  select g.notes_visibility, a.display_name::text, s.display_name::text
  into visibility_mode, author_name, subject_name
  from public.meta_games g
  join public.meta_members a on a.id = own_member and a.game_id = g.id
  join public.meta_members s on s.id = subject_member_id and s.game_id = g.id
  where g.id = target_game_id;

  perform public.meta_save_note_audit_base(target_game_id, subject_member_id, note_text);

  if visibility_mode = 'host' then
    perform public.meta_emit_event(
      target_game_id,
      (select current_round from public.meta_games where id = target_game_id),
      'host',
      null,
      'note_saved_host',
      'Aktenvermerk gespeichert',
      author_name || ' → ' || subject_name || ': ' || case when btrim(saved_note) = '' then 'Notiz geleert.' else '„' || saved_note || '“' end,
      'info',
      jsonb_build_object(
        'actorMemberId', own_member,
        'subjectMemberId', subject_member_id,
        'note', saved_note
      )
    );
  end if;
end;
$$;

revoke execute on function public.meta_save_note_audit_base(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.meta_save_note(uuid, uuid, text) to authenticated;
revoke execute on function public.meta_save_note(uuid, uuid, text) from public, anon;

create or replace function public.meta_player_role_decision(target_game_id uuid, role_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  round_state jsonb;
  next_round_state jsonb;
  own_member uuid := public.meta_current_member_id(target_game_id);
  current_money uuid;
  next_money uuid;
  candidate_count integer;
  can_keep boolean := false;
begin
  if role_decision not in ('keep','transfer') then raise exception 'Ungültige Rollenentscheidung.'; end if;
  if own_member is null then raise exception 'Spielerprofil fehlt.' using errcode = '42501'; end if;

  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.current_round >= game_row.total_rounds then
    raise exception 'Nach der letzten Runde gibt es keine weitere Rollenentscheidung.';
  end if;
  if game_row.phase <> 'report' then
    raise exception 'Die Rollenentscheidung ist erst nach dem veröffentlichten Rundenbericht möglich.';
  end if;

  round_state := game_row.state -> 'rounds' -> game_row.current_round::text;
  if not coalesce((round_state ->> 'resultPublished')::boolean, false) then
    raise exception 'Der Rundenbericht wurde noch nicht veröffentlicht.';
  end if;

  current_money := nullif(round_state ->> 'millionaireId', '')::uuid;
  if current_money is null or current_money <> own_member then
    raise exception 'Nur der aktuelle Millionär darf die nächste Deckung bestimmen.';
  end if;

  select exists (
    select 1 from public.meta_members m
    where m.id = current_money
      and m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round + 1
  ) into can_keep;

  if role_decision = 'keep' then
    if not can_keep then
      raise exception 'Du bist nicht mehr für die Wertung zugelassen. Die Rolle muss zufällig neu ausgelost werden.';
    end if;
    next_money := current_money;
  else
    select count(*) into candidate_count
    from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round + 1;

    if candidate_count = 0 then
      raise exception 'Für die nächste Runde gibt es keinen gültigen Millionär.';
    end if;

    select m.id into next_money
    from public.meta_members m
    where m.game_id = target_game_id
      and m.attendance_status = 'present'
      and m.competition_status = 'eligible'
      and m.active_from_round <= game_row.current_round + 1
      and (candidate_count = 1 or m.id <> current_money)
    order by random()
    limit 1;
  end if;

  round_state := round_state || jsonb_build_object('roleDecision', role_decision);
  next_round_state := coalesce(game_row.state -> 'rounds' -> (game_row.current_round + 1)::text, '{}'::jsonb)
    || jsonb_build_object(
      'number', game_row.current_round + 1,
      'points', game_row.current_round + 1,
      'millionaireId', next_money,
      'roleReleased', false,
      'missionPublished', false,
      'missionStatus', 'pending',
      'challengePublished', false,
      'teams', null,
      'winningTeam', null,
      'effectSelection', null,
      'votingOpenedAt', null,
      'votingClosedAt', null,
      'result', null,
      'resultPublished', false,
      'roleDecision', null
    );

  update public.meta_games
  set current_round = game_row.current_round + 1,
      state = jsonb_set(
        jsonb_set(state, array['rounds', game_row.current_round::text], round_state, true),
        array['rounds', (game_row.current_round + 1)::text], next_round_state, true
      ),
      phase = 'round_setup'
  where id = target_game_id;

  perform public.meta_emit_event(
    target_game_id,
    game_row.current_round,
    'member',
    own_member,
    'role_decision_saved',
    'Rollenentscheidung gespeichert',
    case when role_decision = 'keep'
      then 'Du bleibst in der nächsten Runde Millionär.'
      else 'Die Rolle wurde für die nächste Runde zufällig neu ausgelost.'
    end,
    'important',
    jsonb_build_object('decision', role_decision)
  );
  perform public.meta_emit_event(
    target_game_id,
    game_row.current_round + 1,
    'public',
    null,
    'round_started',
    'Neue Runde vorbereitet',
    'Runde ' || (game_row.current_round + 1)::text || ' beginnt. Die Rolle bleibt bis zur Freigabe versiegelt.',
    'important',
    '{}'::jsonb
  );
  perform public.meta_bump_revision(target_game_id, 'role_decision_and_round_started');
end;
$$;

grant execute on function public.meta_player_role_decision(uuid, text) to authenticated;
revoke execute on function public.meta_player_role_decision(uuid, text) from public, anon;

alter function public.meta_host_advance_round(uuid)
  rename to meta_host_advance_round_final_only_base;

create or replace function public.meta_host_advance_round(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
begin
  if not public.meta_is_host(target_game_id) then
    raise exception 'Nur die Spielleitung darf fortfahren.' using errcode = '42501';
  end if;
  select * into game_row from public.meta_games where id = target_game_id for update;
  if game_row.current_round < game_row.total_rounds then
    raise exception 'Die nächste Runde startet nach der privaten Rollenentscheidung des Millionärs.';
  end if;
  perform public.meta_host_advance_round_final_only_base(target_game_id);
end;
$$;

revoke execute on function public.meta_host_advance_round_final_only_base(uuid) from public, anon, authenticated;
grant execute on function public.meta_host_advance_round(uuid) to authenticated;
revoke execute on function public.meta_host_advance_round(uuid) from public, anon;