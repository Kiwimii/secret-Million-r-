-- Stellt den ursprünglichen Kernablauf wieder her:
-- * André wählt nur die geheime Mission.
-- * Nach erfolgreicher Mission wählt der Millionär selbst genau einen von drei Vorteilen.
-- * Die öffentliche Auswertung zeigt nur Endstimmen und ausgeschiedene Person.
-- * André erhält eine vollständige, geheime Gesamtübersicht.
-- * Der meistbeschuldigte Spieler scheidet aus dem Gewinnerpool aus, darf aber weiter mitspielen.
-- * Überlebt der Millionär, entscheidet nur er: Korken behalten oder zufällig weitergeben.

alter table public.round_results
  add column if not exists tie_resolved_randomly boolean not null default false;

-- Alte Host-Auswahl bleibt nur als kompatible Signatur bestehen, wird fachlich aber gesperrt.
create or replace function public.select_live_round_advantage(
  target_game_id uuid,
  target_round smallint,
  advantage_catalog_id text,
  advantage_effect text,
  advantage_title text,
  advantage_description text,
  advantage_player_instructions text,
  advantage_host_instructions text,
  advantage_limit text,
  advantage_selection_mode text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Rundensteuerung öffnen.' using errcode = '42501';
  end if;
  raise exception 'Den geheimen Vorteil wählt der Millionär erst nach einer erfolgreichen Mission selbst.';
end;
$$;

create or replace function public.mark_live_mission_status(
  target_game_id uuid,
  target_round smallint,
  requested_status public.mission_status
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Mission bewerten.' using errcode = '42501';
  end if;
  if requested_status not in ('completed'::public.mission_status, 'failed'::public.mission_status) then
    raise exception 'Die Mission kann nur als erfolgreich oder gescheitert markiert werden.';
  end if;

  update public.mission_assignments
  set status = requested_status, reviewed_at = now()
  where game_id = target_game_id and round_number = target_round;
  if not found then
    raise exception 'Für diese Runde wurde noch keine Mission zugewiesen.';
  end if;

  update public.rounds
  set mission_status = requested_status
  where game_id = target_game_id and round_number = target_round;

  -- Jede neue Bewertung setzt eine frühere Vorteilskonfiguration zurück.
  delete from public.advantage_assignments
  where game_id = target_game_id and round_number = target_round;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, case when requested_status = 'completed' then 'mission_completed_advantage_unlocked' else 'mission_failed' end);
end;
$$;

create or replace function public.choose_live_millionaire_advantage(
  target_game_id uuid,
  target_round smallint,
  requested_effect text,
  requested_source_member_id uuid default null,
  requested_target_member_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  active_millionaire uuid;
  chosen_title text;
  chosen_description text;
  chosen_player_instructions text;
  chosen_host_instructions text;
  chosen_limit text;
  chosen_mode text;
begin
  select gm.id, g.current_round, g.phase, g.millionaire_member_id
    into own_member_id, active_round, active_phase, active_millionaire
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id
    and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null or own_member_id is distinct from active_millionaire then
    raise exception 'Nur der aktuelle Millionär darf den geheimen Vorteil wählen.' using errcode = '42501';
  end if;
  if target_round <> active_round then
    raise exception 'Der Vorteil kann nur für die laufende Runde gewählt werden.';
  end if;
  if active_phase not in ('mission_review', 'advantage', 'voting') then
    raise exception 'Der Vorteil kann erst nach der Missionsbewertung und vor der Auswertung gewählt werden.';
  end if;
  if active_phase = 'voting' and exists (
    select 1 from public.votes v
    where v.game_id = target_game_id and v.round_number = target_round and v.is_valid
  ) then
    raise exception 'Nach der ersten abgegebenen Stimme kann der Vorteil nicht mehr geändert werden.';
  end if;
  if not exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id
      and ma.round_number = target_round
      and ma.assigned_member_id = own_member_id
      and ma.status = 'completed'
  ) then
    raise exception 'Der Vorteil wird erst durch eine erfolgreiche Mission freigeschaltet.';
  end if;
  if requested_effect not in ('double_vote', 'triple_vote', 'redirect_vote') then
    raise exception 'Ungültiger Vorteil. Zulässig sind nur doppelte Stimme, dreifache Stimme oder goldene Umleitung.';
  end if;

  if requested_effect = 'double_vote' then
    chosen_title := 'Doppelte Stimme';
    chosen_description := 'Die eigene Stimme des Millionärs zählt doppelt.';
    chosen_player_instructions := 'Stimme normal ab. Dein gewähltes Ziel erhält automatisch insgesamt zwei Stimmen von dir.';
    chosen_host_instructions := 'Die Auswertung addiert verdeckt eine weitere Stimme auf das tatsächliche Ziel des Millionärs.';
    chosen_limit := 'Nur die Hauptabstimmung der aktuellen Runde.';
    chosen_mode := 'none';
    requested_source_member_id := null;
    requested_target_member_id := null;
  elsif requested_effect = 'triple_vote' then
    chosen_title := 'Dreifache Stimme';
    chosen_description := 'Die eigene Stimme des Millionärs zählt dreifach.';
    chosen_player_instructions := 'Stimme normal ab. Dein gewähltes Ziel erhält automatisch insgesamt drei Stimmen von dir.';
    chosen_host_instructions := 'Die Auswertung addiert verdeckt zwei weitere Stimmen auf das tatsächliche Ziel des Millionärs.';
    chosen_limit := 'Nur die Hauptabstimmung der aktuellen Runde.';
    chosen_mode := 'none';
    requested_source_member_id := null;
    requested_target_member_id := null;
  else
    chosen_title := 'Goldene Umleitung';
    chosen_description := 'Eine Stimme wird vom Ausgangsziel zum Endziel umgeleitet; zusätzlich zählt die Stimme des Millionärs für das Endziel.';
    chosen_player_instructions := 'Wähle zwei verschiedene aktive Spieler. Dein eigener Stimmzettel zählt für das Endziel. Zusätzlich wandert höchstens eine vorhandene Stimme vom Ausgangsziel zum Endziel. Hat das Ausgangsziel keine verfügbare Stimme, erhält das Endziel trotzdem insgesamt zwei Stimmen durch deinen Vorteil.';
    chosen_host_instructions := 'Die Endauswertung verschiebt die Millionärsstimme zum Endziel und addiert eine weitere Umleitungsstimme. Beim Ausgangsziel wird höchstens eine weitere tatsächlich vorhandene Stimme entfernt.';
    chosen_limit := 'Ausgangs- und Endziel müssen verschieden, anwesend und noch im Gewinnerpool sein.';
    chosen_mode := 'source_and_target';

    if requested_source_member_id is null or requested_target_member_id is null then
      raise exception 'Für die goldene Umleitung werden Ausgangsziel und Endziel benötigt.';
    end if;
    if requested_source_member_id = requested_target_member_id then
      raise exception 'Ausgangsziel und Endziel müssen verschieden sein.';
    end if;
    if not exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game_id and gm.id = requested_source_member_id
        and gm.attendance_status = 'present' and gm.winner_pool_status = 'eligible'
    ) then raise exception 'Das Ausgangsziel ist nicht mehr als Abstimmungsziel verfügbar.'; end if;
    if not exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game_id and gm.id = requested_target_member_id
        and gm.attendance_status = 'present' and gm.winner_pool_status = 'eligible'
    ) then raise exception 'Das Endziel ist nicht mehr als Abstimmungsziel verfügbar.'; end if;
  end if;

  insert into public.advantage_assignments (
    game_id, round_number, actor_member_id, catalog_id, effect, title_snapshot,
    description_snapshot, player_instructions_snapshot, host_instructions_snapshot,
    limit_snapshot, selection_mode, target_member_id, secondary_target_member_id,
    source_target_member_id, voter_member_id, tie_opponent_member_id,
    used_at, expired_at, created_at, updated_at
  ) values (
    target_game_id, target_round, own_member_id,
    case requested_effect
      when 'double_vote' then 'millionaire-double-vote'
      when 'triple_vote' then 'millionaire-triple-vote'
      else 'millionaire-redirect-vote'
    end,
    requested_effect, chosen_title, chosen_description, chosen_player_instructions,
    chosen_host_instructions, chosen_limit, chosen_mode, requested_target_member_id,
    null, requested_source_member_id, null, null, now(), null, now(), now()
  )
  on conflict (game_id, round_number)
  do update set
    actor_member_id = excluded.actor_member_id,
    catalog_id = excluded.catalog_id,
    effect = excluded.effect,
    title_snapshot = excluded.title_snapshot,
    description_snapshot = excluded.description_snapshot,
    player_instructions_snapshot = excluded.player_instructions_snapshot,
    host_instructions_snapshot = excluded.host_instructions_snapshot,
    limit_snapshot = excluded.limit_snapshot,
    selection_mode = excluded.selection_mode,
    target_member_id = excluded.target_member_id,
    secondary_target_member_id = null,
    source_target_member_id = excluded.source_target_member_id,
    voter_member_id = null,
    tie_opponent_member_id = null,
    used_at = now(),
    expired_at = null,
    updated_at = now();

  update public.player_progress
  set advantage_opened = true,
      screen_key = 'advantage',
      step_key = 'millionaire_advantage_selected',
      last_seen_at = now(),
      updated_at = now()
  where game_id = target_game_id and member_id = own_member_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'millionaire_advantage_selected');
