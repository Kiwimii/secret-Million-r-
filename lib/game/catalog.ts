import type { AdvantageDefinition } from "./types";
import {
  ADVANTAGES as BASE_ADVANTAGES,
  getAdvantageById,
} from "./advantages";
import { MISSIONS, getMissionById } from "./missions";

// Die bekannten festen Rundenkarten behalten ihre Herkunftsrunde, sind in der
// digitalen Spielleitung aber bewusst als Alternativauswahl in jeder Runde
// verfügbar. Dadurch stehen exakt acht bekannte und acht neue Karten zur Wahl.
export const ADVANTAGES: readonly AdvantageDefinition[] = BASE_ADVANTAGES.map(
  (advantage) => ({ ...advantage, reserve: true }),
);

export { MISSIONS, getAdvantageById, getMissionById };
