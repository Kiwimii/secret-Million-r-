import type {
  FinalWinnerResolution,
  GameState,
  MissionStatus,
  PlayerState,
  RoundNumber,
  RoundOutcome,
  TeamAssignment,
  TeamCode,
  VoteStage,
} from "@/lib/game/types";

export type RoleDecision = "not_millionaire" | "keep" | "release";

export interface RoundVotes {
  main: Record<string, string>;
  runoff: Record<string, string>;
}

export interface DemoAdvantageSelection {
  advantageId: string;
  targetPlayerId?: string;
  secondaryTargetPlayerId?: string;
  sourceTargetPlayerId?: string;
  voterPlayerId?: string;
  tieOpponentPlayerId?: string;
}

export interface DemoSnapshot {
  game: GameState;
  votesByRound: Partial<Record<RoundNumber, RoundVotes>>;
  voteStageByRound: Partial<Record<RoundNumber, VoteStage>>;
  runoffCandidateIdsByRound: Partial<Record<RoundNumber, string[]>>;
  missionStatusByRound: Partial<Record<RoundNumber, MissionStatus>>;
  advantageByRound: Partial<Record<RoundNumber, DemoAdvantageSelection>>;
  challengeIdByRound: Partial<Record<RoundNumber, string>>;
  teamsByRound: Partial<Record<RoundNumber, TeamAssignment[]>>;
  challengeWinnerByRound: Partial<Record<RoundNumber, TeamCode>>;
  roleDecisionsByRound: Partial<Record<RoundNumber, Record<string, RoleDecision>>>;
  roleTransferResolvedByRound: Partial<Record<RoundNumber, boolean>>;
  questionerByRound: Partial<Record<RoundNumber, string>>;
  questionTextByRound: Partial<Record<RoundNumber, string>>;
  questionAnswerByRound: Partial<Record<RoundNumber, boolean>>;
  lastOutcome?: RoundOutcome;
  finalWinner?: FinalWinnerResolution;
  hostMessage: string;
  updatedAt: string;
}

const DEMO_PLAYERS = [
  "Schubi",
  "Lars",
  "Danny",
  "Masl",
  "Rene",
  "Gregor",
  "Felix",
] as const;

function createPlayer(name: string, index: number): PlayerState {
  return {
    id: `player-${index + 1}`,
    name,
    registrationStatus: "invited",
    attendanceStatus: "temporarily_absent",
    winnerPoolStatus: "eligible",
    role: "none",
    points: 0,
    correctGuesses: 0,
  };
}

export function emptyRoundVotes(): RoundVotes {
  return { main: {}, runoff: {} };
}

export function createInitialDemoSnapshot(): DemoSnapshot {
  return {
    game: {
      id: "blaue-adria-demo",
      currentRound: 1,
      phase: "lobby",
      players: DEMO_PLAYERS.map(createPlayer),
      revision: 1,
      roundOutcomes: [],
    },
    votesByRound: {},
    voteStageByRound: { 1: "main", 2: "main", 3: "main", 4: "main" },
    runoffCandidateIdsByRound: {},
    missionStatusByRound: {
      1: "unassigned",
      2: "unassigned",
      3: "unassigned",
      4: "unassigned",
    },
    advantageByRound: {
      1: { advantageId: "r1-double-vote" },
      2: { advantageId: "r2-block-vote" },
      3: { advantageId: "r3-two-shadow-votes" },
      4: { advantageId: "r4-redirect" },
    },
    challengeIdByRound: {
      1: "operation-umkehrschub",
      2: "fall-des-weissen-koenigs",
      3: "protokoll-aquarius",
      4: "midas-klammer",
    },
    teamsByRound: {},
    challengeWinnerByRound: {},
    roleDecisionsByRound: {},
    roleTransferResolvedByRound: {},
    questionerByRound: {},
    questionTextByRound: {},
    questionAnswerByRound: {},
    hostMessage: "Registriert eure Profile und lost anschließend die Teams und den Startmillionär aus.",
    updatedAt: new Date().toISOString(),
  };
}

export function isDemoSnapshot(value: unknown): value is DemoSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoSnapshot>;
  return Boolean(
    candidate.game &&
      Array.isArray(candidate.game.players) &&
      candidate.votesByRound &&
      candidate.voteStageByRound &&
      candidate.advantageByRound &&
      candidate.challengeIdByRound &&
      candidate.teamsByRound &&
      candidate.challengeWinnerByRound &&
      candidate.roleDecisionsByRound,
  );
}
