import type { RoundDefinition, RoundPhase } from "./types";

export const ROUNDS: readonly RoundDefinition[] = [
  { number: 1, title: "Operation Umkehrschub", timing: "Freitagabend", points: 1 },
  { number: 2, title: "Der Fall des weißen Königs", timing: "Samstagmorgen", points: 2 },
  { number: 3, title: "Protokoll Aquarius", timing: "Samstagmittag am See", points: 3 },
  { number: 4, title: "Die Midas-Klammer", timing: "Samstagabend / Finale", points: 4 },
] as const;

export const PHASE_ORDER: readonly RoundPhase[] = [
  "lobby",
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
  "role_transfer",
  "finished",
] as const;
