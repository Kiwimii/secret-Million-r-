import type { AdvantageDefinition } from "./types";

export const SIMPLIFIED_ADVANTAGES: readonly AdvantageDefinition[] = [
  {
    id: "millionaire-double-vote",
    title: "Doppelte Stimme",
    effect: "double_vote",
    description: "Die eigene Stimme des Millionärs zählt in dieser Runde doppelt.",
    playerInstructions: "Stimme später ganz normal ab. Dein gewähltes Ziel erhält automatisch insgesamt zwei Stimmen von dir.",
    hostInstructions: "Die Auswertung addiert verdeckt eine weitere Stimme auf das tatsächliche Abstimmungsziel des Millionärs.",
    limit: "Nur die Hauptabstimmung der aktuellen Runde.",
    selectionMode: "none",
    reserve: false,
  },
  {
    id: "millionaire-triple-vote",
    title: "Dreifache Stimme",
    effect: "triple_vote",
    description: "Die eigene Stimme des Millionärs zählt in dieser Runde dreifach.",
    playerInstructions: "Stimme später ganz normal ab. Dein gewähltes Ziel erhält automatisch insgesamt drei Stimmen von dir.",
    hostInstructions: "Die Auswertung addiert verdeckt zwei weitere Stimmen auf das tatsächliche Abstimmungsziel des Millionärs.",
    limit: "Nur die Hauptabstimmung der aktuellen Runde.",
    selectionMode: "none",
    reserve: false,
  },
  {
    id: "millionaire-redirect-vote",
    title: "Goldene Umleitung",
    effect: "redirect_vote",
    description: "Eine Stimme wird von einem ausgewählten Spieler auf ein anderes Ziel umgeleitet. Zusätzlich zählt die Stimme des Millionärs für das neue Ziel.",
    playerInstructions: "Wähle ein Ausgangsziel und ein anderes Endziel. Dein eigener Stimmzettel zählt automatisch für das Endziel. Zusätzlich wandert eine Stimme vom Ausgangsziel zum Endziel. Hat das Ausgangsziel keine verfügbare Stimme, erhält das Endziel trotzdem insgesamt zwei Stimmen durch deinen Vorteil.",
    hostInstructions: "Die Auswertung verschiebt die Stimme des Millionärs auf das Endziel und addiert eine weitere Umleitungsstimme. Beim Ausgangsziel wird höchstens eine tatsächlich vorhandene weitere Stimme entfernt.",
    limit: "Ausgangs- und Endziel müssen verschieden und noch im Gewinnerpool sein. Nur die Hauptabstimmung.",
    selectionMode: "source_and_target",
    reserve: false,
  },
] as const;
