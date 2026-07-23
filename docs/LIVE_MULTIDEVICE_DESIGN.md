# Live-Mehrgeräte-Architektur

Diese Datei beschreibt die Zielarchitektur für echte gemeinsame Spielinstanzen. Sie ersetzt die bisherige Annahme, dass Browser-Tabs über `localStorage` synchronisiert werden.

## Ablauf

1. Die Spielleitung meldet sich anonym bei Supabase Auth an und erstellt eine Partie.
2. Die Datenbank erzeugt einen einmaligen sechsstelligen Einladungscode.
3. Spieler melden sich anonym an, geben den Code ein und erstellen ihr persönliches Profil mit vierstelliger PIN.
4. Alle Geräte lesen denselben öffentlichen Spielzustand, dieselbe Lobby, dieselben Teams und dieselbe Challenge aus Supabase.
5. Geheime Rollen, Missionen, Vorteile, Stimmen und Rollenentscheidungen bleiben per RLS auf Spielleitung oder betroffenen Spieler begrenzt.
6. Realtime Broadcast/Postgres Changes aktualisiert die Lobby. Realtime Presence zeigt Online-Status und den aktuellen Bildschirm jedes Spielers.

## Spielleiter-Dashboard

Die Priorisierung lautet:

1. aktuelle Spielphase und nächste verbindliche Aktion
2. Fortschrittsmonitor aller Spieler
3. Warnungen und Blocker
4. Teilnehmerstatus und Teams
5. Challenge-Steuerung
6. geheime Mission der aktuellen Runde
7. Vorteile, Fragen, Abstimmung und Auswertung
8. administrative Eingriffe und Protokoll

## Fortschrittsmonitor

Jeder Client meldet nur einen kontrollierten, nicht-geheimen Fortschrittsstatus:

- aktueller Oberflächenabschnitt
- letzte bestätigte Aktion
- ob eine Rolle geöffnet wurde
- ob eine Mission geöffnet wurde
- ob eine Stimme abgegeben wurde
- ob eine Rollenentscheidung abgegeben wurde
- Zeitstempel der letzten Aktivität
- Online-/Offline-Status

Der Monitor verrät der Spielleitung nicht automatisch die geheime Rollenkarte eines Ermittlers. Für den aktuellen Millionär darf die Spielleitung jedoch sehen, ob Missionskarte und Vorteilsansicht geöffnet wurden, weil sie die Partie moderieren muss.

## Kronkorken

Die bisherige Euro-Marke wird vollständig durch einen goldenen Kronkorken ersetzt. Die Millionärsrolle bleibt thematisch am Korken erkennbar, ohne Währungszeichen als Hauptsymbol.
