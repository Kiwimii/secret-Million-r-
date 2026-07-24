-- Die bisherige Spieler-Policy auf round_mission_selections griff innerhalb
-- der RLS-Auswertung direkt auf games und game_members zu. Browserrollen
-- besitzen bewusst keine allgemeinen SELECT-Rechte auf games, da die Tabelle
-- unter anderem host_pin_hash und millionaire_member_id enthält.
--
-- Die Freigabeprüfung wird daher in eine Security-Definer-Funktion gekapselt.
create or replace function public.can_read_live_round_mission(
  target_game_id uuid,
  target_round smallint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games g
    join public.game_members gm
      on gm.id = g.millionaire_member_id
     and gm.game_id = g.id
    where g.id = target_game_id
      and g.current_round = target_round
      and gm.user_id = auth.uid()
      and g.phase in (
        'mission', 'challenge', 'question', 'mission_review', 'discussion',
        'advantage', 'voting', 'evaluation', 'result'
      )
  );
$$;

revoke all on function public.can_read_live_round_mission(uuid, smallint) from public;
grant execute on function public.can_read_live_round_mission(uuid, smallint) to authenticated;

drop policy if exists round_mission_assignee_read on public.round_mission_selections;
create policy round_mission_assignee_read on public.round_mission_selections
for select to authenticated
using (
  public.can_read_live_round_mission(game_id, round_number)
);

comment on function public.can_read_live_round_mission(uuid, smallint) is
  'Prüft ohne Freigabe sensibler games-Spalten, ob das aktuelle Gerät die Mission der aktiven Runde lesen darf.';