end;
$$;

create or replace function public.compute_live_round_tally(
  target_game_id uuid,
  target_round smallint
)
returns table (
  member_id uuid,
  display_name citext,
  regular_votes integer,
  adjustment integer,
  effective_votes integer
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with context as (
    select rr.member_id as millionaire_member_id
    from public.round_roles rr
    where rr.game_id = target_game_id
      and rr.round_number = target_round
      and rr.role = 'millionaire'
    limit 1
  ),
  candidates as (
    select gm.id, gm.display_name
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
  ),
  regular as (
    select v.accused_member_id as member_id, count(*)::integer as votes
    from public.votes v
    where v.game_id = target_game_id
      and v.round_number = target_round
      and v.stage = 'main'
      and v.is_valid
    group by v.accused_member_id
  ),
  actor_vote as (
    select v.accused_member_id
    from public.votes v
    join context c on c.millionaire_member_id = v.voter_member_id
    where v.game_id = target_game_id
      and v.round_number = target_round
      and v.stage = 'main'
      and v.is_valid
    limit 1
  ),
  advantage as (
    select aa.*
    from public.advantage_assignments aa
    join context c on c.millionaire_member_id = aa.actor_member_id
    where aa.game_id = target_game_id
      and aa.round_number = target_round
      and aa.used_at is not null
      and aa.expired_at is null
    limit 1
  ),
  calculated as (
    select
      c.id as member_id,
      c.display_name,
      coalesce(r.votes, 0)::integer as regular_votes,
      (
        case
          when a.effect = 'double_vote' and c.id = av.accused_member_id then 1
          when a.effect = 'triple_vote' and c.id = av.accused_member_id then 2
          when a.effect = 'redirect_vote' then
            (case when av.accused_member_id is not null
                        and av.accused_member_id <> a.target_member_id
                        and c.id = av.accused_member_id then -1 else 0 end)
            + (case when av.accused_member_id is not null
                          and av.accused_member_id <> a.target_member_id
                          and c.id = a.target_member_id then 1 else 0 end)
            + (case when c.id = a.source_target_member_id
                          and (
                            coalesce((select r2.votes from regular r2 where r2.member_id = a.source_target_member_id), 0)
                            - case when av.accused_member_id = a.source_target_member_id then 1 else 0 end
                          ) > 0 then -1 else 0 end)
            + (case when c.id = a.target_member_id then 1 else 0 end)
          else 0
        end
      )::integer as adjustment
    from candidates c
    left join regular r on r.member_id = c.id
    left join actor_vote av on true
    left join advantage a on true
  )
  select
    calculated.member_id,
    calculated.display_name,
    calculated.regular_votes,
    calculated.adjustment,
    greatest(0, calculated.regular_votes + calculated.adjustment)::integer as effective_votes
  from calculated
  order by calculated.display_name;
$$;

create or replace function public.finalize_live_round_vote(
  target_game_id uuid,
  target_round smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  active_phase public.game_phase;
  millionaire_id uuid;
  eliminated_id uuid;
  eliminated_name citext;
  max_votes integer;
  top_count integer;
  expected_voters integer;
  submitted_voters integer;
  round_points integer;
  survived boolean;
  regular_json jsonb;
  effective_json jsonb;
  advantage_id uuid;
  replacement_id uuid;
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die geheime Abstimmung auswerten.' using errcode = '42501';
  end if;

  select g.current_round, g.phase
    into active_round, active_phase
  from public.games g
  where g.id = target_game_id
  for update;

  if active_round <> target_round or active_phase not in ('voting', 'evaluation') then
    raise exception 'Die Abstimmung kann nur in der laufenden Abstimmungs- oder Auswertungsphase abgeschlossen werden.';
  end if;
  if exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id and rr.round_number = target_round
  ) then
    return public.get_live_public_round_result(target_game_id, target_round);
  end if;

  select rr.member_id into millionaire_id
  from public.round_roles rr
  where rr.game_id = target_game_id and rr.round_number = target_round and rr.role = 'millionaire';
  if millionaire_id is null then raise exception 'Für diese Runde ist kein Millionär gespeichert.'; end if;

  select count(*) into expected_voters
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.approved_at is not null
    and gm.attendance_status = 'present'
    and gm.winner_pool_status <> 'disqualified';

  select count(distinct v.voter_member_id) into submitted_voters
  from public.votes v
  where v.game_id = target_game_id and v.round_number = target_round
    and v.stage = 'main' and v.is_valid;

  if submitted_voters < expected_voters then
    raise exception 'Es fehlen noch % von % Stimmen.', expected_voters - submitted_voters, expected_voters;
  end if;

  if not exists (
    select 1 from public.compute_live_round_tally(target_game_id, target_round)
  ) then raise exception 'Es stehen keine zulässigen Kandidaten mehr zur Verfügung.'; end if;

  select max(t.effective_votes) into max_votes
  from public.compute_live_round_tally(target_game_id, target_round) t;

  select count(*) into top_count
  from public.compute_live_round_tally(target_game_id, target_round) t
  where t.effective_votes = max_votes;

  select t.member_id, t.display_name
    into eliminated_id, eliminated_name
  from public.compute_live_round_tally(target_game_id, target_round) t
  where t.effective_votes = max_votes
  order by gen_random_uuid()
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', t.member_id,
    'displayName', t.display_name,
    'votes', t.regular_votes
  ) order by t.display_name), '[]'::jsonb)
  into regular_json
  from public.compute_live_round_tally(target_game_id, target_round) t;

  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', t.member_id,
    'displayName', t.display_name,
    'totalVotes', t.effective_votes
  ) order by t.effective_votes desc, t.display_name), '[]'::jsonb)
  into effective_json
  from public.compute_live_round_tally(target_game_id, target_round) t;

  select aa.id into advantage_id
  from public.advantage_assignments aa
  where aa.game_id = target_game_id and aa.round_number = target_round
    and aa.used_at is not null and aa.expired_at is null;

  survived := eliminated_id is distinct from millionaire_id;
  select r.points into round_points
  from public.rounds r
  where r.game_id = target_game_id and r.round_number = target_round;

  insert into public.round_results (
    game_id, round_number, millionaire_member_id, eliminated_member_id,
    millionaire_survived, regular_tally, effective_tally,
    advantage_assignment_id, published_at, tie_resolved_randomly
  ) values (
    target_game_id, target_round, millionaire_id, eliminated_id,
    survived, regular_json, effective_json, advantage_id, now(), top_count > 1
  );

  update public.game_members
  set winner_pool_status = 'eliminated',
      eliminated_in_round = target_round,
      exit_reason = 'vote',
      updated_at = now()
  where id = eliminated_id and game_id = target_game_id;

  update public.rounds
  set eliminated_member_id = eliminated_id,
      completed_at = now()
  where game_id = target_game_id and round_number = target_round;

  insert into public.round_scores (
    game_id, round_number, member_id, points_awarded, correct_guess, reason
  )
  select
    target_game_id,
    target_round,
    gm.id,
    case when v.accused_member_id = millionaire_id then round_points else 0 end,
    v.accused_member_id = millionaire_id,
    case when v.accused_member_id = millionaire_id
      then 'Millionär in Runde ' || target_round || ' korrekt gewählt'
      else 'Keine korrekte Millionärsstimme in Runde ' || target_round end
  from public.game_members gm
  left join public.votes v
    on v.game_id = gm.game_id
   and v.round_number = target_round
   and v.stage = 'main'
   and v.voter_member_id = gm.id
   and v.is_valid
  where gm.game_id = target_game_id and gm.approved_at is not null
  on conflict (game_id, round_number, member_id)
  do update set
    points_awarded = excluded.points_awarded,
    correct_guess = excluded.correct_guess,
    reason = excluded.reason;

  if not survived and target_round < 4 then
    select gm.id into replacement_id
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
      and gm.id <> millionaire_id
    order by gen_random_uuid()
    limit 1;
    if replacement_id is null then
      raise exception 'Nach dem Ausscheiden des Millionärs ist kein zulässiger Nachfolger mehr vorhanden.';
    end if;

    insert into public.role_decisions (
      game_id, after_round, member_id, decision, target_member_id, submitted_at
    ) values (
      target_game_id, target_round, millionaire_id, 'replacement', replacement_id, now()
    )
    on conflict (game_id, after_round, member_id)
    do update set decision = 'replacement', target_member_id = excluded.target_member_id, submitted_at = now();

    update public.games set millionaire_member_id = null where id = target_game_id;
  end if;

  update public.games
  set phase = 'result', revision = revision + 1, updated_at = now()
  where id = target_game_id
  returning revision into new_revision;

  insert into public.game_events (game_id, actor_user_id, event_type, payload, revision)
  values (
    target_game_id, auth.uid(), 'round_vote_finalized',
    jsonb_build_object(
      'round', target_round,
      'eliminated_member_id', eliminated_id,
      'millionaire_survived', survived,
      'tie_resolved_randomly', top_count > 1
    ),
    new_revision
  );

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'round_result_published');

  return jsonb_build_object(
    'round', target_round,
    'published', true,
    'eliminatedMemberId', eliminated_id,
    'eliminatedDisplayName', eliminated_name,
    'tally', effective_json
  );
