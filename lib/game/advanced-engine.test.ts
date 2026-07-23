import { describe, expect, it } from "vitest";
import {
  advanceGame,
  evaluateVotes,
  finalizeRound,
  resolveTieByLot,
} from "./engine";
import type { GameState, PlayerState, Vote } from "./types";

function player(id: string, role: PlayerState["role"] = "investigator"): PlayerState {
  return {
    id,
    name: id,
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role,
    points: 0,
    correctGuesses: 0,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    id: "game",
    currentRound: 1,
    phase: "evaluation",
    millionairePlayerId: "p1",
    revision: 1,
    roundOutcomes: [],
    players: [player("p1", "millionaire"), player("p2"), player("p3"), player("p4")],
    ...overrides,
  };
}

const mainVotes: Vote[] = [
  { voterPlayerId: "p1", accusedPlayerId: "p2", stage: "main" },
  { voterPlayerId: "p2", accusedPlayerId: "p1", stage: "main" },
  { voterPlayerId: "p3", accusedPlayerId: "p1", stage: "main" },
  { voterPlayerId: "p4", accusedPlayerId: "p2", stage: "main" },
];

describe("Rollenentscheidung nach Enttarnung", () => {
  it("öffnet die Rollenentscheidungsphase auch ohne aktuellen Millionär", () => {
    const withoutMillionaire = state({
      phase: "result",
      millionairePlayerId: undefined,
      players: [
        { ...player("p1", "none"), winnerPoolStatus: "eliminated" },
        player("p2"),
        player("p3"),
      ],
    });

    expect(advanceGame(withoutMillionaire).phase).toBe("role_transfer");
  });

  it("blockiert den Start der nächsten Runde bis ein Nachfolger feststeht", () => {
    const roleTransfer = state({ phase: "role_transfer", millionairePlayerId: undefined });
    expect(() => advanceGame(roleTransfer)).toThrow("kein aktiver Millionär");
  });
});

describe("Stichwahl und Los", () => {
  it("beschränkt die Stichwahl auf die zuvor Gleichstehenden", () => {
    const runoffVotes: Vote[] = [
      { voterPlayerId: "p1", accusedPlayerId: "p3", stage: "runoff" },
      { voterPlayerId: "p2", accusedPlayerId: "p1", stage: "runoff" },
      { voterPlayerId: "p3", accusedPlayerId: "p1", stage: "runoff" },
      { voterPlayerId: "p4", accusedPlayerId: "p2", stage: "runoff" },
    ];

    expect(() =>
      evaluateVotes(state(), runoffVotes, {
        stage: "runoff",
        accusedPlayerIds: ["p1", "p2"],
      }),
    ).toThrow("nur zwischen den Gleichstehenden");
  });

  it("akzeptiert beim zweiten Gleichstand nur einen tatsächlich Gleichstehenden als Losergebnis", () => {
    const tied = evaluateVotes(state(), mainVotes);
    expect(() => resolveTieByLot(tied, "p3")).toThrow();
    expect(resolveTieByLot(tied, "p2")).toMatchObject({
      requiresRunoff: false,
      eliminatedPlayerId: "p2",
    });
  });
});

describe("Verbindlicher Rundenabschluss", () => {
  it("verhindert eine doppelte Punktevergabe für dieselbe Runde", () => {
    const evaluation = evaluateVotes(state(), mainVotes, {
      advantageUse: {
        advantageId: "r1-double-vote",
        effect: "double_vote",
        actorPlayerId: "p1",
      },
    });
    const once = finalizeRound(state(), mainVotes, evaluation).state;

    expect(() => finalizeRound(once, mainVotes, evaluation)).toThrow(
      "bereits verbindlich abgeschlossen",
    );
  });
});
