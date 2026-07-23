import { describe, expect, it } from "vitest";
import { drawRandomMillionaire, getRandomMillionaireCandidates } from "./random";
import type { GameState, PlayerState } from "./types";

function player(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: id,
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role: "investigator",
    points: 0,
    correctGuesses: 0,
    ...overrides,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    id: "game",
    currentRound: 1,
    phase: "lobby",
    revision: 1,
    roundOutcomes: [],
    players: [player("p1"), player("p2"), player("p3")],
    ...overrides,
  };
}

describe("zufällige Millionärsauswahl", () => {
  it("zieht den Startmillionär aus allen anwesenden und gewinnberechtigten Spielern", () => {
    const result = drawRandomMillionaire(state(), { randomIndex: () => 1 });

    expect(result.candidatePlayerIds).toEqual(["p1", "p2", "p3"]);
    expect(result.selectedPlayerId).toBe("p2");
    expect(result.state.millionairePlayerId).toBe("p2");
    expect(result.state.players.find((entry) => entry.id === "p2")?.role).toBe("millionaire");
  });

  it("schließt bei Korkenabgabe den bisherigen Millionär aus", () => {
    const current = state({
      phase: "role_transfer",
      millionairePlayerId: "p2",
      players: [player("p1"), player("p2", { role: "millionaire" }), player("p3")],
    });
    const result = drawRandomMillionaire(current, {
      excludePlayerId: "p2",
      randomIndex: () => 1,
    });

    expect(result.candidatePlayerIds).toEqual(["p1", "p3"]);
    expect(result.selectedPlayerId).toBe("p3");
  });

  it("zieht niemals abgereiste, ausgeschiedene oder disqualifizierte Spieler", () => {
    const current = state({
      players: [
        player("p1", { attendanceStatus: "departed" }),
        player("p2", { winnerPoolStatus: "eliminated" }),
        player("p3", { winnerPoolStatus: "disqualified" }),
        player("p4"),
      ],
    });

    expect(getRandomMillionaireCandidates(current).map((entry) => entry.id)).toEqual(["p4"]);
    expect(drawRandomMillionaire(current, { randomIndex: () => 0 }).selectedPlayerId).toBe("p4");
  });

  it("bricht ab, wenn kein gültiger Kandidat vorhanden ist", () => {
    const current = state({
      players: [player("p1", { winnerPoolStatus: "eliminated" })],
    });

    expect(() => drawRandomMillionaire(current, { randomIndex: () => 0 })).toThrow(
      "keinen zulässigen Kandidaten",
    );
  });

  it("weist manipulative oder fehlerhafte Zufallsindizes zurück", () => {
    expect(() => drawRandomMillionaire(state(), { randomIndex: () => 99 })).toThrow(
      "ungültigen Kandidatenindex",
    );
  });
});