end;
$$;

create or replace function public.get_live_public_round_result(
  target_game_id uuid,
  target_round smallint default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  resolved_round smallint;
  result jsonb;
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf dieses Rundenergebnis.' using errcode = '42501';
  end if;

  select coalesce(target_round, g.current_round) into resolved_round
  from public.games g where g.id = target_game_id;

  select jsonb_build_object(
    'round', rr.round_number,
    'published', rr.published_at is not null,
    'tally', rr.effective_tally,
    'eliminatedMemberId', rr.eliminated_member_id,
    'eliminatedDisplayName', eliminated.display_name,
    'tieResolvedRandomly', rr.tie_resolved_randomly
  ) into result
  from public.round_results rr
  join public.game_members eliminated on eliminated.id = rr.eliminated_member_id
  where rr.game_id = target_game_id and rr.round_number = resolved_round
    and rr.published_at is not null;

  return coalesce(result, jsonb_build_object('round', resolved_round, 'published', false, 'tally', '[]'::jsonb));
end;
$$;

create or replace function public.submit_live_cork_decision(
  target_game_id uuid,
  requested_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  current_millionaire uuid;
  selected_target uuid;
  selected_name citext;
  decision_value public.role_decision_type;
begin
  select gm.id, g.current_round, g.phase, g.millionaire_member_id
    into own_member_id, active_round, active_phase, current_millionaire
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id and gm.user_id = auth.uid() and gm.approved_at is not null;

  if own_member_id is null or own_member_id is distinct from current_millionaire then
    raise exception 'Nur der überlebende Millionär entscheidet über den goldenen Korken.' using errcode = '42501';
  end if;
  if active_round >= 4 then raise exception 'Nach der letzten Runde gibt es keine Korkenweitergabe.'; end if;
  if active_phase <> 'role_transfer' then raise exception 'Die Korkenentscheidung ist erst nach dem Rundenergebnis möglich.'; end if;
  if not exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id and rr.round_number = active_round
      and rr.millionaire_member_id = own_member_id and rr.millionaire_survived
  ) then raise exception 'Für dieses Profil ist keine Korkenentscheidung offen.'; end if;
  if requested_decision not in ('keep', 'release') then
    raise exception 'Wähle Korken behalten oder zufällig weitergeben.';
  end if;

  if requested_decision = 'keep' then
    selected_target := own_member_id;
    decision_value := 'keep';
  else
    select gm.id into selected_target
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.approved_at is not null
      and gm.attendance_status = 'present'
      and gm.winner_pool_status = 'eligible'
      and gm.id <> own_member_id
    order by gen_random_uuid()
    limit 1;
    if selected_target is null then raise exception 'Es ist keine andere zulässige Person für die zufällige Weitergabe verfügbar.'; end if;
    decision_value := 'release';
  end if;

  insert into public.role_decisions (
    game_id, after_round, member_id, decision, target_member_id, submitted_at
  ) values (
    target_game_id, active_round, own_member_id, decision_value, selected_target, now()
  )
  on conflict (game_id, after_round, member_id)
  do update set decision = excluded.decision, target_member_id = excluded.target_member_id, submitted_at = now();

  update public.player_progress
  set role_decision_submitted = true,
      screen_key = 'role_transfer',
      step_key = 'cork_decision_submitted',
      last_seen_at = now(), updated_at = now()
  where game_id = target_game_id and member_id = own_member_id;

  select gm.display_name into selected_name from public.game_members gm where gm.id = selected_target;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'cork_decision_submitted');

  return jsonb_build_object(
    'decision', requested_decision,
    'targetMemberId', selected_target,
    'targetDisplayName', case when requested_decision = 'keep' then selected_name else null end,
    'randomTransfer', requested_decision = 'release'
  );
