import type { RoundDefinition, RoundPhase } from "./types";

export const ROUNDS: readonly RoundDefinition[] = [
  { number: 1, title: "Operation Umkehrschub", timing: "Freitagabend", points: 1 },
  { number: 2, title: "Der Fall des weißen Königs", timing: "Samstagmorgen", points: 2 },
  { number: 3, title: "Protokoll Aquarius", timing: "Samstagmittag am See", points: 3 },
  { number: 4, title: "Die Midas-Klammer", timing: "Samstagabend / Finale", points: 4 },
] as const;

export const ROUND_PHASES: readonly RoundPhase[] = [
  "role_reveal",
  "mission",
  "challenge",
  "question",
  "discussion",
  "mission_review",
  "advantage",
  "voting",
  "evaluation",
  "result",
] as const;

export const PHASE_LABELS: Record<RoundPhase, string> = {
  lobby: "Lobby",
  role_reveal: "Rollen freigeben",
  mission: "Mission ausgeben",
  challenge: "Challenge",
  question: "Fragesteller",
  discussion: "Diskussion",
  mission_review: "Mission bewerten",
  advantage: "Vorteil festlegen",
  voting: "Geheime Abstimmung",
  evaluation: "Auswertung prüfen",
  result: "Ergebnis veröffentlichen",
  role_transfer: "Rollenentscheidung",
  finished: "Spiel beendet",
};

export const PLAYER_NAMES = [
  "Schubi",
  "Lars",
  "Danny",
  "Masl",
  "Rene",
  "Gregor",
  "Felix",
  "Spieler 8",
  "Spieler 9",
  "Spieler 10",
  "Spieler 11",
  "Spieler 12",
] as const;
