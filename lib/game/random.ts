import { getEligibleMillionaireCandidates, setMillionaire } from "./lifecycle";
import type { GameState, PlayerState } from "./types";

export type RandomIndexSource = (upperExclusive: number) => number;

export interface RandomMillionaireDrawOptions {
  excludePlayerId?: string;
  randomIndex?: RandomIndexSource;
}

export interface RandomMillionaireDrawResult {
  state: GameState;
  selectedPlayerId: string;
  candidatePlayerIds: string[];
}

/**
 * Liefert einen gleichverteilten Index ohne Modulo-Bias. Funktioniert in
 * modernen Browsern und in Node.js 20+ über Web Crypto.
 */
export function secureRandomIndex(upperExclusive: number): number {
  if (!Number.isSafeInteger(upperExclusive) || upperExclusive <= 0) {
    throw new Error("Für die Zufallsauswahl wird mindestens ein Kandidat benötigt.");
  }

  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Sichere Zufallsauswahl ist in dieser Umgebung nicht verfügbar.");
  }

  const range = 0x1_0000_0000;
  const limit = range - (range % upperExclusive);
  const buffer = new Uint32Array(1);
  let value: number;

  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % upperExclusive;
}

export function getRandomMillionaireCandidates(
  state: GameState,
  excludePlayerId?: string,
): PlayerState[] {
  return getEligibleMillionaireCandidates(state).filter(
    (player) => player.id !== excludePlayerId,
  );
}

/**
 * Der neue Millionär wird immer aus allen aktuell zulässigen Kandidaten
 * ausgelost. Weder Spielleitung noch bisheriger Millionär bestimmen die
 * Zielperson. Bei freiwilliger Korkenabgabe wird der bisherige Millionär
 * ausgeschlossen, damit die Abgabe tatsächlich einen Rollenwechsel bewirkt.
 */
export function drawRandomMillionaire(
  state: GameState,
  options: RandomMillionaireDrawOptions = {},
): RandomMillionaireDrawResult {
  const candidates = getRandomMillionaireCandidates(state, options.excludePlayerId);
  if (candidates.length === 0) {
    throw new Error("Es gibt keinen zulässigen Kandidaten für die Millionärsrolle.");
  }

  const randomIndex = options.randomIndex ?? secureRandomIndex;
  const selectedIndex = randomIndex(candidates.length);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= candidates.length) {
    throw new Error("Die Zufallsquelle hat einen ungültigen Kandidatenindex geliefert.");
  }

  const selected = candidates[selectedIndex];
  return {
    state: setMillionaire(state, selected.id),
    selectedPlayerId: selected.id,
    candidatePlayerIds: candidates.map((player) => player.id),
  };
}
