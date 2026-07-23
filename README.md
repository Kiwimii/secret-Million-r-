# Secret Millionär – Blaue Adria

Mobile, moderierte Echtzeit-Web-App für das Secret-Millionär-Wochenende.

## Aktueller Stand

Der erste technische Meilenstein enthält:

- atmosphärische Intro-Seite
- Spieler-Beitrittsmaske mit vorbereitetem Profilfoto-Ablauf
- erstes Spielleiter-Dashboard
- zentrale Domain-Typen und Phasensteuerung
- flexible Status für aktive, ausgeschiedene, abgereiste, pausierte und disqualifizierte Spieler
- Blockade des Spielfortschritts, wenn der aktuelle Millionär ausscheidet
- erste Supabase-Datenbankmigration
- Unit-Tests für Sonderausscheiden und Phasenwechsel

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

## Nächster Meilenstein

Supabase-Projekt verbinden, Spiel erstellen, Spielerbeitritt dauerhaft speichern und Spielleiter-Freigaben in Echtzeit synchronisieren.
