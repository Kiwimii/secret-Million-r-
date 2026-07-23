import { describe, expect, it } from "vitest";
import { drawBalancedTeams } from "./teams";
import type { GameState, PlayerState } from "./types";

function player(
  id: string,
  attendanceStatus: PlayerState["attendanceStatus"] = "present",
  winnerPoolStatus: PlayerState["winnerPoolStatus"] = "eligible",
): PlayerState {
  return {
    id,
    name: id,
    registrationStatus: attendanceStatus === "present" ? "registered" : "invited",
    attendanceStatus,
    winnerPoolStatus,
    role: "none",
    points: 0,
    correctGuesses: 0,
  };
}

function game(players: PlayerState[]): GameState {
  return {
    id: "game",
    currentRound: 1,
    phase: "lobby",
    revision: 1,
    roundOutcomes: [],
    players,
  };
}

describe("zufällige Challenge-Teams", () => {
  it("teilt alle teilnehmenden Spieler genau einmal und möglichst gleich groß zu", () => {
    const state = game([
      player("p1"),
      player("p2"),
      player("p3"),
      player("p4"),
      player("p5"),
      player("p6"),
      player("p7"),
    ]);
    const indices = [2, 0, 3, 1, 1, 0];
    let position = 0;
    const assignments = drawBalancedTeams(
      state,
      (upperExclusive) => indices[position++] % upperExclusive,
    );

    expect(assignments).toHaveLength(7);
    expect(new Set(assignments.map((entry) => entry.playerId)).size).toBe(7);
    const azur = assignments.filter((entry) => entry.team === "azur").length;
    const gold = assignments.filter((entry) => entry.team === "gold").length;
    expect(Math.abs(azur - gold)).toBeLessThanOrEqual(1);
  });

  it("nimmt abwesende und disqualifizierte Spieler nicht in die Ziehung", () => {
    const assignments = drawBalancedTeams(
      game([
        player("active-1"),
        player("active-2"),
        player("invited", "temporarily_absent"),
        player("departed", "departed"),
        player("disqualified", "present", "disqualified"),
      ]),
      () => 0,
    );

    expect(assignments.map((entry) => entry.playerId).sort()).toEqual([
      "active-1",
      "active-2",
    ]);
  });

  it("weist eine Ziehung mit weniger als zwei Teilnehmern zurück", () => {
    expect(() => drawBalancedTeams(game([player("only")])))
      .toThrow("mindestens zwei");
  });
});
