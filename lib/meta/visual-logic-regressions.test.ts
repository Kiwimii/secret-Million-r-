import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

describe("Akte Midas visual and logic audit", () => {
  it("keeps SVG ids unique and prevents briefing hydration flashes", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("useId");
    expect(app).not.toContain('id="midasGold"');
    expect(app).not.toContain('id="fadeAgents"');
    expect(app).toContain("briefingReady && !briefingSeen");
  });

  it("guides the host and blocks incompatible catalog choices", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("const nextStep");
    expect(app).toContain("const availableParticipants");
    expect(app).toContain("entry.minPlayers > availableCount");
    expect(app).toContain("!packageCompatible");
    expect(app).toContain("!round.winningTeam");
  });

  it("keeps round-specific selections and votes logically valid", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("round.number, round.effectSelection?.voterId, round.effectSelection?.targetId");
    expect(app).toContain("member.activeFromRound <= view.currentRound");
    expect(app).toContain("const validVoteTarget");
    expect(app).toContain("const validVoter");
    expect(app).toContain("disabled={!selectionComplete}");
  });

  it("renders the reveal truthfully and in a useful order", () => {
    const app = source("app/demo/AkteMidasApp.tsx");
    expect(app).toContain("const sortedTally");
    expect(app).toContain("Math.max(0,entry.effectiveVotes)");
    expect(app).toContain("entry.adjustment !== 0");
    expect(app).not.toContain("Math.max(1,entry.effectiveVotes)");
  });

  it("contains mobile and touch usability safeguards", () => {
    const css = source("app/demo/akte-midas.module.css");
    expect(css).toContain("/* visual-logic-audit */");
    expect(css).toContain(".notificationDrawer{position:fixed;left:8px;right:8px");
    expect(css).toContain("@media(pointer:coarse)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".nextStep{grid-column:1/-1");
  });

  it("enforces player counts and irreversible elimination on the server", () => {
    const migration = source("supabase/migrations/20260805011300_meta_game_v2_visual_logic_hardening.sql");
    expect(migration).toContain("Dieses Rundenpaket benötigt mindestens");
    expect(migration).toContain("when 'C08' then 6");
    expect(migration).toContain("können nicht wieder in die Wertung aufgenommen werden");
    expect(migration).toContain("v.target_member_id = target_member_id");
    expect(migration).toContain("'challengePublished', false");
    const finalMigration = source("supabase/migrations/20260805011400_meta_game_v2_final_logic_hardening.sql");
    expect(finalMigration).toContain("m.competition_status <> 'disqualified'");
    expect(finalMigration).toContain("meta_host_advance_round_final_base");
    expect(finalMigration).toContain("direct_winner_available");
  });
});