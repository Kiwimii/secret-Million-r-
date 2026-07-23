export type GameRole = "millionaire" | "investigator" | "none";

export type ParticipationStatus =
  | "active"
  | "eliminated"
  | "departed"
  | "paused"
  | "disqualified";

export type RoundPhase =
  | "lobby"
  | "role_reveal"
  | "mission"
  | "challenge"
  | "question"
  | "discussion"
  | "mission_review"
  | "advantage"
  | "voting"
  | "evaluation"
  | "result"
  | "role_transfer"
  | "finished";

export type ExitReason =
  | "vote"
  | "early_departure"
  | "illness"
  | "voluntary"
  | "rule_violation"
  | "host_decision"
  | "other";

export interface PlayerState {
  id: string;
  name: string;
  avatarUrl?: string;
  participationStatus: ParticipationStatus;
  role: GameRole;
  eligibleToWin: boolean;
  canVote: boolean;
  canJoinChallenges: boolean;
  points: number;
  correctGuesses: number;
  eliminatedInRound?: number;
  exitReason?: ExitReason;
  exitNote?: string;
}

export interface RoundDefinition {
  number: 1 | 2 | 3 | 4;
  title: string;
  timing: string;
  points: number;
}

export interface GameState {
  id: string;
  currentRound: 1 | 2 | 3 | 4;
  phase: RoundPhase;
  players: PlayerState[];
  millionairePlayerId?: string;
  revision: number;
}

export interface PlayerStatusChange {
  playerId: string;
  status: ParticipationStatus;
  reason: ExitReason;
  note?: string;
  effectiveRound?: number;
}

export interface StatusChangeResult {
  state: GameState;
  requiresMillionaireReplacement: boolean;
  warnings: string[];
}
