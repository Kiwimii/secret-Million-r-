# Technische Architektur

## Ziel

Die Anwendung ist eine moderierte Mehrspieler-Web-App. Der Server ist die einzige verbindliche Quelle für Rollen, Spielphasen, Stimmen, Vorteile, Punkte und Ausscheiden. Die Spielleitung bestätigt alle kritischen Übergänge.

## Schichten

- **Next.js App Router:** mobile Spieleroberfläche, Intro, Lobby und Spielleiter-Dashboard.
- **Domain Engine (`lib/game`):** deterministische Regeln ohne Datenbank- oder UI-Abhängigkeiten.
- **Supabase Postgres:** dauerhafter Spielstand, Authentifizierung, Echtzeitereignisse und Profilbilder.
- **Server Actions / Route Handler:** alle kritischen Änderungen. Der Browser berechnet keine offiziellen Ergebnisse.

## Getrennte Spielerzustände

Gewinnberechtigung und Anwesenheit dürfen nicht in einem einzigen Status vermischt werden.

### Gewinnerpool

- `eligible`: darf Millionär sein, Punkte sammeln und den Hauptpreis gewinnen.
- `eliminated`: aus dem Gewinnerpool entfernt, bleibt bei Anwesenheit aber in Abstimmungen und Challenges.
- `disqualified`: keine Gewinn- oder weitere Teilnahmeberechtigung.

### Anwesenheit

- `present`: nimmt entsprechend seinem Gewinnerpoolstatus teil.
- `temporarily_absent`: bleibt grundsätzlich gewinnberechtigt, stimmt und spielt vorübergehend aber nicht mit.
- `departed`: dauerhaft abgereist; keine Abstimmungen, Challenges oder neue Rolle.

Dadurch bleibt ein bereits ausgeschiedener Spieler auch dann ausgeschieden, wenn er später abreist. Eine Rückkehr aus `temporarily_absent` stellt nur die Anwesenheit wieder her und verändert nicht den Gewinnerpool.

Scheidet der aktuelle Millionär aus, wird disqualifiziert oder reist ab, wird die Rolle geleert. Der Ablauf bleibt gesperrt, bis die Spielleitung einen gültigen Nachfolger bestätigt. Bei vorübergehender Abwesenheit bleibt die Rolle bestehen, der Ablauf ist aber bis zur Rückkehr oder bewussten Neubesetzung gesperrt.

## Rundenmaschine

Jede Runde durchläuft:

1. Rollenfreigabe
2. Missionsausgabe
3. Challenge
4. Fragesteller
5. Diskussion
6. Missionsbewertung
7. Vorteil
8. Hauptabstimmung
9. Auswertung
10. Ergebnis

Nach Runde 1 bis 3 folgt die Rollenentscheidung. Danach beginnt die nächste Runde wieder bei der Rollenfreigabe. Nach dem Ergebnis der vierten Runde endet das Spiel.

## Geheimdaten

Die Datenbank trennt öffentliche Teilnehmerdaten von geheimen Rundendaten:

- Rollen liegen in `round_roles`.
- Missionen liegen in `mission_assignments`.
- Vorteile und Ziele liegen in `advantage_assignments`.
- Rohstimmen liegen in `votes`.
- Punkte pro Runde liegen in `round_scores`.
- Chronologische Änderungen liegen in `game_events` und `player_lifecycle_events`.

Spieler dürfen nur ihre eigenen Rollen, Missionen und Vorteile lesen. Rohstimmen, Punkte und vollständige Auswertungen bleiben bis zur Auflösung ausschließlich für die Spielleitung sichtbar.

## Sicherheitsprinzipien

1. Kritische Daten werden nur serverseitig verändert.
2. Supabase RLS ist auf allen Spieltabellen aktiviert.
3. Der Service-Role-Key wird niemals an den Browser ausgeliefert.
4. Jede administrative Änderung erzeugt einen Eintrag im Ereignisprotokoll.
5. Abstimmungen, Punktevergabe und Phasenwechsel sind idempotent und revisionsgesichert.
6. Profil-PINs werden ausschließlich als Hash gespeichert.
7. Spieler werden für den Wochenendbetrieb über anonyme Supabase-Nutzerkonten oder eine gleichwertige serverseitige Geräteidentität getrennt.

## Aktueller Entwicklungsmodus

Das interaktive Dashboard arbeitet derzeit mit lokalem Browserzustand. Es dient zur Prüfung der Abläufe und Sonderfälle. Es ist ausdrücklich noch kein Mehrgerätebetrieb. Der produktive Spielstand wird erst nach Anbindung eines Supabase-Projekts verbindlich und live synchronisiert.
