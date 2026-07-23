import { getPlayerCapabilities } from "./lifecycle";
import { secureRandomIndex } from "./random";
import type { GameState, TeamAssignment } from "./types";

export function drawBalancedTeams(
  state: GameState,
  randomIndex: (upperExclusive: number) => number = secureRandomIndex,
): TeamAssignment[] {
  const playerIds = state.players
    .filter((player) => getPlayerCapabilities(player).canJoinChallenges)
    .map((player) => player.id);

  if (playerIds.length < 2) {
    throw new Error("Für eine Team-Challenge werden mindestens zwei anwesende Spieler benötigt.");
  }

  const shuffled = [...playerIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new Error("Die Zufallsquelle hat einen ungültigen Teamindex geliefert.");
    }
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.map((playerId, index) => ({
    playerId,
    team: index % 2 === 0 ? "azur" : "gold",
  }));
}

export function getTeamForPlayer(
  assignments: readonly TeamAssignment[] | undefined,
  playerId: string,
) {
  return assignments?.find((assignment) => assignment.playerId === playerId)?.team;
}