end;
$$;

create or replace function public.get_live_host_game_overview(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  result jsonb;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André sieht die geheime Gesamtübersicht.' using errcode = '42501';
  end if;
  select g.current_round into active_round from public.games g where g.id = target_game_id;

  select jsonb_build_object(
    'game', jsonb_build_object(
      'gameId', g.id,
      'title', g.title,
      'joinCode', g.join_code,
      'currentRound', g.current_round,
      'phase', g.phase,
      'revision', g.revision,
      'currentMillionaireMemberId', g.millionaire_member_id,
      'currentMillionaireDisplayName', (select gm.display_name from public.game_members gm where gm.id = g.millionaire_member_id)
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'memberId', gm.id,
        'displayName', gm.display_name,
        'avatarPath', gm.avatar_path,
        'attendanceStatus', gm.attendance_status,
        'winnerPoolStatus', gm.winner_pool_status,
        'eliminatedInRound', gm.eliminated_in_round,
        'departedInRound', gm.departed_in_round,
        'exitReason', gm.exit_reason,
        'currentRole', coalesce(rr.role, 'none'::public.game_role),
        'isCurrentMillionaire', gm.id = g.millionaire_member_id,
        'totalPoints', coalesce((select sum(rs.points_awarded) from public.round_scores rs where rs.game_id = g.id and rs.member_id = gm.id), 0),
        'correctGuesses', coalesce((select count(*) from public.round_scores rs where rs.game_id = g.id and rs.member_id = gm.id and rs.correct_guess), 0),
        'screenKey', pp.screen_key,
        'stepKey', pp.step_key,
        'lastSeenAt', pp.last_seen_at
      ) order by gm.created_at, gm.display_name)
      from public.game_members gm
      left join public.round_roles rr on rr.game_id = gm.game_id and rr.member_id = gm.id and rr.round_number = active_round
      left join public.player_progress pp on pp.game_id = gm.game_id and pp.member_id = gm.id
      where gm.game_id = g.id and gm.approved_at is not null
    ), '[]'::jsonb),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', r.round_number,
        'title', r.title,
        'points', r.points,
        'missionStatus', r.mission_status,
        'mission', (
          select jsonb_build_object(
            'catalogId', ma.catalog_id,
            'title', ma.title_snapshot,
            'status', ma.status,
            'assignedMemberId', ma.assigned_member_id,
            'assignedDisplayName', assigned.display_name,
            'reviewedAt', ma.reviewed_at
          )
          from public.mission_assignments ma
          join public.game_members assigned on assigned.id = ma.assigned_member_id
          where ma.game_id = g.id and ma.round_number = r.round_number
        ),
        'advantage', (
          select jsonb_build_object(
            'catalogId', aa.catalog_id,
            'effect', aa.effect,
            'title', aa.title_snapshot,
            'actorMemberId', aa.actor_member_id,
            'actorDisplayName', actor.display_name,
            'sourceMemberId', aa.source_target_member_id,
            'sourceDisplayName', source.display_name,
            'targetMemberId', aa.target_member_id,
            'targetDisplayName', target.display_name,
            'selectedAt', aa.used_at
          )
          from public.advantage_assignments aa
          join public.game_members actor on actor.id = aa.actor_member_id
          left join public.game_members source on source.id = aa.source_target_member_id
          left join public.game_members target on target.id = aa.target_member_id
          where aa.game_id = g.id and aa.round_number = r.round_number
        ),
        'challenge', (
          select jsonb_build_object(
            'title', cr.title_snapshot,
            'teamsDrawnAt', cr.teams_drawn_at,
            'winningTeam', cr.winning_team,
            'questionerDisplayName', q.display_name,
            'questionCompletedAt', cr.question_completed_at
          )
          from public.challenge_rounds cr
          left join public.game_members q on q.id = cr.questioner_member_id
          where cr.game_id = g.id and cr.round_number = r.round_number
        ),
        'result', (
          select jsonb_build_object(
            'millionaireMemberId', rr.millionaire_member_id,
            'millionaireDisplayName', millionaire.display_name,
            'eliminatedMemberId', rr.eliminated_member_id,
            'eliminatedDisplayName', eliminated.display_name,
            'millionaireSurvived', rr.millionaire_survived,
            'regularTally', rr.regular_tally,
            'effectiveTally', rr.effective_tally,
            'tieResolvedRandomly', rr.tie_resolved_randomly,
            'publishedAt', rr.published_at
          )
          from public.round_results rr
          join public.game_members millionaire on millionaire.id = rr.millionaire_member_id
          join public.game_members eliminated on eliminated.id = rr.eliminated_member_id
          where rr.game_id = g.id and rr.round_number = r.round_number
        ),
        'roleDecision', (
          select jsonb_build_object(
            'decision', rd.decision,
            'memberId', rd.member_id,
            'memberDisplayName', decision_actor.display_name,
            'targetMemberId', rd.target_member_id,
            'targetDisplayName', decision_target.display_name,
            'submittedAt', rd.submitted_at
          )
          from public.role_decisions rd
          join public.game_members decision_actor on decision_actor.id = rd.member_id
          left join public.game_members decision_target on decision_target.id = rd.target_member_id
          where rd.game_id = g.id and rd.after_round = r.round_number
          order by rd.submitted_at desc limit 1
        ),
        'scores', coalesce((
          select jsonb_agg(jsonb_build_object(
            'memberId', rs.member_id,
            'displayName', score_member.display_name,
            'points', rs.points_awarded,
            'correctGuess', rs.correct_guess
          ) order by score_member.display_name)
          from public.round_scores rs
          join public.game_members score_member on score_member.id = rs.member_id
          where rs.game_id = g.id and rs.round_number = r.round_number
        ), '[]'::jsonb)
      ) order by r.round_number)
      from public.rounds r where r.game_id = g.id
    ), '[]'::jsonb)
  ) into result
  from public.games g
  where g.id = target_game_id;

  return coalesce(result, '{}'::jsonb);
