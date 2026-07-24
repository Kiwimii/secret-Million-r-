-- Reduziert unnötige Realtime-Ereignisse durch reine Heartbeats.
--
-- update_own_player_progress aktualisiert last_seen_at weiterhin bei jedem Aufruf,
-- erzeugt aber nur dann einen live_game_updates-Eintrag, wenn sich ein für die
-- Spielleitung sichtbarer Fortschrittswert tatsächlich geändert hat.

create or replace function public.update_own_player_progress(
  target_game_id uuid,
  requested_screen_key text,
  requested_step_key text,
  requested_phase_seen public.game_phase,
  requested_role_revealed boolean default null,
  requested_mission_opened boolean default null,
  requested_advantage_opened boolean default null,
  requested_challenge_opened boolean default null,
  requested_vote_submitted boolean default null,
  requested_role_decision_submitted boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  own_member_id uuid;
  previous_progress public.player_progress%rowtype;
  normalized_screen_key text := left(
    coalesce(nullif(btrim(requested_screen_key), ''), 'unknown'),
    80
  );
  normalized_step_key text := left(
    coalesce(nullif(btrim(requested_step_key), ''), 'viewing'),
    120
  );
  progress_changed boolean := false;
begin
  select gm.id into own_member_id
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null then
    raise exception 'Kein persönliches Profil für diese Partie.' using errcode = '42501';
  end if;

  select pp.* into previous_progress
  from public.player_progress pp
  where pp.game_id = target_game_id
    and pp.member_id = own_member_id
  for update;

  if not found then
    progress_changed := true;
  else
    progress_changed :=
      previous_progress.screen_key is distinct from normalized_screen_key
      or previous_progress.step_key is distinct from normalized_step_key
      or previous_progress.phase_seen is distinct from requested_phase_seen
      or (
        requested_role_revealed is not null
        and previous_progress.role_revealed is distinct from requested_role_revealed
      )
      or (
        requested_mission_opened is not null
        and previous_progress.mission_opened is distinct from requested_mission_opened
      )
      or (
        requested_advantage_opened is not null
        and previous_progress.advantage_opened is distinct from requested_advantage_opened
      )
      or (
        requested_challenge_opened is not null
        and previous_progress.challenge_briefing_opened is distinct from requested_challenge_opened
      )
      or (
        requested_vote_submitted is not null
        and previous_progress.vote_submitted is distinct from requested_vote_submitted
      )
      or (
        requested_role_decision_submitted is not null
        and previous_progress.role_decision_submitted is distinct from requested_role_decision_submitted
      );
  end if;

  insert into public.player_progress (
    game_id,
    member_id,
    screen_key,
    step_key,
    phase_seen,
    role_revealed,
    mission_opened,
    advantage_opened,
    challenge_briefing_opened,
    vote_submitted,
    role_decision_submitted,
    last_seen_at,
    updated_at
  ) values (
    target_game_id,
    own_member_id,
    normalized_screen_key,
    normalized_step_key,
    requested_phase_seen,
    coalesce(requested_role_revealed, false),
    coalesce(requested_mission_opened, false),
    coalesce(requested_advantage_opened, false),
    coalesce(requested_challenge_opened, false),
    coalesce(requested_vote_submitted, false),
    coalesce(requested_role_decision_submitted, false),
    now(),
    now()
  )
  on conflict (game_id, member_id)
  do update set
    screen_key = excluded.screen_key,
    step_key = excluded.step_key,
    phase_seen = excluded.phase_seen,
    role_revealed = coalesce(requested_role_revealed, player_progress.role_revealed),
    mission_opened = coalesce(requested_mission_opened, player_progress.mission_opened),
    advantage_opened = coalesce(requested_advantage_opened, player_progress.advantage_opened),
    challenge_briefing_opened = coalesce(requested_challenge_opened, player_progress.challenge_briefing_opened),
    vote_submitted = coalesce(requested_vote_submitted, player_progress.vote_submitted),
    role_decision_submitted = coalesce(requested_role_decision_submitted, player_progress.role_decision_submitted),
    last_seen_at = now(),
    updated_at = now();

  if progress_changed then
    insert into public.live_game_updates (game_id, update_type)
    values (target_game_id, 'progress');

    -- Die Tabelle dient nur als Realtime-Signal, nicht als unbegrenztes Archiv.
    -- Pro Partie reichen die letzten 256 Signale für Diagnose und Betrieb aus.
    delete from public.live_game_updates lgu
    where lgu.game_id = target_game_id
      and lgu.id < (
        select cutoff.id
        from public.live_game_updates cutoff
        where cutoff.game_id = target_game_id
        order by cutoff.id desc
        offset 255
        limit 1
      );
  end if;
end;
$$;
