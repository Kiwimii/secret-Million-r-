import { describe, expect, it } from "vitest";
import { getNextGameStep } from "./flow";
import { getHostGuide, type HostGuideContext } from "./host-guide";
import type { GameState, PlayerState } from "./types";

function player(id: string): PlayerState {
  return {
    id,
    name: id,
    registrationStatus: "registered",
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role: id === "p1" ? "millionaire" : "investigator",
    points: 0,
    correctGuesses: 0,
  };
}

function state(
  round: 1 | 2 | 3 | 4,
  phase: GameState["phase"],
): GameState {
  return {
    id: "game",
    currentRound: round,
    phase,
    millionairePlayerId: "p1",
    revision: 1,
    roundOutcomes: [],
    players: [player("p1"), player("p2")],
  };
}

function guideContext(
  overrides: Partial<HostGuideContext>,
): HostGuideContext {
  return {
    round: 1,
    phase: "lobby",
    hasMillionaire: true,
    registeredPlayers: 7,
    invitedPlayers: 0,
    missionStatus: "assigned",
    voteStage: "main",
    submittedVotes: 0,
    requiredVotes: 7,
    roleDecisionsSubmitted: 0,
    roleDecisionsRequired: 7,
    roleTransferResolved: false,
    hasQuestioner: false,
    hasQuestion: false,
    hasChallenge: true,
    teamAssignments: 7,
    hasChallengeWinner: false,
    ...overrides,
  };
}

describe("rundenabhängiger Missionsschluss", () => {
  it("bewertet Runde 1 nach der Frage und vor der Diskussion", () => {
    expect(getNextGameStep(state(1, "question"))).toEqual({
      round: 1,
      phase: "mission_review",
    });
    expect(getNextGameStep(state(1, "mission_review"))).toEqual({
      round: 1,
      phase: "discussion",
    });
  });

  it("bewertet Runde 2 direkt nach der Challenge", () => {
    expect(getNextGameStep(state(2, "challenge"))).toEqual({
      round: 2,
      phase: "mission_review",
    });
    expect(getNextGameStep(state(2, "mission_review"))).toEqual({
      round: 2,
      phase: "question",
    });
  });

  it("bewertet Runde 4 direkt nach der Tausch-Challenge", () => {
    expect(getNextGameStep(state(4, "challenge"))).toEqual({
      round: 4,
      phase: "mission_review",
    });
  });
});

describe("Spielleiteranweisungen", () => {
  it("erklärt bei Korkenabgabe die zufällige Nachfolge", () => {
    const guide = getHostGuide(
      guideContext({
        round: 2,
        phase: "role_transfer",
        missionStatus: "completed",
        submittedVotes: 5,
        requiredVotes: 5,
        roleDecisionsSubmitted: 5,
        roleDecisionsRequired: 5,
        hasQuestioner: true,
        hasQuestion: true,
        hasChallengeWinner: true,
      }),
    );

    expect(guide.checklist.join(" ")).toContain("zufällig");
    expect(guide.checklist.join(" ")).toContain("bisherigen Millionär");
    expect(guide.clickEffect).toContain("Zufallsauslosung");
  });

  it("blockiert den Missionsschritt solange die Mission nicht ausgegeben ist", () => {
    const guide = getHostGuide(
      guideContext({
        round: 1,
        phase: "mission",
        missionStatus: "unassigned",
      }),
    );

    expect(guide.blockedReason).toContain("Mission");
    expect(guide.clickEffect).toContain("Challenge");
  });
});
