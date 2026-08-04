create or replace function public.meta_get_game_view(target_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.meta_games%rowtype;
  own_member uuid := public.meta_current_member_id(target_game_id);
  host_access boolean := public.meta_is_host(target_game_id);
  round_state jsonb;
  public_round jsonb;
  own_role text := 'none';
  members_json jsonb := '[]'::jsonb;
  notifications_json jsonb := '[]'::jsonb;
  notes_json jsonb := '[]'::jsonb;
  host_notes_json jsonb := '[]'::jsonb;
  host_votes_json jsonb := '[]'::jsonb;
  history_json jsonb := '[]'::jsonb;
  own_points integer := 0;
  own_draft uuid;
  own_vote uuid;
begin
  select * into game_row from public.meta_games where id = target_game_id;
  if not found then raise exception 'Partie nicht gefunden.'; end if;
  if not host_access and own_member is null then
    raise exception 'Kein Zugriff auf diese Partie.' using errcode = '42501';
  end if;

  if own_member is not null then
    update public.meta_members set last_seen_at = now() where id = own_member;
  end if;

  round_state := coalesce(game_row.state -> 'rounds' -> game_row.current_round::text, '{}'::jsonb);

  if host_access then
    public_round := round_state;
  else
    public_round := jsonb_build_object(
      'number', game_row.current_round,
      'points', game_row.current_round,
      'roleReleased', coalesce((round_state ->> 'roleReleased')::boolean, false),
      'missionPublished', coalesce((round_state ->> 'missionPublished')::boolean, false),
      'missionStatus', coalesce(round_state ->> 'missionStatus', 'pending'),
      'challengePublished', coalesce((round_state ->> 'challengePublished')::boolean, false),
      'resultPublished', coalesce((round_state ->> 'resultPublished')::boolean, false)
    );
    if coalesce((round_state ->> 'challengePublished')::boolean, false) then
      public_round := public_round || jsonb_build_object(
        'challenge', round_state -> 'challenge',
        'teams', coalesce(round_state -> 'teams', '{}'::jsonb),
        'winningTeam', round_state -> 'winningTeam'
      );
    end if;
    if coalesce((round_state ->> 'resultPublished')::boolean, false) then
      public_round := public_round || jsonb_build_object('result', round_state -> 'result');
    end if;
  end if;

  if own_member is not null
     and coalesce((round_state ->> 'roleReleased')::boolean, false)
     and (round_state ->> 'millionaireId') = own_member::text then
    own_role := 'millionaire';
  elsif own_member is not null
     and coalesce((round_state ->> 'roleReleased')::boolean, false)
     and exists (
       select 1 from public.meta_members m
       where m.id = own_member
         and m.active_from_round <= game_row.current_round
         and m.competition_status = 'eligible'
         and m.attendance_status = 'present'
     ) then
    own_role := 'investigator';
  end if;

  if own_role = 'millionaire' and coalesce((round_state ->> 'missionPublished')::boolean, false) then
    public_round := public_round || jsonb_build_object(
      'mission', round_state -> 'mission',
      'bonus', round_state -> 'bonus',
      'malus', round_state -> 'malus',
      'effectSelection', round_state -> 'effectSelection'
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'displayName', m.display_name,
      'avatarPath', m.avatar_path,
      'joinedRound', m.joined_round,
      'activeFromRound', m.active_from_round,
      'attendanceStatus', m.attendance_status,
      'competitionStatus', m.competition_status,
      'eliminatedRound', m.eliminated_round,
      'departedRound', m.departed_round,
      'points', case when host_access or m.id = own_member then coalesce(s.points, 0) else null end,
      'currentTeam', round_state -> 'teams' ->> m.id::text,
      'voteSubmitted', exists (
        select 1 from public.meta_votes v
        where v.game_id = target_game_id and v.round_number = game_row.current_round and v.member_id = m.id
      ),
      'lastSeenAt', m.last_seen_at
    ) order by m.created_at
  ), '[]'::jsonb)
  into members_json
  from public.meta_members m
  left join (
    select member_id, sum(points_awarded)::integer as points
    from public.meta_scores where game_id = target_game_id group by member_id
  ) s on s.member_id = m.id
  where m.game_id = target_game_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'roundNumber', e.round_number,
      'eventType', e.event_type,
      'title', e.title,
      'body', e.body,
      'severity', e.severity,
      'createdAt', e.created_at,
      'read', case when own_member is null then true else r.event_id is not null end,
      'payload', e.payload
    ) order by e.created_at desc
  ), '[]'::jsonb)
  into notifications_json
  from public.meta_events e
  left join public.meta_event_reads r on r.event_id = e.id and r.member_id = own_member
  where e.game_id = target_game_id
    and (
      host_access
      or e.visibility = 'public'
      or (e.visibility = 'member' and e.target_member_id = own_member)
    )
  limit 100;

  if own_member is not null then
    select coalesce(sum(points_awarded), 0)::integer into own_points
    from public.meta_scores where game_id = target_game_id and member_id = own_member;

    select target_member_id into own_draft
    from public.meta_vote_drafts
    where game_id = target_game_id and round_number = game_row.current_round and member_id = own_member;

    select target_member_id into own_vote
    from public.meta_votes
    where game_id = target_game_id and round_number = game_row.current_round and member_id = own_member;

    select coalesce(jsonb_agg(jsonb_build_object(
      'subjectMemberId', n.subject_member_id,
      'note', n.note,
      'updatedAt', n.updated_at
    )), '[]'::jsonb) into notes_json
    from public.meta_notes n
    where n.game_id = target_game_id and n.author_member_id = own_member;

    select coalesce(jsonb_agg(jsonb_build_object(
      'roundNumber', s.round_number,
      'role', case
        when (game_row.state -> 'rounds' -> s.round_number::text ->> 'millionaireId') = own_member::text then 'millionaire'
        else 'investigator'
      end,
      'team', game_row.state -> 'rounds' -> s.round_number::text -> 'teams' ->> own_member::text,
      'voteTargetId', v.target_member_id,
      'correctGuess', s.correct_guess,
      'pointsAwarded', s.points_awarded,
      'eliminatedId', game_row.state -> 'rounds' -> s.round_number::text -> 'result' ->> 'eliminatedId',
      'millionaireId', game_row.state -> 'rounds' -> s.round_number::text ->> 'millionaireId',
      'missionTitle', case
        when (game_row.state -> 'rounds' -> s.round_number::text ->> 'millionaireId') = own_member::text
          then game_row.state -> 'rounds' -> s.round_number::text -> 'mission' ->> 'title'
        else null
      end,
      'missionStatus', game_row.state -> 'rounds' -> s.round_number::text ->> 'missionStatus'
    ) order by s.round_number), '[]'::jsonb)
    into history_json
    from public.meta_scores s
    left join public.meta_votes v
      on v.game_id = s.game_id and v.round_number = s.round_number and v.member_id = s.member_id
    where s.game_id = target_game_id and s.member_id = own_member;
  end if;

  if host_access then
    select coalesce(jsonb_agg(jsonb_build_object(
      'voterId', v.member_id,
      'targetId', v.target_member_id,
      'submittedAt', v.submitted_at
    ) order by v.submitted_at), '[]'::jsonb)
    into host_votes_json
    from public.meta_votes v
    where v.game_id = target_game_id and v.round_number = game_row.current_round;

    if game_row.notes_visibility = 'host' then
      select coalesce(jsonb_agg(jsonb_build_object(
        'authorMemberId', n.author_member_id,
        'subjectMemberId', n.subject_member_id,
        'note', n.note,
        'updatedAt', n.updated_at
      ) order by n.updated_at desc), '[]'::jsonb)
      into host_notes_json
      from public.meta_notes n where n.game_id = target_game_id;
    end if;
  end if;

  return jsonb_build_object(
    'gameId', game_row.id,
    'title', game_row.title,
    'joinCode', game_row.join_code,
    'totalRounds', game_row.total_rounds,
    'currentRound', game_row.current_round,
    'phase', game_row.phase,
    'revision', game_row.revision,
    'acceptingPlayers', game_row.accepting_players,
    'finalRule', game_row.final_rule,
    'notesVisibility', game_row.notes_visibility,
    'isHost', host_access,
    'memberId', own_member,
    'members', members_json,
    'currentRoundState', public_round,
    'rounds', case when host_access then game_row.state -> 'rounds' else null end,
    'ownRole', own_role,
    'ownPoints', own_points,
    'ownVoteDraft', own_draft,
    'ownVote', own_vote,
    'ownNotes', notes_json,
    'notifications', notifications_json,
    'personalHistory', history_json,
    'hostVotes', host_votes_json,
    'hostNotes', host_notes_json,
    'finalResult', game_row.state -> 'finalResult'
  );
end;
$$;
