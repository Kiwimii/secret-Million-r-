-- Verbindlicher Live-Ablauf für Challenge, Frage, Mission und Vorteil.
-- Die UI darf den Ablauf nicht nur optisch suggerieren; die Datenbank erzwingt
-- Teams -> Challenge -> Siegerteam -> Fragesteller -> beantwortete Frage.

alter table public.challenge_rounds
  add column if not exists questioner_member_id uuid references public.game_members(id) on delete set null,
  add column if not exists question_completed_at timestamptz;

alter table public.advantage_assignments
  add column if not exists description_snapshot text,
  add column if not exists player_instructions_snapshot text,
  add column if not exists host_instructions_snapshot text,
  add column if not exists limit_snapshot text,
  add column if not exists selection_mode text,
  add column if not exists secondary_target_member_id uuid references public.game_members(id) on delete set null,
  add column if not exists source_target_member_id uuid references public.game_members(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.round_advantage_selections (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 4),
  catalog_id text not null,
  effect text not null,
  title_snapshot text not null,
  description_snapshot text not null,
  player_instructions_snapshot text not null,
  host_instructions_snapshot text not null,
  limit_snapshot text not null,
  selection_mode text not null,
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, round_number)
);

alter table public.round_advantage_selections enable row level security;

drop policy if exists round_advantage_host_all on public.round_advantage_selections;
create policy round_advantage_host_all on public.round_advantage_selections
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

