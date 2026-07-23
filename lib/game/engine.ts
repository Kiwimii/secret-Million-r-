import { PHASE_ORDER } from "./constants";
import type {
  GameState,
  ParticipationStatus,
  PlayerState,
  PlayerStatusChange,
  RoundPhase,
  StatusChangeResult,
} from "./types";

const STATUS_CAPABILITIES: Record<
  ParticipationStatus,
  Pick<PlayerState, "eligibleToWin" | "canVote" | "canJoinChallenges">
> = {
  active: { eligibleToWin: true, canVote: true, canJoinChallenges: true },
  eliminated: { eligibleToWin: false, canVote: true, canJoinChallenges: true },
  departed: { eligibleToWin: false, canVote: false, canJoinChallenges: false },
  paused: { eligibleToWin: true, canVote: false, canJoinChallenges: false },
  disqualified: { eligibleToWin: false, canVote: false, canJoinChallenges: false },
};

export function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new Error(`Spieler ${playerId} wurde nicht gefunden.`);
  }
  return player;
}

export function getEligibleMillionaireCandidates(state: GameState): PlayerState[] {
  return state.players.filter(
    (player) =>
      player.eligibleToWin &&
      player.participationStatus === "active" &&
      player.id !== state.millionairePlayerId,
  );
}

export function changePlayerStatus(
  state: GameState,
  change: PlayerStatusChange,
): StatusChangeResult {
  const currentPlayer = getPlayer(state, change.playerId);
  const capabilities = STATUS_CAPABILITIES[change.status];
  const leavesWinnerPool = !capabilities.eligibleToWin;
  const isCurrentMillionaire = state.millionairePlayerId === change.playerId;

  const updatedPlayer: PlayerState = {
    ...currentPlayer,
    ...capabilities,
    participationStatus: change.status,
    exitReason: change.reason,
    exitNote: change.note,
    eliminatedInRound:
      leavesWinnerPool && currentPlayer.eliminatedInRound === undefined
        ? change.effectiveRound ?? state.currentRound
        : currentPlayer.eliminatedInRound,
    role: leavesWinnerPool ? "none" : currentPlayer.role,
  };

  const nextState: GameState = {
    ...state,
    revision: state.revision + 1,
    millionairePlayerId: isCurrentMillionaire && leavesWinnerPool ? undefined : state.millionairePlayerId,
    players: state.players.map((player) =>
      player.id === updatedPlayer.id ? updatedPlayer : player,
    ),
  };

  const warnings: string[] = [];
  if (isCurrentMillionaire && leavesWinnerPool) {
    warnings.push("Der aktuelle Millionär ist ausgeschieden. Vor dem Fortsetzen muss ein Nachfolger bestimmt werden.");
  }
  if (change.status === "departed") {
    warnings.push("Der Spieler wird aus künftigen Abstimmungen und Challenges entfernt.");
  }

  return {
    state: nextState,
    requiresMillionaireReplacement: isCurrentMillionaire && leavesWinnerPool,
    warnings,
  };
}

export function canAdvanceToPhase(
  state: GameState,
  nextPhase: RoundPhase,
): { allowed: boolean; reason?: string } {
  const currentIndex = PHASE_ORDER.indexOf(state.phase);
  const nextIndex = PHASE_ORDER.indexOf(nextPhase);

  if (nextIndex !== currentIndex + 1) {
    return { allowed: false, reason: "Spielphasen dürfen nur in der vorgesehenen Reihenfolge freigegeben werden." };
  }

  const phaseNeedsMillionaire = !["lobby", "finished"].includes(nextPhase);
  if (phaseNeedsMillionaire && !state.millionairePlayerId) {
    return { allowed: false, reason: "Es ist kein aktiver Millionär festgelegt." };
  }

  if (state.millionairePlayerId) {
    const millionaire = getPlayer(state, state.millionairePlayerId);
    if (!millionaire.eligibleToWin || millionaire.participationStatus !== "active") {
      return { allowed: false, reason: "Der festgelegte Millionär ist nicht mehr aktiv und gewinnberechtigt." };
    }
  }

  return { allowed: true };
}

export function advanceToPhase(state: GameState, nextPhase: RoundPhase): GameState {
  const validation = canAdvanceToPhase(state, nextPhase);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  return { ...state, phase: nextPhase, revision: state.revision + 1 };
}
