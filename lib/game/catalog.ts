import type { AdvantageDefinition } from "./types";
import { MISSIONS, getMissionById } from "./missions";
import { SIMPLIFIED_ADVANTAGES } from "./simplifiedAdvantages";

export const ADVANTAGES: readonly AdvantageDefinition[] = SIMPLIFIED_ADVANTAGES;

export function getAdvantageById(id: string) {
  return ADVANTAGES.find((advantage) => advantage.id === id);
}

export { MISSIONS, getMissionById };
