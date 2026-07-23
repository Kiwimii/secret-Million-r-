import { describe, expect, it } from "vitest";
import { advanceToPhase, canAdvanceToPhase, changePlayerStatus } from "./engine";
import type { GameState } from "./types";

const baseState: GameState = {
  id: "game-1",
  currentRound: 1,
  phase: "lobby",
  millionairePlayerId: "player-1",
  revision: 1,
  players: [
    {
      id: "player-1",
      name: "Schubi",
      participationStatus: "active",
      role: "millionaire",
      eligibleToWin: true,
      canVote: true,
      canJoinChallenges: true,
      points: 0,
      correctGuesses: 0,
    },
    {
      id: "player-2",
      name: "Lars",
      participationStatus: "active",
      role: "investigator",
      eligibleToWin: true,
      canVote: true,
      canJoinChallenges: true,
      points: 0,
      correctGuesses: 0,
    },
  ],
};

describe("changePlayerStatus", () => {
  it("entfernt einen abgereisten Spieler vollständig aus künftigen Aktionen", () => {
    const result = changePlayerStatus(baseState, {
      playerId: "player-2",
      status: "departed",
      reason: "early_departure",
    });

    const player = result.state.players[1];
    expect(player.eligibleToWin).toBe(false);
    expect(player.canVote).toBe(false);
    expect(player.canJoinChallenges).toBe(false);
    expect(player.eliminatedInRound).toBe(1);
  });

  it("blockiert den Spielfortschritt, wenn der aktuelle Millionär abreist", () => {
    const result = changePlayerStatus(baseState, {
      playerId: "player-1",
      status: "departed",
      reason: "early_departure",
    });

    expect(result.requiresMillionaireReplacement).toBe(true);
    expect(result.state.millionairePlayerId).toBeUndefined();
    expect(canAdvanceToPhase(result.state, "role_reveal").allowed).toBe(false);
  });
});

describe("advanceToPhase", () => {
  it("erlaubt nur den jeweils nächsten Spielschritt", () => {
    expect(() => advanceToPhase(baseState, "role_reveal")).not.toThrow();
    expect(() => advanceToPhase(baseState, "challenge")).toThrow();
  });
});
