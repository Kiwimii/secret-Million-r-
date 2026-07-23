# Secret Millionär – Blaue Adria

Mobile, moderierte Echtzeit-Web-App für das Secret-Millionär-Wochenende.

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

## Entwicklungsmodus

Das Dashboard unter `/admin` ist bereits bedienbar. Seine Änderungen werden aktuell nur im Browserzustand gehalten. Es ist deshalb noch nicht für das echte Wochenende oder mehrere Geräte geeignet.

Der produktive Mehrgerätebetrieb benötigt ein verbundenes Supabase-Projekt für:

- dauerhaften Spielstand
- Spieler- und Spielleiteranmeldung
- Profilfoto-Upload
- geheime persönliche Ansichten
- Live-Synchronisierung
- serverseitige, verbindliche Auswertung

## Lokaler Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Danach läuft die Anwendung unter `http://localhost:3000`.

## Qualitätsprüfung

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Projektstruktur

- `app/` – Next.js-Oberflächen
- `lib/game/` – deterministische Spielregeln und Kataloge
- `supabase/migrations/` – Datenbankschema und Zugriffsschutz
- `docs/ARCHITECTURE.md` – Architektur- und Sicherheitsentscheidungen

## Nächster Meilenstein

Supabase-Projekt verbinden, anonyme Spieleridentitäten und Spielleiter-Login einrichten, Beitritte dauerhaft speichern und Dashboard sowie Spieleransichten live synchronisieren.
