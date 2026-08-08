import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

describe("round report privacy and host audit trail", () => {
  it("never names or confirms the millionaire in the public round reveal", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("Die Identität des Millionärs bleibt versiegelt.");
    expect(app).not.toContain("Der Millionär überlebt die Runde.");
    expect(app).not.toContain("bleibt als Millionär im Spiel.");
    expect(app).not.toContain("war der Millionär.");
  });

  it("asks the millionaire privately and starts the next round from that decision", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    const migration = source("supabase/migrations/20260808131500_meta_game_v2_private_reports_audit_role_choice.sql");
    expect(app).toContain("PRIVATE ROLLENENTSCHEIDUNG");
    expect(app).toContain("Millionär bleiben");
    expect(app).toContain("Zufällig neu auslosen");
    expect(app).toContain("Warte auf Rollenentscheidung");
    expect(migration).toContain("role_decision_and_round_started");
    expect(migration).toContain("privaten Rollenentscheidung des Millionärs");
  });

  it("removes millionaire identity and survival state from player reports", () => {
    const migration = source("supabase/migrations/20260808131500_meta_game_v2_private_reports_audit_role_choice.sql");
    expect(migration).toContain("result_json - 'millionaireId' - 'millionaireSurvived'");
    expect(migration).toContain("entry - 'millionaireId'");
  });

  it("attributes player actions and note details in the host event log", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    const migration = source("supabase/migrations/20260808131500_meta_game_v2_private_reports_audit_role_choice.sql");
    expect(app).toContain("AKTEUR · ${actor}");
    expect(migration).toContain("actorMemberId");
    expect(migration).toContain("note_saved_host");
    expect(migration).toContain("subjectMemberId");
    expect(migration).toContain("hat seine Stimme verbindlich abgegeben");
  });

  it("covers the real production path", () => {
    const live = source("scripts/verify-akte-midas-live.cjs");
    expect(live).toContain("Published player report leaked the millionaire id");
    expect(live).toContain("Host audit log does not identify the player who submitted a vote");
    expect(live).toContain("Host audit log does not show note author, subject and note text");
    expect(live).toContain("Private role decision did not start round two automatically");
  });
});
