import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

describe("Akte Midas stability regressions", () => {
  it("keeps the intro readable, hydration-safe and independent from the dashboard", () => {
    const experience = source("app/demo/AkteMidasExperience.tsx");
    const page = source("app/demo/page.tsx");
    expect(experience).toContain("const INTRO_STEP_MS = 5_200");
    expect(experience).toContain("document.visibilityState");
    expect(experience).toContain("useId");
    expect(experience).toContain("setReady(true)");
    expect(experience).not.toContain('id="midasGold"');
    expect(experience).not.toContain('id="fadeAgents"');
    expect(page).toContain("AkteMidasExperience");
  });

  it("protects the client against stale loads and unhandled mutation rejections", () => {
    const hook = source("lib/meta/useMetaGame.ts");
    expect(hook).toContain("loadSequenceRef");
    expect(hook).toContain("requestId !== loadSequenceRef.current");
    expect(hook).toContain("next.revision >= current.revision");
    expect(hook).not.toContain("setError(message);\n      throw caught;");
  });

  it("hardens effect targets, scoring and the round transition on the server", () => {
    const migration = source("supabase/migrations/20260805011200_meta_game_v2_stability_hardening.sql");
    expect(migration).toContain("eliminated_before_scoring");
    expect(migration).toContain("Bestätige zuerst das Siegerteam");
    expect(migration).toContain("Der ausgewählte Wähler ist in dieser Runde nicht zulässig");
    expect(migration).toContain("Die ausgewählte Zielperson ist in dieser Runde nicht zulässig");
    expect(migration).toContain("if previous_member is not null and not force_redraw");
  });

  it("covers the corrected rules in the production live test", () => {
    const live = source("scripts/verify-akte-midas-live.cjs");
    expect(live).toContain("A duplicate draw changed the millionaire");
    expect(live).toContain("meta_host_open_voting");
    expect(live).toContain("randomUUID()");
    expect(live).toContain("The eliminated participant received round points");
  });
});