end;
$$;

-- Host-Steuerung liefert solange einen neutralen Platzhalter, damit die alte Oberfläche
-- den Spielstart nicht wegen eines vorab ausgewählten Vorteils blockiert.
create or replace function public.get_live_host_round_control(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  active_round smallint;
  result jsonb;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André sieht die vollständige Rundensteuerung.' using errcode = '42501';
  end if;
  select current_round into active_round from public.games where id = target_game_id;
  select jsonb_build_object(
    'round', active_round,
    'mission', (
      select jsonb_build_object(
        'status', ma.status, 'title', ma.title_snapshot,
        'assignedMemberId', ma.assigned_member_id,
        'reviewedAt', ma.reviewed_at
      ) from public.mission_assignments ma
      where ma.game_id = target_game_id and ma.round_number = active_round
    ),
    'advantage', coalesce((
      select jsonb_build_object(
        'catalogId', aa.catalog_id, 'effect', aa.effect, 'title', aa.title_snapshot,
        'description', aa.description_snapshot,
        'playerInstructions', aa.player_instructions_snapshot,
        'hostInstructions', aa.host_instructions_snapshot,
        'limit', aa.limit_snapshot, 'selectionMode', aa.selection_mode,
        'actorMemberId', aa.actor_member_id,
        'targetMemberId', aa.target_member_id,
        'secondaryTargetMemberId', aa.secondary_target_member_id,
        'sourceTargetMemberId', aa.source_target_member_id,
        'voterMemberId', aa.voter_member_id,
        'tieOpponentMemberId', aa.tie_opponent_member_id,
        'usedAt', aa.used_at, 'expiredAt', aa.expired_at
      ) from public.advantage_assignments aa
      where aa.game_id = target_game_id and aa.round_number = active_round
    ), case when exists (
      select 1 from public.mission_assignments ma
      where ma.game_id = target_game_id and ma.round_number = active_round
    ) then jsonb_build_object(
      'catalogId', 'pending-millionaire-choice',
      'effect', 'pending',
      'title', 'Wird vom Millionär gewählt',
      'description', 'Nach einer erfolgreichen Mission wählt der Millionär den Vorteil selbst.',
      'playerInstructions', '', 'hostInstructions', '', 'limit', '',
      'selectionMode', 'none', 'actorMemberId', '',
      'usedAt', null, 'expiredAt', null
    ) else null end),
    'votes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'voterMemberId', v.voter_member_id,
        'accusedMemberId', v.accused_member_id,
        'stage', v.stage,
        'submittedAt', v.submitted_at
      ) order by v.submitted_at)
      from public.votes v
      where v.game_id = target_game_id and v.round_number = active_round and v.is_valid
    ), '[]'::jsonb)
  ) into result;
  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.get_live_private_state(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  result jsonb;
begin
  select gm.id, g.current_round, g.phase
    into own_member_id, active_round, active_phase
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id and gm.user_id = auth.uid()
    and gm.approved_at is not null;
  if own_member_id is null then
    raise exception 'Kein persönliches Profil für diese Partie.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'memberId', own_member_id,
    'role', (
      select rr.role from public.round_roles rr
      where rr.game_id = target_game_id and rr.round_number = active_round
        and rr.member_id = own_member_id and active_phase <> 'lobby'
    ),
    'roleRevealedAt', (
      select rr.revealed_at from public.round_roles rr
      where rr.game_id = target_game_id and rr.round_number = active_round
        and rr.member_id = own_member_id
    ),
    'mission', (
      select to_jsonb(ma) - 'assigned_member_id'
      from public.mission_assignments ma
      where ma.game_id = target_game_id and ma.round_number = active_round
        and ma.assigned_member_id = own_member_id
        and active_phase in ('mission','challenge','question','discussion','mission_review','advantage','voting','evaluation','result','role_transfer')
    ),
    'advantage', (
      select to_jsonb(aa) - 'actor_member_id'
      from public.advantage_assignments aa
      where aa.game_id = target_game_id and aa.round_number = active_round
        and aa.actor_member_id = own_member_id
        and active_phase in ('advantage','voting','evaluation','result','role_transfer')
    ),
    'roleDecisionRequired', exists (
      select 1 from public.round_results rr
      where rr.game_id = target_game_id and rr.round_number = active_round
        and rr.millionaire_member_id = own_member_id
        and rr.millionaire_survived
        and active_phase = 'role_transfer'
        and active_round < 4
        and not exists (
          select 1 from public.role_decisions rd
          where rd.game_id = target_game_id and rd.after_round = active_round and rd.member_id = own_member_id
        )
    ),
    'roleDecision', (
      select jsonb_build_object(
        'decision', rd.decision,
        'targetMemberId', rd.target_member_id,
        'submittedAt', rd.submitted_at
      ) from public.role_decisions rd
      where rd.game_id = target_game_id and rd.after_round = active_round and rd.member_id = own_member_id
    ),
    'challengeBriefingOpened', coalesce((
      select pp.challenge_briefing_opened from public.player_progress pp
      where pp.game_id = target_game_id and pp.member_id = own_member_id
    ), false),
    'advantageOpened', coalesce((
      select pp.advantage_opened from public.player_progress pp
      where pp.game_id = target_game_id and pp.member_id = own_member_id
    ), false),
    'ownVote', (
      select jsonb_build_object('accusedMemberId', v.accused_member_id,
        'stage', v.stage, 'submittedAt', v.submitted_at)
      from public.votes v
      where v.game_id = target_game_id and v.round_number = active_round
        and v.voter_member_id = own_member_id and v.is_valid
      order by v.submitted_at desc limit 1
    )
  ) into result;
  return result;
