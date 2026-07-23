# Technische Architektur

## Ziel

Die Anwendung ist eine moderierte Mehrspieler-Web-App. Der Server ist die einzige verbindliche Quelle für Rollen, Spielphasen, Stimmen, Vorteile, Punkte und Ausscheiden.

## Schichten

- **Next.js App Router:** mobile Spieleroberfläche, Intro, Lobby und Spielleiter-Dashboard.
- **Domain Engine (`lib/game`):** deterministische Regeln ohne Datenbank- oder UI-Abhängigkeiten.
- **Supabase Postgres:** dauerhafter Spielstand, Echtzeitereignisse und Profilbilder.
- **Server Actions / Route Handler:** alle kritischen Änderungen. Der Browser berechnet keine offiziellen Ergebnisse.

## Spielerzustände

- `active`: gewinnberechtigt, abstimmungs- und challengeberechtigt.
- `eliminated`: nicht mehr gewinnberechtigt, bleibt aber bei Abstimmungen und Challenges dabei.
- `departed`: vollständig aus künftigen Abstimmungen und Challenges entfernt.
- `paused`: vorübergehend nicht verfügbar, bleibt grundsätzlich gewinnberechtigt.
- `disqualified`: keine Gewinn- oder weitere Teilnahmeberechtigung.

Scheidet der aktuelle Millionär aus oder reist ab, wird `millionairePlayerId` geleert. Der Phasenwechsel bleibt gesperrt, bis die Spielleitung einen gültigen Nachfolger bestätigt.

## Sicherheitsprinzipien

1. Kritische Daten werden nur serverseitig verändert.
2. Supabase RLS ist standardmäßig aktiviert.
3. Der Service-Role-Key wird niemals an den Browser ausgeliefert.
4. Jede administrative Änderung erzeugt später einen Eintrag im Ereignisprotokoll.
5. Abstimmungen und Punktevergabe müssen idempotent sein.
