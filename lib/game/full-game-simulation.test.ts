import { describe, expect, it } from "vitest";
import {
  advanceGame,
  applyPlayerLifecycleChange,
  evaluateVotes,
  finalizeRound,
  getPlayerCapabilities,
  resolveFinalWinner,
  setMillionaire,
} from "./engine";
import type { GameState, PlayerState, RoundPhase, Vote } from "./types";

const PLAYER_NAMES = ["Schubi", "Lars", "Danny", "Masl", "Rene", "Gregor", "Felix"];

function player(index: number): PlayerState {
  return {
    id: `p${index + 1}`,
    name: PLAYER_NAMES[index],
    registrationStatus: "registered",
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role: index === 0 ? "millionaire" : "investigator",
    points: 0,
    correctGuesses: 0,
  };
}

function initialState(): GameState {
  return {
    id: "complete-weekend-simulation",
    currentRound: 1,
    phase: "lobby",
    millionairePlayerId: "p1",
    revision: 1,
    roundOutcomes: [],
    players: PLAYER_NAMES.map((_, index) => player(index)),
  };
}

function advanceTo(state: GameState, target: RoundPhase): GameState {
  let current = state;
  let safety = 0;
  while (current.phase !== target) {
    current = advanceGame(current);
    safety += 1;
    if (safety > 20) throw new Error(`Phase ${target} wurde nicht erreicht.`);
  }
  return current;
}

function mainVotes(entries: Array<[string, string]>): Vote[] {
  return entries.map(([voterPlayerId, accusedPlayerId]) => ({
    voterPlayerId,
    accusedPlayerId,
    stage: "main",
  }));
}

describe("vollständige Secret-Millionär-Partie", () => {
  it("läuft mit sieben Spielern, Abreise, Rollenwechsel und Finale fehlerfrei durch alle vier Runden", () => {
    let state = initialState();

    // Runde 1: Lars wird fälschlich beschuldigt, Schubi behält den Korken.
    state = advanceTo(state, "evaluation");
    const round1Votes = mainVotes([
      ["p1", "p2"],
      ["p2", "p1"],
      ["p3", "p1"],
      ["p4", "p1"],
      ["p5", "p2"],
      ["p6", "p2"],
      ["p7", "p2"],
    ]);
    const round1Evaluation = evaluateVotes(state, round1Votes);
    const round1 = finalizeRound(state, round1Votes, round1Evaluation);
    state = round1.state;

    expect(round1.outcome).toMatchObject({
      round: 1,
      eliminatedPlayerId: "p2",
      millionairePlayerId: "p1",
      millionaireSurvived: true,
    });
    expect(state.players.find((candidate) => candidate.id === "p1")?.points).toBe(1);

    state = advanceGame(state); // Rollenentscheidung
    state = advanceGame(state); // Runde 2 / Rollenfreigabe
    expect(state).toMatchObject({ currentRound: 2, phase: "role_reveal" });

    // Runde 2: Danny reist endgültig ab und darf danach weder abstimmen noch gewinnen.
    state = applyPlayerLifecycleChange(state, {
      playerId: "p3",
      action: "depart",
      reason: "early_departure",
    }).state;
    const departedDanny = state.players.find((candidate) => candidate.id === "p3");
    expect(departedDanny?.attendanceStatus).toBe("departed");
    expect(departedDanny && getPlayerCapabilities(departedDanny).canVote).toBe(false);

    state = advanceTo(state, "evaluation");
    const round2Votes = mainVotes([
      ["p1", "p4"],
      ["p2", "p4"],
      ["p4", "p1"],
      ["p5", "p1"],
      ["p6", "p4"],
      ["p7", "p4"],
    ]);
    const round2Evaluation = evaluateVotes(state, round2Votes);
    const round2 = finalizeRound(state, round2Votes, round2Evaluation);
    state = round2.state;

    expect(round2.outcome).toMatchObject({
      round: 2,
      eliminatedPlayerId: "p4",
      millionairePlayerId: "p1",
      millionaireSurvived: true,
    });

    // Der Korken wird zufällig neu vergeben; im deterministischen Test fällt er an Rene.
    state = advanceGame(state);
    state = setMillionaire(state, "p5");
    state = advanceGame(state);
    expect(state).toMatchObject({ currentRound: 3, phase: "role_reveal", millionairePlayerId: "p5" });

    // Runde 3: Rene wird enttarnt. Bereits ausgeschiedene, aber anwesende Spieler stimmen weiter mit ab.
    state = advanceTo(state, "evaluation");
    const round3Votes = mainVotes([
      ["p1", "p5"],
      ["p2", "p5"],
      ["p4", "p5"],
      ["p5", "p1"],
      ["p6", "p5"],
      ["p7", "p1"],
    ]);
    const round3Evaluation = evaluateVotes(state, round3Votes);
    const round3 = finalizeRound(state, round3Votes, round3Evaluation);
    state = round3.state;

    expect(round3.outcome).toMatchObject({
      round: 3,
      eliminatedPlayerId: "p5",
      millionairePlayerId: "p5",
      millionaireSurvived: false,
    });
    expect(state.millionairePlayerId).toBeUndefined();

    // Trotz enttarntem Millionär lässt sich die Rollenentscheidung öffnen.
    state = advanceGame(state);
    expect(state.phase).toBe("role_transfer");
    state = setMillionaire(state, "p6");
    state = advanceGame(state);
    expect(state).toMatchObject({ currentRound: 4, phase: "role_reveal", millionairePlayerId: "p6" });

    // Runde 4: Gregor überlebt als Millionär. Felix wird im Finale beschuldigt.
    state = advanceTo(state, "evaluation");
    const round4Votes = mainVotes([
      ["p1", "p6"],
      ["p2", "p7"],
      ["p4", "p7"],
      ["p5", "p7"],
      ["p6", "p7"],
      ["p7", "p6"],
    ]);
    const round4Evaluation = evaluateVotes(state, round4Votes);
    const round4 = finalizeRound(state, round4Votes, round4Evaluation);
    state = round4.state;

    const winner = resolveFinalWinner(state, round4.outcome);
    expect(winner).toEqual({
      winnerPlayerId: "p6",
      requiresLot: false,
      tiedPlayerIds: [],
      reason: "millionaire_survived",
    });

    state = advanceGame(state);
    expect(state.phase).toBe("finished");
    expect(state.roundOutcomes).toHaveLength(4);
    expect(state.players.find((candidate) => candidate.id === "p3")?.departedInRound).toBe(2);
    expect(state.players.find((candidate) => candidate.id === "p1")?.points).toBe(10);
    expect(state.players.find((candidate) => candidate.id === "p6")?.points).toBe(7);
  });
});