create or replace function public.assign_selected_advantage_to_millionaire(
  target_game_id uuid,
  target_round smallint,
  target_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected public.round_advantage_selections%rowtype;
begin
  select * into selected
  from public.round_advantage_selections ras
  where ras.game_id = target_game_id and ras.round_number = target_round;

  if not found or target_member_id is null then
    return;
  end if;

  insert into public.advantage_assignments (
    game_id, round_number, actor_member_id, catalog_id, effect, title_snapshot,
    description_snapshot, player_instructions_snapshot, host_instructions_snapshot,
    limit_snapshot, selection_mode, target_member_id, secondary_target_member_id,
    source_target_member_id, voter_member_id, tie_opponent_member_id,
    used_at, expired_at, created_at, updated_at
  ) values (
    target_game_id, target_round, target_member_id, selected.catalog_id,
    selected.effect, selected.title_snapshot, selected.description_snapshot,
    selected.player_instructions_snapshot, selected.host_instructions_snapshot,
    selected.limit_snapshot, selected.selection_mode, null, null, null, null, null,
    null, null, now(), now()
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
    target_member_id = null,
    secondary_target_member_id = null,
    source_target_member_id = null,
    voter_member_id = null,
    tie_opponent_member_id = null,
    used_at = null,
    expired_at = null,
    updated_at = now();
end;
$$;

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
set search_path = public, pg_temp
as $$
declare
  active_millionaire uuid;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf den geheimen Vorteil auswählen.' using errcode = '42501';
  end if;
  if target_round not between 1 and 4 then
    raise exception 'Ungültige Rundennummer.';
  end if;

  insert into public.round_advantage_selections (
    game_id, round_number, catalog_id, effect, title_snapshot,
    description_snapshot, player_instructions_snapshot, host_instructions_snapshot,
    limit_snapshot, selection_mode, selected_at, updated_at
  ) values (
    target_game_id, target_round, advantage_catalog_id, advantage_effect,
    advantage_title, advantage_description, advantage_player_instructions,
    advantage_host_instructions, advantage_limit, advantage_selection_mode,
    now(), now()
  )
  on conflict (game_id, round_number)
  do update set
    catalog_id = excluded.catalog_id,
    effect = excluded.effect,
    title_snapshot = excluded.title_snapshot,
    description_snapshot = excluded.description_snapshot,
    player_instructions_snapshot = excluded.player_instructions_snapshot,
    host_instructions_snapshot = excluded.host_instructions_snapshot,
    limit_snapshot = excluded.limit_snapshot,
    selection_mode = excluded.selection_mode,
    selected_at = now(),
    updated_at = now();

  select g.millionaire_member_id into active_millionaire
  from public.games g
  where g.id = target_game_id and g.current_round = target_round;

  perform public.assign_selected_advantage_to_millionaire(
    target_game_id, target_round, active_millionaire
  );

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'advantage_selected');
end;
$$;

create or replace function public.sync_selected_advantage_to_millionaire()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.millionaire_member_id is not null
     and new.millionaire_member_id is distinct from old.millionaire_member_id then
    perform public.assign_selected_advantage_to_millionaire(
      new.id, new.current_round, new.millionaire_member_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists games_sync_selected_advantage on public.games;
create trigger games_sync_selected_advantage
after update of millionaire_member_id on public.games
for each row execute function public.sync_selected_advantage_to_millionaire();

create or replace function public.mark_live_mission_status(
  target_game_id uuid,
  target_round smallint,
  requested_status public.mission_status
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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

  if requested_status = 'completed' then
    update public.advantage_assignments
    set used_at = coalesce(used_at, now()), expired_at = null, updated_at = now()
    where game_id = target_game_id and round_number = target_round;
  else
    update public.advantage_assignments
    set used_at = null, expired_at = now(), updated_at = now()
    where game_id = target_game_id and round_number = target_round;
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'mission_reviewed');
end;
$$;

create or replace function public.configure_live_advantage(
  target_game_id uuid,
  target_round smallint,
  requested_target_member_id uuid default null,
  requested_secondary_target_member_id uuid default null,
  requested_source_target_member_id uuid default null,
  requested_voter_member_id uuid default null,
  requested_tie_opponent_member_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf den aktivierten Vorteil konfigurieren.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.mission_assignments ma
    where ma.game_id = target_game_id and ma.round_number = target_round
      and ma.status = 'completed'
  ) then
    raise exception 'Der Vorteil wird erst nach erfolgreicher Mission aktiviert.';
  end if;

  if requested_target_member_id is not null and not exists (
    select 1 from public.game_members gm
    where gm.id = requested_target_member_id and gm.game_id = target_game_id
  ) then raise exception 'Ungültiges Ziel.'; end if;
  if requested_secondary_target_member_id is not null and not exists (
    select 1 from public.game_members gm
    where gm.id = requested_secondary_target_member_id and gm.game_id = target_game_id
  ) then raise exception 'Ungültiges zweites Ziel.'; end if;
  if requested_source_target_member_id is not null and not exists (
    select 1 from public.game_members gm
    where gm.id = requested_source_target_member_id and gm.game_id = target_game_id
  ) then raise exception 'Ungültiges Ausgangsziel.'; end if;
  if requested_voter_member_id is not null and not exists (
    select 1 from public.game_members gm
    where gm.id = requested_voter_member_id and gm.game_id = target_game_id
  ) then raise exception 'Ungültiger Wähler.'; end if;
  if requested_tie_opponent_member_id is not null and not exists (
    select 1 from public.game_members gm
    where gm.id = requested_tie_opponent_member_id and gm.game_id = target_game_id
  ) then raise exception 'Ungültiger Gleichstandsgegner.'; end if;

  update public.advantage_assignments
  set target_member_id = requested_target_member_id,
      secondary_target_member_id = requested_secondary_target_member_id,
      source_target_member_id = requested_source_target_member_id,
      voter_member_id = requested_voter_member_id,
      tie_opponent_member_id = requested_tie_opponent_member_id,
      updated_at = now()
  where game_id = target_game_id and round_number = target_round and used_at is not null;
  if not found then
    raise exception 'Kein aktiver Vorteil für diese Runde.';
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'advantage_configured');
end;
$$;

create or replace function public.select_live_questioner(
  target_game_id uuid,
  requested_questioner_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  own_member_id uuid;
  active_round smallint;
  active_phase public.game_phase;
  winning public.challenge_team_code;
  own_team public.challenge_team_code;
  requested_team public.challenge_team_code;
begin
  select gm.id, g.current_round, g.phase
    into own_member_id, active_round, active_phase
  from public.game_members gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = target_game_id and gm.user_id = auth.uid()
    and gm.approved_at is not null;

  if own_member_id is null then
    raise exception 'Kein Spielerprofil aktiv.' using errcode = '42501';
  end if;
  if active_phase <> 'question' then
    raise exception 'Der Fragesteller wird erst nach der Challenge bestimmt.';
  end if;

  select cr.winning_team, own_cta.team, requested_cta.team
    into winning, own_team, requested_team
  from public.challenge_rounds cr
  left join public.challenge_team_assignments own_cta
    on own_cta.game_id = cr.game_id and own_cta.round_number = cr.round_number
   and own_cta.member_id = own_member_id
  left join public.challenge_team_assignments requested_cta
    on requested_cta.game_id = cr.game_id and requested_cta.round_number = cr.round_number
   and requested_cta.member_id = requested_questioner_member_id
  where cr.game_id = target_game_id and cr.round_number = active_round;

  if winning is null or own_team is distinct from winning then
    raise exception 'Nur das Siegerteam darf den Fragesteller bestimmen.' using errcode = '42501';
  end if;
  if requested_team is distinct from winning then
    raise exception 'Der Fragesteller muss aus dem Siegerteam kommen.';
  end if;

  update public.challenge_rounds
  set questioner_member_id = requested_questioner_member_id,
      question_completed_at = null
  where game_id = target_game_id and round_number = active_round;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'questioner_selected');
end;
$$;

create or replace function public.complete_live_question(
  target_game_id uuid,
  target_round smallint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Frage als beantwortet abhaken.' using errcode = '42501';
  end if;

  update public.challenge_rounds
  set question_completed_at = now()
  where game_id = target_game_id and round_number = target_round
    and questioner_member_id is not null;
  if not found then
    raise exception 'Das Siegerteam hat noch keinen Fragesteller bestimmt.';
  end if;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'question_completed');
end;
$$;

create or replace function public.host_complete_player_step(
  target_game_id uuid,
  target_member_id uuid,
  requested_step text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_phase public.game_phase;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf einen technischen Schritt manuell abschließen.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.game_members gm
    where gm.id = target_member_id and gm.game_id = target_game_id
  ) then raise exception 'Spieler nicht gefunden.'; end if;

  select phase into active_phase from public.games where id = target_game_id;

  insert into public.player_progress (game_id, member_id, screen_key, step_key, phase_seen)
  values (target_game_id, target_member_id, 'host_override', 'host_completed_' || requested_step, active_phase)
  on conflict (game_id, member_id)
  do update set
    screen_key = 'host_override',
    step_key = 'host_completed_' || requested_step,
    phase_seen = active_phase,
    role_revealed = case when requested_step = 'role' then true else player_progress.role_revealed end,
    mission_opened = case when requested_step = 'mission' then true else player_progress.mission_opened end,
    advantage_opened = case when requested_step = 'advantage' then true else player_progress.advantage_opened end,
    challenge_briefing_opened = case when requested_step = 'challenge' then true else player_progress.challenge_briefing_opened end,
    vote_submitted = case when requested_step = 'vote' then true else player_progress.vote_submitted end,
    role_decision_submitted = case when requested_step = 'role_decision' then true else player_progress.role_decision_submitted end,
    updated_at = now(), last_seen_at = now();

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'host_progress_override');
end;
$$;

