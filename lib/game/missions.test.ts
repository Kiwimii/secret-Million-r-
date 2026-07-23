import { describe, expect, it } from "vitest";
import { MISSIONS, getMissionById } from "./missions";

function unique(values: readonly string[]) {
  return new Set(values).size === values.length;
}

describe("geheimer Missionskatalog", () => {
  it("enthält genau zwanzig eindeutige Missionen", () => {
    expect(MISSIONS).toHaveLength(20);
    expect(unique(MISSIONS.map((mission) => mission.id))).toBe(true);
    expect(unique(MISSIONS.map((mission) => mission.title))).toBe(true);
  });

  it("beschreibt jede Mission für Spieler und Spielleitung vollständig", () => {
    for (const mission of MISSIONS) {
      expect(mission.title.length).toBeGreaterThan(8);
      expect(mission.task.length).toBeGreaterThan(90);
      expect(mission.successCriteria.length).toBeGreaterThan(70);
      expect(mission.timeWindow.length).toBeGreaterThan(15);
      expect(mission.hostInstructions?.length).toBeGreaterThan(70);
      expect(["leicht", "mittel", "riskant"]).toContain(mission.difficulty);
      expect(mission.suitablePhases?.length).toBeGreaterThan(20);
      expect(getMissionById(mission.id)).toEqual(mission);
    }
  });

  it("vermeidet Missionen mit erzwungenem Alkohol oder gefährlichen Eingriffen", () => {
    const combined = MISSIONS.map(
      (mission) => `${mission.task} ${mission.hostInstructions}`,
    ).join(" ").toLocaleLowerCase("de-DE");

    expect(combined).not.toContain("muss alkohol");
    expect(combined).not.toContain("ohne einverständnis");
    expect(combined).not.toContain("manipuliere die anlage");
  });
});
