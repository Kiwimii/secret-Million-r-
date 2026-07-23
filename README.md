# Secret Millionär – Blaue Adria

Mobile, moderierte Web-App für das Secret-Millionär-Wochenende.

## Einsatztest im Browser

Die Route `/demo` enthält die vollständige mobile Spielsimulation für Smartphone und Desktop:

- geführte Spielleiteransicht mit Ziel, Prüfliste, Klickwirkung, Warnungen und Sperrgründen
- private Spieleransichten mit versiegelter Rollenkarte
- zufällige und geheime Auslosung des Startmillionärs
- Korken behalten oder abgeben, ohne eine Zielperson bestimmen zu können
- zufällige Nachfolge bei Abgabe, Enttarnung oder Ausfall
- rundenabhängige Missionsfristen
- Fragesteller, geheime Ja-Nein-Frage und private Antwort
- Hauptabstimmung, echte Stichwahl und Zufallslos bei erneutem Gleichstand
- tatsächliche Anwendung der Missionsvorteile
- Punktevergabe, Finalregel und Tiebreaker
- Ausscheiden, Abreise, Pause und Disqualifikation
- automatische Bereinigung ungültiger offener Stimmen
- Synchronisierung zwischen mehreren Tabs desselben Browsers
- Speicherung des Teststands im Browser
- installierbares Web-App-Manifest

Die Browser-Simulation benötigt keine Supabase-Schlüssel. Getrennte Smartphones werden erst durch die produktive Supabase-Anbindung miteinander synchronisiert.

## Verbindliche Millionärsregel

Der Millionär wird niemals manuell ausgewählt.

1. Vor Runde 1 lost die App zufällig aus allen anwesenden und gewinnberechtigten Spielern aus.
2. Behält der aktuelle Millionär den Korken, bleibt seine Rolle bestehen.
3. Gibt er den Korken ab, bestimmt er keine Zielperson. Die App lost zufällig aus allen anderen anwesenden und gewinnberechtigten Spielern aus.
4. Wird der Millionär enttarnt oder fällt aus, lost die App zufällig aus allen verbliebenen Berechtigten aus.
5. Die neue Rolle bleibt bis zur Rollenfreigabe der nächsten Runde versiegelt.

Die Browser-Version nutzt Web Crypto. Die Supabase-Datenbank enthält zusätzlich eine hostgeschützte serverseitige Zufallsfunktion und verhindert direkte Client-Updates der geheimen Millionärs-ID.

## Sicherheitsmodell

- Gewinnerpoolstatus und Anwesenheit sind getrennte Zustände.
- Spieler können den öffentlichen Spielzustand lesen, aber niemals die Millionärs-ID.
- Spieler lesen ausschließlich ihre eigene Rolle der aktuell freigegebenen Runde.
- Bereits ausgeloste Rollen einer Folgerunde bleiben während der Korkenauflösung verborgen.
- Missionen, Vorteile und exklusive Antworten werden erst in der jeweils zulässigen Phase sichtbar.
- Rohstimmen, Punkte und vollständige Auswertungen bleiben bei der Spielleitung.
- Kritische Auslosungen und Rollenentscheidungen werden protokolliert.

## Lokaler Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Danach läuft die Anwendung unter `http://localhost:3000`. Der Einsatztest liegt unter `http://localhost:3000/demo`.

## Qualitätsprüfung

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Projektstruktur

- `app/demo/` – geführte Browser-Simulation
- `lib/demo/` – lokaler Testspielstand und Tab-Synchronisierung
- `lib/game/` – deterministische Regeln, Zufallsauslosung und Spielleiteranweisungen
- `supabase/migrations/` – Datenbankschema, Geheimnisschutz und serverseitige Rollenwahl
- `docs/ARCHITECTURE.md` – Architektur- und Sicherheitsentscheidungen

## Noch offen für echten Mehrgerätebetrieb

- öffentliche Vercel-Adresse
- Supabase-Umgebungsvariablen im Hosting
- Spielerbeitritt mit anonymer Geräteidentität
- serverseitige Aktionen für Stimmen, Rollenentscheidungen und Phasenwechsel
- Realtime-Synchronisierung zwischen getrennten Smartphones
- abschließender Probelauf mit allen vorgesehenen Geräten
