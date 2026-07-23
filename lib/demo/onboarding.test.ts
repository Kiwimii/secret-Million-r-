import { describe, expect, it } from "vitest";
import {
  HOST_TUTORIAL,
  INTRO_SLIDES,
  PLAYER_TUTORIAL,
  getActionTransitionCue,
  getPhaseTransitionCue,
} from "./onboarding";
import { createInitialDemoSnapshot, isDemoSnapshot } from "./model";

const phases = [
  "lobby",
  "role_reveal",
  "mission",
  "challenge",
  "question",
  "discussion",
  "mission_review",
  "advantage",
  "voting",
  "evaluation",
  "result",
  "role_transfer",
  "finished",
] as const;

describe("Onboarding Experience", () => {
  it("startet ohne vorgefertigte Profile", () => {
    const snapshot = createInitialDemoSnapshot();
    expect(snapshot.game.players).toEqual([]);
    expect(snapshot.schemaVersion).toBe(2);
    expect(isDemoSnapshot(snapshot)).toBe(true);
  });

  it("enthält ein vollständiges Intro und getrennte Tutorials", () => {
    expect(INTRO_SLIDES).toHaveLength(4);
    expect(PLAYER_TUTORIAL).toHaveLength(4);
    expect(HOST_TUTORIAL).toHaveLength(4);
    for (const slide of [
      ...INTRO_SLIDES,
      ...PLAYER_TUTORIAL,
      ...HOST_TUTORIAL,
    ]) {
      expect(slide.title.length).toBeGreaterThan(8);
      expect(slide.body.length).toBeGreaterThan(40);
      expect(slide.signal.length).toBeGreaterThan(6);
    }
  });

  it("liefert für jede Spielphase eine aussagekräftige Sequenz", () => {
    for (const phase of phases) {
      const cue = getPhaseTransitionCue(phase, 1);
      expect(cue.title.length).toBeGreaterThan(3);
      expect(cue.body.length).toBeGreaterThan(35);
      expect(cue.signal).toContain("AKTIV");
    }
  });

  it("deckt die entscheidenden Spieler- und Spielleiteraktionen ab", () => {
    for (const action of [
      "register",
      "playerUnlock",
      "hostUnlock",
      "revealRole",
      "vote",
      "roleDecision",
      "draw",
      "teams",
      "evaluation",
      "result",
    ]) {
      const cue = getActionTransitionCue(action);
      expect(cue.title.length).toBeGreaterThan(8);
      expect(cue.body.length).toBeGreaterThan(35);
    }
  });
});
