import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

describe("Akte Midas stability regressions", () => {
  it("keeps the intro readable and avoids duplicate SVG ids", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("const INTRO_STEP_MS = 5200");
    expect(app).toContain("useId");
    expect(app).not.toContain('id="midasGold"');
    expect(app).not.toContain('id="fadeAgents"');
    expect(app).not.toContain("setInterval(() => setStep((current) => Math.min(current + 1, 4)), 2100)");
  });

  it("resets round-specific effect selections and validates required fields", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("round.number, round.effectSelection?.voterId, round.effectSelection?.targetId");
    expect(app).toContain("const selectionComplete");
    expect(app).toContain("activeFromRound <= view.currentRound");
  });

  it("protects the client against stale loads and unhandled mutation rejections", () => {
    const hook = source("lib/meta/useMetaGame.ts");
    expect(hook).toContain("loadSequenceRef");
    expect(hook).toContain("requestId !== loadSequenceRef.current");
    expect(hook).not.toContain("setError(message);\n      throw caught;");
  });

  it("hardens scoring and the round transition on the server", () => {
    const migration = source("supabase/migrations/20260805011200_meta_game_v2_stability_hardening.sql");
    expect(migration).toContain("eliminated_before_scoring");
    expect(migration).toContain("Bestätige zuerst das Siegerteam");
    expect(migration).toContain("Der ausgewählte Wähler ist in dieser Runde nicht zulässig");
    expect(migration).toContain("if previous_member is not null and not force_redraw");
  });
});