end;
$$;

-- Ergänzt die bisherigen Challenge-Voraussetzungen um Vorteil, Auswertung und Korkenentscheidung.
create or replace function public.set_live_game_phase(
  target_game_id uuid,
  target_round smallint,
  target_phase public.game_phase,
  expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  new_revision bigint;
  active_round smallint;
  active_phase public.game_phase;
  next_millionaire uuid;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Phase ändern.' using errcode = '42501';
  end if;
  if target_round not between 1 and 4 then raise exception 'Ungültige Rundennummer.'; end if;

  select g.current_round, g.phase into active_round, active_phase
  from public.games g where g.id = target_game_id for update;

  if target_phase = 'challenge' then
    if not exists (
      select 1 from public.challenge_rounds cr
      where cr.game_id = target_game_id and cr.round_number = target_round
        and cr.teams_drawn_at is not null
    ) then raise exception 'Vor dem Start der Challenge müssen Challenge und Teams feststehen.'; end if;
    if (select count(*) from public.challenge_team_assignments cta
        where cta.game_id = target_game_id and cta.round_number = target_round) < 2 then
      raise exception 'Die Teamzuteilung ist noch nicht vollständig.';
    end if;
  end if;

  if target_phase = 'question' and not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
      and cr.winning_team is not null and cr.winner_confirmed_at is not null
  ) then raise exception 'André muss zuerst das Siegerteam bestätigen.'; end if;

  if target_phase = 'discussion' and not exists (
    select 1 from public.challenge_rounds cr
    where cr.game_id = target_game_id and cr.round_number = target_round
      and cr.questioner_member_id is not null and cr.question_completed_at is not null
  ) then raise exception 'Fragesteller und beantwortete Frage fehlen noch.'; end if;

  if target_phase = 'voting' and exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id and ma.round_number = target_round and ma.status = 'completed'
  ) and not exists (
    select 1 from public.advantage_assignments aa
    where aa.game_id = target_game_id and aa.round_number = target_round
      and aa.used_at is not null and aa.expired_at is null
  ) then raise exception 'Der Millionär muss zuerst seinen freigeschalteten Vorteil auswählen.'; end if;

  if target_phase = 'evaluation' then
    if (select count(*) from public.game_members gm
        where gm.game_id = target_game_id and gm.approved_at is not null
          and gm.attendance_status = 'present' and gm.winner_pool_status <> 'disqualified')
       >
       (select count(distinct v.voter_member_id) from public.votes v
        where v.game_id = target_game_id and v.round_number = target_round
          and v.stage = 'main' and v.is_valid) then
      raise exception 'Vor der Auswertung müssen alle anwesenden stimmberechtigten Personen abgestimmt haben.';
    end if;
  end if;

  if target_phase = 'result' and not exists (
    select 1 from public.round_results rr
    where rr.game_id = target_game_id and rr.round_number = target_round and rr.published_at is not null
  ) then raise exception 'André muss die Abstimmung zuerst auswerten und veröffentlichen.'; end if;

  if target_round = active_round + 1 and target_phase = 'role_reveal' then
    if active_phase <> 'role_transfer' then raise exception 'Die nächste Runde beginnt erst nach der Korkenentscheidung.'; end if;
    select rd.target_member_id into next_millionaire
    from public.role_decisions rd
    where rd.game_id = target_game_id and rd.after_round = active_round
    order by rd.submitted_at desc limit 1;
    if next_millionaire is null then
      raise exception 'Die Korkenentscheidung oder automatische Ersatz-Auslosung fehlt noch.';
    end if;
    if not exists (
      select 1 from public.round_mission_selections rms
      where rms.game_id = target_game_id and rms.round_number = target_round
    ) then raise exception 'André muss vor der nächsten Runde die neue geheime Mission auswählen.'; end if;

    insert into public.round_roles (game_id, round_number, member_id, role)
    select gm.game_id, target_round, gm.id,
      case
        when gm.id = next_millionaire then 'millionaire'::public.game_role
        when gm.attendance_status = 'present' and gm.winner_pool_status <> 'disqualified'
          then 'investigator'::public.game_role
        else 'none'::public.game_role
      end
    from public.game_members gm
    where gm.game_id = target_game_id and gm.approved_at is not null
    on conflict (game_id, round_number, member_id)
    do update set role = excluded.role, revealed_at = null;

    insert into public.mission_assignments (
      game_id, round_number, assigned_member_id, catalog_id, title_snapshot,
      task_snapshot, success_criteria_snapshot, time_window_snapshot, status, assigned_at, reviewed_at
    )
    select rms.game_id, rms.round_number, next_millionaire, rms.catalog_id,
      rms.title_snapshot, rms.task_snapshot, rms.success_criteria_snapshot,
      rms.time_window_snapshot, 'assigned'::public.mission_status, now(), null
    from public.round_mission_selections rms
    where rms.game_id = target_game_id and rms.round_number = target_round
    on conflict (game_id, round_number)
    do update set
      assigned_member_id = excluded.assigned_member_id,
      catalog_id = excluded.catalog_id,
      title_snapshot = excluded.title_snapshot,
      task_snapshot = excluded.task_snapshot,
      success_criteria_snapshot = excluded.success_criteria_snapshot,
      time_window_snapshot = excluded.time_window_snapshot,
      status = 'assigned', assigned_at = now(), reviewed_at = null;

    delete from public.advantage_assignments
    where game_id = target_game_id and round_number = target_round;

    update public.games
    set current_round = target_round, phase = target_phase,
        millionaire_member_id = next_millionaire,
        revision = revision + 1, updated_at = now()
    where id = target_game_id and revision = expected_revision
    returning revision into new_revision;
  else
    update public.games
    set current_round = target_round, phase = target_phase,
        revision = revision + 1, updated_at = now()
    where id = target_game_id and revision = expected_revision
    returning revision into new_revision;
  end if;

  if new_revision is null then
    raise exception 'Der Spielstand wurde bereits verändert. Bitte neu laden.' using errcode = '40001';
  end if;

  if target_phase in ('lobby', 'role_reveal') then
    update public.player_progress
    set role_revealed = false, mission_opened = false, advantage_opened = false,
        challenge_briefing_opened = false, vote_submitted = false,
        role_decision_submitted = false, phase_seen = target_phase, updated_at = now()
    where game_id = target_game_id;
  else
    update public.player_progress
    set phase_seen = target_phase, updated_at = now()
    where game_id = target_game_id;
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'phase');
  return new_revision;