create or replace function public.force_live_game_phase(
  target_game_id uuid,
  target_round smallint,
  target_phase public.game_phase
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Notfallsteuerung verwenden.' using errcode = '42501';
  end if;
  update public.games
  set current_round = target_round, phase = target_phase,
      revision = revision + 1, updated_at = now()
  where id = target_game_id
  returning revision into new_revision;

  update public.player_progress
  set phase_seen = target_phase, updated_at = now()
  where game_id = target_game_id;

  insert into public.live_game_updates (game_id, update_type)
  values (target_game_id, 'phase_forced');
  return new_revision;
end;
$$;

create or replace function public.get_live_public_round_flow(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  active_round smallint;
  result jsonb;
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf den Rundenablauf.' using errcode = '42501';
  end if;
  select current_round into active_round from public.games where id = target_game_id;
  select jsonb_build_object(
    'round', active_round,
    'challengeSelected', cr.id is not null,
    'teamsDrawn', cr.teams_drawn_at is not null,
    'winningTeam', cr.winning_team,
    'winnerConfirmedAt', cr.winner_confirmed_at,
    'questionerMemberId', cr.questioner_member_id,
    'questionCompletedAt', cr.question_completed_at
  ) into result
  from (select 1) seed
  left join public.challenge_rounds cr
    on cr.game_id = target_game_id and cr.round_number = active_round;
  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.get_live_host_round_control(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
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
    'advantage', (
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
    ),
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

-- Der normale Phasenwechsel erzwingt die fachliche Reihenfolge.
create or replace function public.set_live_game_phase(
  target_game_id uuid,
  target_round smallint,
  target_phase public.game_phase,
  expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_revision bigint;
begin
  if not public.is_game_host(target_game_id) then
    raise exception 'Nur André darf die Phase ändern.' using errcode = '42501';
  end if;
  if target_round not between 1 and 4 then raise exception 'Ungültige Rundennummer.'; end if;

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

  update public.games
  set current_round = target_round, phase = target_phase,
      revision = revision + 1, updated_at = now()
  where id = target_game_id and revision = expected_revision
  returning revision into new_revision;
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

-- Private Ansicht: Mission und gewählter Vorteil werden gemeinsam sichtbar.
create or replace function public.get_live_private_state(target_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
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
        and rr.member_id = own_member_id and active_phase not in ('lobby', 'role_transfer')
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
        and active_phase in ('mission','challenge','question','discussion','mission_review','advantage','voting','evaluation','result')
    ),
    'advantage', (
      select to_jsonb(aa) - 'actor_member_id'
      from public.advantage_assignments aa
      where aa.game_id = target_game_id and aa.round_number = active_round
        and aa.actor_member_id = own_member_id
        and active_phase in ('mission','challenge','question','discussion','mission_review','advantage','voting','evaluation','result')
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

-- Refresh-Signal für die neue Auswahl-Tabelle.
drop trigger if exists live_refresh_round_advantage_selections on public.round_advantage_selections;
create trigger live_refresh_round_advantage_selections
after insert or update or delete on public.round_advantage_selections
for each row execute function public.emit_live_game_refresh();

revoke all on function public.assign_selected_advantage_to_millionaire(uuid, smallint, uuid) from public;
revoke all on function public.select_live_round_advantage(uuid, smallint, text, text, text, text, text, text, text, text) from public;
revoke all on function public.mark_live_mission_status(uuid, smallint, public.mission_status) from public;
revoke all on function public.configure_live_advantage(uuid, smallint, uuid, uuid, uuid, uuid, uuid) from public;
revoke all on function public.select_live_questioner(uuid, uuid) from public;
revoke all on function public.complete_live_question(uuid, smallint) from public;
revoke all on function public.host_complete_player_step(uuid, uuid, text) from public;
revoke all on function public.force_live_game_phase(uuid, smallint, public.game_phase) from public;
revoke all on function public.get_live_public_round_flow(uuid) from public;
revoke all on function public.get_live_host_round_control(uuid) from public;

grant execute on function public.select_live_round_advantage(uuid, smallint, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.mark_live_mission_status(uuid, smallint, public.mission_status) to authenticated;
grant execute on function public.configure_live_advantage(uuid, smallint, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.select_live_questioner(uuid, uuid) to authenticated;
grant execute on function public.complete_live_question(uuid, smallint) to authenticated;
grant execute on function public.host_complete_player_step(uuid, uuid, text) to authenticated;
grant execute on function public.force_live_game_phase(uuid, smallint, public.game_phase) to authenticated;
grant execute on function public.get_live_public_round_flow(uuid) to authenticated;
grant execute on function public.get_live_host_round_control(uuid) to authenticated;

comment on function public.force_live_game_phase(uuid, smallint, public.game_phase) is
  'Explizite Notfallsteuerung für André. Umgeht bewusst die normalen Ablaufblocker.';
