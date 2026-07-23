import { describe, expect, it } from "vitest";
import {
  advanceGame,
  applyPlayerLifecycleChange,
  canAdvanceGame,
  evaluateVotes,
  finalizeRound,
  getNextGameStep,
  getPlayerCapabilities,
  resolveFinalWinner,
  setMillionaire,
} from "./engine";
import type { GameState, PlayerState, Vote } from "./types";

function player(id: string, name: string): PlayerState {
  return {
    id,
    name,
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role: "investigator",
    points: 0,
    correctGuesses: 0,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const initial: GameState = {
    id: "game-1",
    currentRound: 1,
    phase: "lobby",
    millionairePlayerId: "p1",
    revision: 1,
    roundOutcomes: [],
    players: [
      { ...player("p1", "Schubi"), role: "millionaire" },
      player("p2", "Lars"),
      player("p3", "Danny"),
      player("p4", "Masl"),
    ],
  };
  return { ...initial, ...overrides };
}

const votes: Vote[] = [
  { voterPlayerId: "p1", accusedPlayerId: "p2", stage: "main" },
  { voterPlayerId: "p2", accusedPlayerId: "p1", stage: "main" },
  { voterPlayerId: "p3", accusedPlayerId: "p1", stage: "main" },
  { voterPlayerId: "p4", accusedPlayerId: "p2", stage: "main" },
];

describe("Spielerlebenszyklus", () => {
  it("lässt regulär ausgeschiedene Spieler weiter abstimmen und Challenges spielen", () => {
    const result = applyPlayerLifecycleChange(makeState(), {
      playerId: "p2",
      action: "eliminate",
      reason: "vote",
    });
    const capabilities = getPlayerCapabilities(result.state.players[1]);

    expect(capabilities.eligibleToWin).toBe(false);
    expect(capabilities.canVote).toBe(true);
    expect(capabilities.canJoinChallenges).toBe(true);
  });

  it("entfernt einen abgereisten Spieler aus Pool, Abstimmung und Challenges", () => {
    const result = applyPlayerLifecycleChange(makeState(), {
      playerId: "p3",
      action: "depart",
      reason: "early_departure",
    });
    const departed = result.state.players[2];
    const capabilities = getPlayerCapabilities(departed);

    expect(departed.attendanceStatus).toBe("departed");
    expect(departed.winnerPoolStatus).toBe("eliminated");
    expect(capabilities.eligibleToWin).toBe(false);
    expect(capabilities.canVote).toBe(false);
    expect(capabilities.canJoinChallenges).toBe(false);
  });

  it("behält den Pool-Ausschluss, wenn ein bereits ausgeschiedener Spieler abreist", () => {
    const eliminated = applyPlayerLifecycleChange(makeState(), {
      playerId: "p3",
      action: "eliminate",
      reason: "vote",
    }).state;
    const departed = applyPlayerLifecycleChange(eliminated, {
      playerId: "p3",
      action: "depart",
      reason: "early_departure",
    }).state.players[2];

    expect(departed.winnerPoolStatus).toBe("eliminated");
    expect(departed.eliminatedInRound).toBe(1);
    expect(departed.departedInRound).toBe(1);
  });

  it("leert die Millionärsrolle bei endgültiger Abreise und blockiert den Ablauf", () => {
    const result = applyPlayerLifecycleChange(makeState(), {
      playerId: "p1",
      action: "depart",
      reason: "early_departure",
    });

    expect(result.requiresMillionaireReplacement).toBe(true);
    expect(result.blocksProgress).toBe(true);
    expect(result.state.millionairePlayerId).toBeUndefined();
    expect(canAdvanceGame(result.state).allowed).toBe(false);
  });

  it("pausiert einen Millionär ohne die Rolle vorschnell zu löschen", () => {
    const result = applyPlayerLifecycleChange(makeState(), {
      playerId: "p1",
      action: "pause",
    });

    expect(result.requiresMillionaireReplacement).toBe(false);
    expect(result.blocksProgress).toBe(true);
    expect(result.state.millionairePlayerId).toBe("p1");
  });
});

describe("Rundensteuerung", () => {
  it("führt nach der Rollenentscheidung sauber in die nächste Runde", () => {
    const state = makeState({ currentRound: 1, phase: "role_transfer" });
    expect(getNextGameStep(state)).toEqual({ round: 2, phase: "role_reveal" });
    expect(advanceGame(state)).toMatchObject({ currentRound: 2, phase: "role_reveal" });
  });

  it("beendet das Spiel nach dem Ergebnis der vierten Runde", () => {
    const state = makeState({ currentRound: 4, phase: "result" });
    expect(advanceGame(state).phase).toBe("finished");
  });

  it("weist eine nicht mehr zulässige Millionärsauswahl zurück", () => {
    const departed = applyPlayerLifecycleChange(makeState(), {
      playerId: "p2",
      action: "depart",
    }).state;
    expect(() => setMillionaire(departed, "p2")).toThrow();
  });
});

describe("Abstimmungsauswertung", () => {
  it("wendet die doppelte Stimme als transparente Anpassung an", () => {
    const result = evaluateVotes(makeState(), votes, {
      advantageUse: {
        advantageId: "r1-double-vote",
        effect: "double_vote",
        actorPlayerId: "p1",
      },
    });
    const p2 = result.tally.find((entry) => entry.playerId === "p2");

    expect(p2).toMatchObject({ regularVotes: 2, adjustment: 1, effectiveVotes: 3 });
    expect(result.eliminatedPlayerId).toBe("p2");
  });

  it("fordert bei echtem Gleichstand eine Stichwahl", () => {
    const result = evaluateVotes(makeState(), votes);
    expect(result.topPlayerIds).toEqual(["p1", "p2"]);
    expect(result.requiresRunoff).toBe(true);
  });

  it("löst den Reservevorteil im Gleichstand nur für einen gültigen Gegner aus", () => {
    const result = evaluateVotes(makeState(), votes, {
      advantageUse: {
        advantageId: "reserve-tie-priority",
        effect: "tie_priority",
        actorPlayerId: "p1",
        tieOpponentPlayerId: "p2",
      },
    });

    expect(result.requiresRunoff).toBe(false);
    expect(result.eliminatedPlayerId).toBe("p2");
  });

  it("ignoriert mit der blinden Stimme nur den Zettel eines ausgeschiedenen Spielers", () => {
    const state = applyPlayerLifecycleChange(makeState(), {
      playerId: "p4",
      action: "eliminate",
      reason: "vote",
    }).state;
    const result = evaluateVotes(state, votes, {
      advantageUse: {
        advantageId: "reserve-blind-vote",
        effect: "ignore_eliminated_vote",
        actorPlayerId: "p1",
        voterPlayerId: "p4",
      },
    });

    expect(result.ignoredVoterPlayerIds).toEqual(["p4"]);
    expect(result.tally.find((entry) => entry.playerId === "p2")?.effectiveVotes).toBe(1);
  });
});

describe("Punkte und Finale", () => {
  it("gibt dem überlebenden Millionär Punkte und schließt den Ausgeschiedenen aus", () => {
    const state = makeState({ phase: "evaluation" });
    const evaluation = evaluateVotes(state, votes, {
      advantageUse: {
        advantageId: "r1-double-vote",
        effect: "double_vote",
        actorPlayerId: "p1",
      },
    });
    const result = finalizeRound(state, votes, evaluation);

    expect(result.state.players.find((entry) => entry.id === "p1")?.points).toBe(1);
    expect(result.state.players.find((entry) => entry.id === "p2")?.points).toBe(0);
    expect(result.state.players.find((entry) => entry.id === "p2")?.winnerPoolStatus).toBe("eliminated");
    expect(result.state.phase).toBe("result");
  });

  it("ermittelt bei enttarntem Final-Millionär nach Punkten und richtigen Tipps", () => {
    const state = makeState({
      currentRound: 4,
      players: [
        { ...player("p1", "Schubi"), winnerPoolStatus: "eliminated", role: "none" },
        { ...player("p2", "Lars"), points: 6, correctGuesses: 2, lastCorrectGuessRound: 3 },
        { ...player("p3", "Danny"), points: 6, correctGuesses: 1, lastCorrectGuessRound: 4 },
      ],
    });
    const resolution = resolveFinalWinner(state, {
      round: 4,
      millionairePlayerId: "p1",
      eliminatedPlayerId: "p1",
      millionaireSurvived: false,
      pointRecipientPlayerIds: [],
      correctGuessPlayerIds: [],
      tally: [],
    });

    expect(resolution.winnerPlayerId).toBe("p2");
    expect(resolution.reason).toBe("correct_guesses");
  });
});
