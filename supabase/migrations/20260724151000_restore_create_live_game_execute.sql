-- Minimaler Start-Hotfix: stellt ausschließlich das Ausführungsrecht der bereits
-- vorhandenen SECURITY-DEFINER-Funktion für angemeldete Gerätesitzungen wieder her.
-- Keine Tabellen, Daten oder Spielmechaniken werden verändert.

grant execute on function public.create_live_game(text, text) to authenticated;

comment on function public.create_live_game(text, text) is
  'Erstellt eine Live-Partie für eine authentifizierte anonyme Gerätesitzung.';
