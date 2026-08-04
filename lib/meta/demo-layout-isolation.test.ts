import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const layoutPath = join(process.cwd(), "app", "demo", "layout.tsx");
const layoutSource = readFileSync(layoutPath, "utf8");

const legacyComponents = [
  "PlayerResumeGateway",
  "HostResumeGateway",
  "GameIntegrityOverlay",
  "SimplifiedQuestionFlow",
  "HostSelectedAdvantageFlow",
  "RoundTransitionFinaleOverlay",
  "ResultPopupCloseController",
  "HostSecretRoundControls",
  "PlayerRoleRecall",
  "HostPlayerRecoveryPanel",
];

const legacyUiText = [
  "André Gesamtübersicht",
  "Lars ist ausgeschieden",
  "Spieler manuell weiterführen",
];

describe("demo route isolation", () => {
  it("does not mount legacy overlays or gateways around the V2 dashboard", () => {
    for (const component of legacyComponents) {
      expect(layoutSource).not.toContain(component);
    }
  });

  it("does not load the old global demo stylesheets", () => {
    expect(layoutSource).not.toMatch(/import\s+["']\.\/.+\.css["'];?/);
  });

  it("cannot reintroduce the reported stale-party controls through the route layout", () => {
    for (const label of legacyUiText) {
      expect(layoutSource).not.toContain(label);
    }
    expect(layoutSource).toContain('data-meta-game-version="persistent-dashboard-v2"');
  });
});
