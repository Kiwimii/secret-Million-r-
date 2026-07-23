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
      expect(slide.visual.length).toBeGreaterThan(4);
    }
  });

  it("liefert für jede Spielphase eine eigene aussagekräftige Sequenz", () => {
    const visuals = new Set<string>();
    for (const phase of phases) {
      const cue = getPhaseTransitionCue(phase, 1);
      expect(cue.title.length).toBeGreaterThan(3);
      expect(cue.body.length).toBeGreaterThan(35);
      expect(cue.signal).toContain("AKTIV");
      visuals.add(cue.visual);
    }
    expect(visuals.size).toBe(phases.length);
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
      expect(cue.visual.length).toBeGreaterThan(4);
    }
  });

  it("nutzt Oli und Gundula nur als untergeordnete Easter Eggs", () => {
    const allCopy = [
      ...INTRO_SLIDES,
      ...PLAYER_TUTORIAL,
      ...HOST_TUTORIAL,
      ...phases.map((phase) => getPhaseTransitionCue(phase, 1)),
      ...[
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
      ].map(getActionTransitionCue),
    ]
      .map((entry) => `${entry.title} ${entry.body}`)
      .join(" ");

    const mentions = (allCopy.match(/Oli|Gundula/g) ?? []).length;
    expect(mentions).toBeGreaterThanOrEqual(2);
    expect(mentions).toBeLessThanOrEqual(6);
  });
});
