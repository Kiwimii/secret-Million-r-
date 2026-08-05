import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BONUS_CATALOG,
  CHALLENGE_CATALOG,
  MALUS_CATALOG,
  MISSION_CATALOG,
} from "./catalogs";

describe("Akte Midas catalogs", () => {
  it("contains exactly twenty fixed missions and twenty fixed challenges", () => {
    expect(MISSION_CATALOG).toHaveLength(20);
    expect(CHALLENGE_CATALOG).toHaveLength(20);
  });

  it("uses unique catalog ids and complete canonical definitions", () => {
    const missionIds = MISSION_CATALOG.map((entry) => entry.catalogId);
    const challengeIds = CHALLENGE_CATALOG.map((entry) => entry.catalogId);
    expect(new Set(missionIds).size).toBe(20);
    expect(new Set(challengeIds).size).toBe(20);
    for (const mission of MISSION_CATALOG) {
      expect(mission.task.length).toBeGreaterThan(30);
      expect(mission.successCriteria.length).toBeGreaterThan(20);
      expect(mission.restriction.length).toBeGreaterThan(15);
    }
    for (const challenge of CHALLENGE_CATALOG) {
      expect(challenge.winCondition.length).toBeGreaterThan(20);
      expect(challenge.safety?.length ?? 0).toBeGreaterThan(10);
      expect(challenge.drinkRule.length).toBeGreaterThan(15);
    }
  });

  it("keeps bonus and malus in separate fixed catalogs", () => {
    expect(BONUS_CATALOG.every((entry) => entry.catalogId.startsWith("B"))).toBe(true);
    expect(MALUS_CATALOG.every((entry) => entry.catalogId.startsWith("X"))).toBe(true);
    expect(new Set([...BONUS_CATALOG, ...MALUS_CATALOG].map((entry) => entry.catalogId)).size)
      .toBe(BONUS_CATALOG.length + MALUS_CATALOG.length);
  });

  it("does not expose free-text round package editors in the active UI", () => {
    const source = readFileSync(join(process.cwd(), "app", "demo", "AkteMidasApp.tsx"), "utf8");
    expect(source).toContain("MISSION_CATALOG.map");
    expect(source).toContain("CHALLENGE_CATALOG.map");
    expect(source).not.toContain("EffectEditor");
    expect(source).not.toContain("Aufgabe<textarea");
    expect(source).not.toContain("Briefing<textarea");
  });
});
