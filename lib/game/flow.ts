import { getRoundPhaseSequence } from "./constants";
import { getPlayer, getPlayerCapabilities } from "./lifecycle";
import type { GameState, NextGameStep, RoundNumber } from "./types";

export function getNextGameStep(
  state: GameState & { phase: "finished" },
): undefined;
export function getNextGameStep(state: GameState): NextGameStep;
export function getNextGameStep(state: GameState): NextGameStep | undefined {
  if (state.phase === "finished") return undefined;
  if (state.phase === "lobby") return { round: 1, phase: "role_reveal" };

  if (state.phase === "result") {
    return state.currentRound === 4
      ? { round: 4, phase: "finished" }
      : { round: state.currentRound, phase: "role_transfer" };
  }

  if (state.phase === "role_transfer") {
    return {
      round: (state.currentRound + 1) as RoundNumber,
      phase: "role_reveal",
    };
  }

  const phases = getRoundPhaseSequence(state.currentRound);
  const currentIndex = phases.indexOf(state.phase);
  const nextPhase = phases[currentIndex + 1];
  return nextPhase ? { round: state.currentRound, phase: nextPhase } : undefined;
}

export function canAdvanceGame(state: GameState): { allowed: boolean; reason?: string } {
  if (state.phase === "finished") {
    return { allowed: false, reason: "Das Spiel ist bereits beendet." };
  }
  const next = getNextGameStep(state);

  // Die Rollenentscheidungsphase muss auch geöffnet werden können, wenn der
  // bisherige Millionär ausgeschieden ist. Verlassen werden darf sie erst,
  // nachdem serverseitig ein gültiger Nachfolger ausgelost wurde.
  const nextNeedsMillionaire = !["finished", "role_transfer"].includes(next.phase);
  if (nextNeedsMillionaire && !state.millionairePlayerId) {
    return { allowed: false, reason: "Es ist kein aktiver Millionär festgelegt." };
  }

  if (nextNeedsMillionaire && state.millionairePlayerId) {
    const millionaire = getPlayer(state, state.millionairePlayerId);
    if (!getPlayerCapabilities(millionaire).canBeMillionaire) {
      return {
        allowed: false,
        reason: "Der festgelegte Millionär ist nicht anwesend und gewinnberechtigt.",
      };
    }
  }

  return { allowed: true };
}

export function advanceGame(state: GameState): GameState {
  const validation = canAdvanceGame(state);
  if (!validation.allowed) throw new Error(validation.reason);

  const next = getNextGameStep(state);

  return {
    ...state,
    currentRound: next.round,
    phase: next.phase,
    revision: state.revision + 1,
  };
}
