-- Der Browser liest Andrés Rundenpaket derzeit direkt aus den Auswahl-Tabellen.
-- RLS war korrekt aktiv, aber dem authenticated-Rollenprofil fehlte das SELECT-Privileg.
-- Die bestehende Host-Policy begrenzt den Zugriff weiterhin auf die eigene Partie.

grant select on table public.round_advantage_selections to authenticated;

-- Defensive Wiederherstellung der Host-only-Leseregel.
alter table public.round_advantage_selections enable row level security;

drop policy if exists round_advantage_host_all on public.round_advantage_selections;
create policy round_advantage_host_all on public.round_advantage_selections
for all to authenticated
using (public.is_game_host(game_id))
with check (public.is_game_host(game_id));

comment on table public.round_advantage_selections is
  'Geheime Vorteilsfestlegung je Runde. Direkter SELECT ist durch RLS ausschließlich für André der jeweiligen Partie erlaubt.';
