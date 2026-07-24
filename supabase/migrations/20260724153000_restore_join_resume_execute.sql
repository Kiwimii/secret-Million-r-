-- Minimaler Produktionshotfix: stellt ausschließlich das Ausführungsrecht der
-- bestehenden Beitritts-/Wiedereintrittsfunktion für authentifizierte anonyme
-- Gerätesitzungen wieder her. Keine Tabellen, Daten oder Spielmechaniken ändern sich.

grant execute on function public.join_or_resume_live_game(text, text, text, text) to authenticated;

comment on function public.join_or_resume_live_game(text, text, text, text) is
  'Erstellt oder übernimmt ein Spielerprofil für eine authentifizierte anonyme Gerätesitzung.';
