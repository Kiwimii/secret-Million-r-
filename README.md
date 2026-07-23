# Secret Millionär – Blaue Adria

Mobile, moderierte Echtzeit-Web-App für das Secret-Millionär-Wochenende.

## Browser-Testversion

Die Route `/demo` enthält eine mobile-first Testumgebung für Smartphone und Desktop:

- Spielleiter- und Spieleransicht
- Rollenkarte mit diskreter Aufdeckung
- Mission und Vorteil für den Millionär
- geheime Abstimmung
- Spielerstatus für Ausscheiden, Abreise, Pause und Disqualifikation
- Runden- und Phasensteuerung
- simulierte Auswertung und Punktevergabe
- Speicherung im Browser
- Synchronisierung zwischen mehreren Tabs desselben Browsers
- installierbares Web-App-Manifest

Die Testversion benötigt keine Supabase-Schlüssel und kann sofort bereitgestellt werden. Getrennte Smartphones werden in diesem Zwischenstand noch nicht miteinander synchronisiert. Das folgt mit der produktiven Supabase-Anbindung.

## Aktueller Stand

Der aktuelle Entwicklungsstand enthält:

- atmosphärische, responsive Intro-Seite
- Spieler-Beitrittsmaske mit vorbereitetem Profilfoto-Ablauf
- interaktives Spielleiter-Dashboard im lokalen Entwicklungsmodus
- getrennte Verwaltung von Gewinnerpool und Anwesenheit
- jederzeitiges Ausscheiden, Abreisen, Pausieren, Disqualifizieren und administratives Wiederherstellen
- automatische Ablaufblockade, wenn der aktuelle Millionär nicht mehr verfügbar ist
- korrekte Phasenwechsel über vier Runden einschließlich Rollenentscheidung und Finale
- vollständiger Missions- und Vorteilskatalog aus den Spielunterlagen
- serverunabhängige Abstimmungsauswertung für Hauptwahl und Stichwahl
- Logik für alle acht Vorteile, Punktevergabe und Final-Tiebreaker
- gehärtetes Supabase-Datenmodell für Rollen, Missionen, Stimmen, Punkte und Ereignisprotokoll
- Unit-Tests und GitHub-Actions-CI

## Lokaler Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Danach läuft die Anwendung unter `http://localhost:3000`. Die mobile Testversion liegt unter `http://localhost:3000/demo`.

## Qualitätsprüfung

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Projektstruktur

- `app/` – Next.js-Oberflächen
- `app/demo/` – mobile Browser-Testversion
- `lib/demo/` – lokaler Testspielstand und Browser-Synchronisierung
- `lib/game/` – deterministische Spielregeln und Kataloge
- `supabase/migrations/` – Datenbankschema und Zugriffsschutz
- `docs/ARCHITECTURE.md` – Architektur- und Sicherheitsentscheidungen

## Nächster Meilenstein

Vercel-Bereitstellung der Browser-Testversion. Danach werden anonyme Spieleridentitäten, Spielleiter-Login, dauerhafte Speicherung und Live-Synchronisierung über das bereits angelegte Supabase-Projekt verbunden.
