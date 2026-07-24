import { describe, expect, it } from "vitest";
import { ADVANTAGES } from "./catalog";
import { CHALLENGES } from "./challenges";

function unique(values: readonly string[]) {
  return new Set(values).size === values.length;
}

describe("Spielkataloge", () => {
  it("enthält genau 16 Challenges mit vollständigen Beschreibungen", () => {
    expect(CHALLENGES).toHaveLength(16);
    expect(CHALLENGES.filter((entry) => entry.original)).toHaveLength(4);
    expect(unique(CHALLENGES.map((entry) => entry.id))).toBe(true);
    for (const challenge of CHALLENGES) {
      expect(challenge.title.length).toBeGreaterThan(3);
      expect(challenge.playerBriefing.length).toBeGreaterThan(40);
      expect(challenge.hostInstructions.length).toBeGreaterThan(40);
      expect(challenge.winCondition.length).toBeGreaterThan(20);
      expect(challenge.safetyNote.length).toBeGreaterThan(20);
      expect(challenge.material.length).toBeGreaterThan(0);
    }
  });

  it("beschränkt die Millionärsvorteile bewusst auf drei klare Abstimmungsmechaniken", () => {
    expect(ADVANTAGES).toHaveLength(3);
    expect(ADVANTAGES.map((entry) => entry.effect)).toEqual([
      "double_vote",
      "triple_vote",
      "redirect_vote",
    ]);
    expect(unique(ADVANTAGES.map((entry) => entry.id))).toBe(true);
    for (const advantage of ADVANTAGES) {
      expect(advantage.playerInstructions.length).toBeGreaterThan(40);
      expect(advantage.hostInstructions.length).toBeGreaterThan(40);
      expect(advantage.limit.length).toBeGreaterThan(15);
    }
  });
});
