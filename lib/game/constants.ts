import type { RoundDefinition, RoundNumber, RoundPhase } from "./types";

export const ROUNDS: readonly RoundDefinition[] = [
  { number: 1, title: "Operation Umkehrschub", timing: "Freitagabend", points: 1 },
  { number: 2, title: "Der Fall des weißen Königs", timing: "Samstagmorgen", points: 2 },
  { number: 3, title: "Protokoll Aquarius", timing: "Samstagmittag am See", points: 3 },
  { number: 4, title: "Die Midas-Klammer", timing: "Samstagabend / Finale", points: 4 },
] as const;

const REVIEW_BEFORE_DISCUSSION: readonly RoundPhase[] = [
  "role_reveal",
  "mission",
  "challenge",
  "question",
  "mission_review",
  "discussion",
  "advantage",
  "voting",
  "evaluation",
  "result",
] as const;

const REVIEW_AFTER_CHALLENGE: readonly RoundPhase[] = [
  "role_reveal",
  "mission",
  "challenge",
  "mission_review",
  "question",
  "discussion",
  "advantage",
  "voting",
  "evaluation",
  "result",
] as const;

/**
 * Runde 1 und 3 schließen die Mission vor der Diskussion. Runde 2 und 4
 * schließen sie direkt nach der Challenge. So entspricht die App den
 * unterschiedlichen Zeitfenstern der Missionskarten.
 */
export function getRoundPhaseSequence(round: RoundNumber): readonly RoundPhase[] {
  return round === 2 || round === 4
    ? REVIEW_AFTER_CHALLENGE
    : REVIEW_BEFORE_DISCUSSION;
}

// Rückwärtskompatibler Export für bestehende Anzeigen. Die Ablaufsteuerung
// nutzt getRoundPhaseSequence und ist damit rundenabhängig.
export const ROUND_PHASES = REVIEW_BEFORE_DISCUSSION;

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
