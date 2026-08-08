import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHALLENGE_CATALOG, MISSION_CATALOG } from "./catalogs";

function source(path: string) {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

const THREE_PLAYER_MISSIONS = ["M21", "M22", "M23", "M24"];
const THREE_PLAYER_CHALLENGES = ["C21", "C22", "C23", "C24"];

describe("three-player Akte Midas content", () => {
  it("offers four missions explicitly playable from three participants", () => {
    const entries = MISSION_CATALOG.filter((entry) => THREE_PLAYER_MISSIONS.includes(entry.catalogId));
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.minPlayers === 3)).toBe(true);
    expect(new Set(entries.map((entry) => entry.title)).size).toBe(4);
  });

  it("offers four team-size-neutral challenges explicitly playable from three participants", () => {
    const entries = CHALLENGE_CATALOG.filter((entry) => THREE_PLAYER_CHALLENGES.includes(entry.catalogId));
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.minPlayers === 3)).toBe(true);
    expect(entries.every((entry) => entry.winCondition.length > 20)).toBe(true);
  });

  it("keeps the server whitelist and minimum counts aligned with the frontend", () => {
    const migration = source("supabase/migrations/20260808090100_meta_game_v2_three_player_catalogs.sql");
    for (const id of [...THREE_PLAYER_MISSIONS, ...THREE_PLAYER_CHALLENGES]) {
      expect(migration).toContain(`'${id}'`);
    }
    expect(migration).toContain("when 'M21' then 3");
    expect(migration).toContain("when 'C21' then 3");
  });

  it("lets the host dashboard proceed with three present participants", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("availableCount < 3");
    expect(app).toContain("Mindestens drei anwesende Teilnehmer");
  });
});