end;
$$;

revoke all on function public.choose_live_millionaire_advantage(uuid, smallint, text, uuid, uuid) from public;
revoke all on function public.compute_live_round_tally(uuid, smallint) from public;
revoke all on function public.finalize_live_round_vote(uuid, smallint) from public;
revoke all on function public.get_live_public_round_result(uuid, smallint) from public;
revoke all on function public.submit_live_cork_decision(uuid, text) from public;
revoke all on function public.get_live_host_game_overview(uuid) from public;

grant execute on function public.choose_live_millionaire_advantage(uuid, smallint, text, uuid, uuid) to authenticated;
grant execute on function public.finalize_live_round_vote(uuid, smallint) to authenticated;
grant execute on function public.get_live_public_round_result(uuid, smallint) to authenticated;
grant execute on function public.submit_live_cork_decision(uuid, text) to authenticated;
grant execute on function public.get_live_host_game_overview(uuid) to authenticated;

comment on function public.get_live_host_game_overview(uuid) is
  'Geheime Gesamtübersicht ausschließlich für André: Spielerstatus, Rollen, Missionen, Vorteile, Ergebnisse, Punkte und Korkenentscheidungen.';
comment on function public.get_live_public_round_result(uuid, smallint) is
  'Öffentliche Ergebnisansicht ohne Rollen-, Vorteil- oder Einzelstimmendetails.';
