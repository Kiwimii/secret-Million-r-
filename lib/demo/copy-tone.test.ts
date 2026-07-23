import { describe, expect, it } from "vitest";
import {
  HOST_TUTORIAL,
  INTRO_SLIDES,
  PLAYER_TUTORIAL,
  getActionTransitionCue,
  getPhaseTransitionCue,
} from "./onboarding";

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

describe("Textton der Spieloberfläche", () => {
  it("bleibt informativ und enthält zugleich erkennbare Persönlichkeit", () => {
    const copy = [
      ...INTRO_SLIDES,
      ...PLAYER_TUTORIAL,
      ...HOST_TUTORIAL,
    ]
      .map((entry) => `${entry.title} ${entry.body}`)
      .join(" ");

    expect(copy).toContain("Verdacht");
    expect(copy).toContain("Zufall");
    expect(copy).toContain("PIN");
    expect(copy).toContain("Vetternwirtschaft");
  });

  it("erklärt weiterhin jede Phase trotz pointierter Formulierungen", () => {
    for (const phase of phases) {
      const cue = getPhaseTransitionCue(phase, 1);
      expect(cue.body.length).toBeGreaterThan(55);
      expect(cue.signal).toContain("AKTIV");
      expect(cue.visual.length).toBeGreaterThan(4);
    }
  });

  it("hält zentrale Aktionen eindeutig erkennbar", () => {
    const actions = [
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
    ];

    for (const action of actions) {
      const cue = getActionTransitionCue(action);
      expect(cue.title.length).toBeGreaterThan(10);
      expect(cue.body.length).toBeGreaterThan(55);
      expect(cue.visual.length).toBeGreaterThan(4);
    }
  });
});
