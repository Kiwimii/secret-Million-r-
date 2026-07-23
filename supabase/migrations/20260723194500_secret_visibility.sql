-- Eigene Rollen dürfen erst in der tatsächlich gestarteten Runde gelesen
-- werden. Eine bereits ausgeloste Rolle der Folgerunde bleibt während der
-- Korkenauflösung vollständig versiegelt.
drop policy if exists roles_member_read_own on public.round_roles;

create policy roles_member_read_current_round on public.round_roles
for select to authenticated
using (
  member_id in (
    select gm.id
    from public.game_members gm
    where gm.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.games g
    where g.id = round_roles.game_id
      and g.current_round = round_roles.round_number
      and g.phase not in ('lobby', 'role_transfer')
  )
);

-- Die Mission wird erst ab der Missionsphase sichtbar und ausschließlich für
-- den zugewiesenen Spieler.
drop policy if exists missions_assignee_read on public.mission_assignments;

create policy missions_assignee_read_when_released on public.mission_assignments
for select to authenticated
using (
  assigned_member_id in (
    select gm.id
    from public.game_members gm
    where gm.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.games g
    where g.id = mission_assignments.game_id
      and g.current_round = mission_assignments.round_number
      and g.phase in (
        'mission', 'challenge', 'question', 'mission_review', 'discussion',
        'advantage', 'voting', 'evaluation', 'result'
      )
  )
);

-- Ein Vorteil wird erst nach erfolgreicher Missionsbewertung sichtbar.
drop policy if exists advantages_actor_read on public.advantage_assignments;

create policy advantages_actor_read_when_released on public.advantage_assignments
for select to authenticated
using (
  actor_member_id in (
    select gm.id
    from public.game_members gm
    where gm.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.games g
    join public.rounds r
      on r.game_id = g.id
     and r.round_number = advantage_assignments.round_number
    where g.id = advantage_assignments.game_id
      and g.current_round = advantage_assignments.round_number
      and r.mission_status = 'completed'
      and g.phase in ('advantage', 'voting', 'evaluation', 'result')
  )
);

-- Der Fragesteller darf ausschließlich seine eigene Frage und Antwort lesen.
create policy questioner_read_own_answer on public.questioner_questions
for select to authenticated
using (
  questioner_member_id in (
    select gm.id
    from public.game_members gm
    where gm.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.games g
    where g.id = questioner_questions.game_id
      and g.current_round = questioner_questions.round_number
      and g.phase in ('question', 'mission_review', 'discussion', 'advantage', 'voting', 'evaluation', 'result')
  )
);

-- Sichere Kandidatenliste für Spielergeräte. Sie enthält bewusst keine Rolle,
-- keine Punkte und keine geheime Millionärs-ID.
create or replace function public.get_public_game_members(target_game_id uuid)
returns table (
  member_id uuid,
  display_name citext,
  avatar_path text,
  attendance_status public.attendance_status,
  winner_pool_status public.winner_pool_status
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_game_host(target_game_id)
     and not public.is_approved_game_member(target_game_id) then
    raise exception 'Kein Zugriff auf die Teilnehmerliste.' using errcode = '42501';
  end if;

  return query
  select
    gm.id,
    gm.display_name,
    gm.avatar_path,
    gm.attendance_status,
    gm.winner_pool_status
  from public.game_members gm
  where gm.game_id = target_game_id
    and gm.approved_at is not null
  order by gm.created_at, gm.display_name;
end;
$$;

revoke all on function public.get_public_game_members(uuid) from public;
grant execute on function public.get_public_game_members(uuid) to authenticated;

comment on function public.get_public_game_members(uuid) is
  'Öffentliche Teilnehmerliste ohne Rollen, Punkte, PIN-Hash oder geheime Spielinformationen.';
