-- Der Browser lädt die ausgewählte Challenge nach jeder Host-Aktion direkt aus
-- challenge_rounds. Die bestehenden RLS-Policies begrenzen den Zugriff weiterhin
-- auf die Spielleitung und bestätigte Mitglieder der jeweiligen Partie.
grant select on table public.challenge_rounds to authenticated;

comment on table public.challenge_rounds is
  'Öffentliche Challenge-Beschreibung und bestätigtes Gewinnerteam pro Runde. Direkt lesbar nur im Rahmen der bestehenden RLS-Policies.';
