import { ROUNDS } from "./constants";
import {
  applyPlayerLifecycleChange,
  getAccusablePlayers,
  getPlayer,
  getPlayerCapabilities,
  getVotingPlayers,
} from "./lifecycle";
import type {
  AdvantageUse,
  FinalWinnerResolution,
  GameState,
  RoundOutcome,
  Vote,
  VoteEvaluation,
  VoteStage,
  VoteTallyEntry,
} from "./types";

interface VoteEvaluationOptions {
  stage?: VoteStage;
  advantageUse?: AdvantageUse;
  requireAllVotes?: boolean;
  accusedPlayerIds?: string[];
}

function validateVotes(
  state: GameState,
  votes: Vote[],
  stage: VoteStage,
  requireAllVotes: boolean,
  accusedPlayerIds?: string[],
): Vote[] {
  const relevantVotes = votes.filter((vote) => vote.stage === stage);
  const voters = getVotingPlayers(state);
  const voterIds = new Set(voters.map((player) => player.id));
  const defaultCandidates = getAccusablePlayers(state).map((player) => player.id);
  const allowedCandidates = accusedPlayerIds ?? defaultCandidates;
  const validCandidateIds = new Set(defaultCandidates);
  const candidateIds = new Set(allowedCandidates);
  const seenVoters = new Set<string>();

  if (candidateIds.size === 0) {
    throw new Error("Für diese Abstimmung stehen keine gültigen Kandidaten zur Verfügung.");
  }
  for (const candidateId of candidateIds) {
    if (!validCandidateIds.has(candidateId)) {
      throw new Error("Die Kandidatenliste enthält einen nicht mehr zulässigen Spieler.");
    }
  }

  for (const vote of relevantVotes) {
    if (!voterIds.has(vote.voterPlayerId)) {
      throw new Error("Eine Stimme stammt von einem aktuell nicht abstimmungsberechtigten Spieler.");
    }
    if (!candidateIds.has(vote.accusedPlayerId)) {
      throw new Error(
        stage === "runoff"
          ? "In der Stichwahl darf nur zwischen den Gleichstehenden gewählt werden."
          : "Beschuldigt werden können nur noch gewinnberechtigte und anwesende Spieler.",
      );
    }
    if (seenVoters.has(vote.voterPlayerId)) {
      throw new Error("Ein Spieler darf pro Abstimmungsstufe nur einmal abstimmen.");
    }
    seenVoters.add(vote.voterPlayerId);
  }

  if (requireAllVotes && seenVoters.size !== voters.length) {
    const missing = voters
      .filter((player) => !seenVoters.has(player.id))
      .map((player) => player.name);
    throw new Error(`Es fehlen Stimmen von: ${missing.join(", ")}.`);
  }

  return relevantVotes;
}

function updateAdjustment(
  entries: Map<string, VoteTallyEntry>,
  playerId: string,
  delta: number,
) {
  const entry = entries.get(playerId);
  if (!entry) {
    throw new Error("Der Vorteil verweist auf kein zulässiges Abstimmungsziel.");
  }
  entry.adjustment += delta;
}

function buildTally(entries: Map<string, VoteTallyEntry>): VoteTallyEntry[] {
  return [...entries.values()].map((entry) => ({
    ...entry,
    effectiveVotes: Math.max(0, entry.regularVotes + entry.adjustment),
  }));
}

function getTopPlayerIds(tally: VoteTallyEntry[]): string[] {
  const maximum = Math.max(...tally.map((entry) => entry.effectiveVotes));
  return tally
    .filter((entry) => entry.effectiveVotes === maximum)
    .map((entry) => entry.playerId);
}

export function evaluateVotes(
  state: GameState,
  votes: Vote[],
  options: VoteEvaluationOptions = {},
): VoteEvaluation {
  const stage = options.stage ?? "main";
  const candidateIds =
    options.accusedPlayerIds ??
    getAccusablePlayers(state).map((player) => player.id);
  const relevantVotes = validateVotes(
    state,
    votes,
    stage,
    options.requireAllVotes ?? true,
    candidateIds,
  );
  const entries = new Map<string, VoteTallyEntry>();
  const ignoredVoterPlayerIds: string[] = [];

  for (const candidateId of candidateIds) {
    entries.set(candidateId, {
      playerId: candidateId,
      regularVotes: 0,
      adjustment: 0,
      effectiveVotes: 0,
    });
  }

  for (const vote of relevantVotes) {
    const entry = entries.get(vote.accusedPlayerId);
    if (!entry) throw new Error("Ungültiges Abstimmungsziel.");
    entry.regularVotes += 1;
  }

  const advantage = stage === "main" ? options.advantageUse : undefined;
  if (advantage) {
    if (advantage.actorPlayerId !== state.millionairePlayerId) {
      throw new Error("Nur der aktuelle Millionär kann den bestätigten Vorteil einsetzen.");
    }

    const actorVote = relevantVotes.find(
      (vote) => vote.voterPlayerId === advantage.actorPlayerId,
    );

    switch (advantage.effect) {
      case "double_vote":
        if (!actorVote) {
          throw new Error("Die doppelte Stimme benötigt eine abgegebene Stimme des Millionärs.");
        }
        updateAdjustment(entries, actorVote.accusedPlayerId, 1);
        break;

      case "block_vote": {
        if (
          !advantage.voterPlayerId ||
          advantage.voterPlayerId === advantage.actorPlayerId
        ) {
          throw new Error("Für die Stimmensperre muss ein anderer Wähler bestimmt werden.");
        }
        const blockedVote = relevantVotes.find(
          (vote) => vote.voterPlayerId === advantage.voterPlayerId,
        );
        if (!blockedVote) {
          throw new Error("Der gesperrte Spieler hat keine Stimme abgegeben.");
        }
        updateAdjustment(entries, blockedVote.accusedPlayerId, -1);
        ignoredVoterPlayerIds.push(blockedVote.voterPlayerId);
        break;
      }

      case "add_two_votes":
        if (!advantage.targetPlayerId) {
          throw new Error("Für die Schattenstimmen fehlt das Ziel.");
        }
        updateAdjustment(entries, advantage.targetPlayerId, 2);
        break;

      case "redirect_one_vote":
        if (
          !advantage.targetPlayerId ||
          advantage.targetPlayerId === advantage.actorPlayerId
        ) {
          throw new Error("Für die Umleitung muss ein anderer gewinnberechtigter Spieler gewählt werden.");
        }
        if ((entries.get(advantage.actorPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.actorPlayerId, -1);
          updateAdjustment(entries, advantage.targetPlayerId, 1);
        }
        break;

      case "add_one_vote":
        if (!advantage.targetPlayerId) {
          throw new Error("Für die Schattenstimme fehlt das Ziel.");
        }
        updateAdjustment(entries, advantage.targetPlayerId, 1);
        break;

      case "ignore_eliminated_vote": {
        if (!advantage.voterPlayerId) {
          throw new Error("Für die blinde Stimme fehlt der Wähler.");
        }
        const selectedVoter = getPlayer(state, advantage.voterPlayerId);
        if (selectedVoter.winnerPoolStatus !== "eliminated") {
          throw new Error("Die blinde Stimme darf nur einen bereits ausgeschiedenen Spieler betreffen.");
        }
        const ignoredVote = relevantVotes.find(
          (vote) => vote.voterPlayerId === advantage.voterPlayerId,
        );
        if (!ignoredVote) {
          throw new Error("Der ausgewählte ausgeschiedene Spieler hat nicht abgestimmt.");
        }
        updateAdjustment(entries, ignoredVote.accusedPlayerId, -1);
        ignoredVoterPlayerIds.push(ignoredVote.voterPlayerId);
        break;
      }

      case "protect_other":
        if (
          !advantage.targetPlayerId ||
          advantage.targetPlayerId === advantage.actorPlayerId
        ) {
          throw new Error("Das Schutzschild muss einen anderen Spieler schützen.");
        }
        if ((entries.get(advantage.targetPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.targetPlayerId, -1);
        }
        break;

      case "tie_priority":
        break;

      case "remove_vote_against_self":
        if ((entries.get(advantage.actorPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.actorPlayerId, -1);
        }
        break;

      case "redirect_selected_vote": {
        if (!advantage.voterPlayerId || !advantage.targetPlayerId) {
          throw new Error("Für den Doppelagenten werden Wähler und neues Ziel benötigt.");
        }
        if (advantage.voterPlayerId === advantage.actorPlayerId) {
          throw new Error("Der Doppelagent muss einen anderen Wähler betreffen.");
        }
        const redirectedVote = relevantVotes.find(
          (vote) => vote.voterPlayerId === advantage.voterPlayerId,
        );
        if (!redirectedVote) {
          throw new Error("Der ausgewählte Doppelagent hat keine Stimme abgegeben.");
        }
        updateAdjustment(entries, redirectedVote.accusedPlayerId, -1);
        updateAdjustment(entries, advantage.targetPlayerId, 1);
        break;
      }

      case "bounce_vote_to_voter": {
        if (!advantage.voterPlayerId) {
          throw new Error("Für das Bumerang-Protokoll fehlt der betroffene Wähler.");
        }
        if (!entries.has(advantage.voterPlayerId)) {
          throw new Error("Der betroffene Wähler ist kein zulässiges Abstimmungsziel.");
        }
        const bouncedVote = relevantVotes.find(
          (vote) => vote.voterPlayerId === advantage.voterPlayerId,
        );
        if (!bouncedVote) {
          throw new Error("Der betroffene Wähler hat keine Stimme abgegeben.");
        }
        updateAdjustment(entries, bouncedVote.accusedPlayerId, -1);
        updateAdjustment(entries, advantage.voterPlayerId, 1);
        break;
      }

      case "split_shadow_votes":
        if (
          !advantage.targetPlayerId ||
          !advantage.secondaryTargetPlayerId ||
          advantage.targetPlayerId === advantage.secondaryTargetPlayerId
        ) {
          throw new Error("Zwillingsschatten benötigt zwei unterschiedliche Ziele.");
        }
        updateAdjustment(entries, advantage.targetPlayerId, 1);
        updateAdjustment(entries, advantage.secondaryTargetPlayerId, 1);
        break;

      case "move_vote_between_targets":
        if (
          !advantage.sourceTargetPlayerId ||
          !advantage.targetPlayerId ||
          advantage.sourceTargetPlayerId === advantage.targetPlayerId
        ) {
          throw new Error("Die falsche Fährte benötigt zwei unterschiedliche Ziele.");
        }
        if ((entries.get(advantage.sourceTargetPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.sourceTargetPlayerId, -1);
          updateAdjustment(entries, advantage.targetPlayerId, 1);
        }
        break;

      case "conditional_shadow_vote":
        if (!advantage.targetPlayerId) {
          throw new Error("Für das Midas-Echo fehlt das Ziel.");
        }
        if ((entries.get(advantage.targetPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.targetPlayerId, 1);
        }
        break;

      case "cap_target_votes": {
        if (!advantage.targetPlayerId) {
          throw new Error("Für die Nebelwand fehlt das Ziel.");
        }
        const regularVotes = entries.get(advantage.targetPlayerId)?.regularVotes ?? 0;
        if (regularVotes > 2) {
          updateAdjustment(entries, advantage.targetPlayerId, 2 - regularVotes);
        }
        break;
      }

      case "self_tie_break":
        break;
    }
  }

  let tally = buildTally(entries);
  let topPlayerIds = getTopPlayerIds(tally);

  if (
    advantage?.effect === "self_tie_break" &&
    topPlayerIds.length > 1 &&
    topPlayerIds.includes(advantage.actorPlayerId)
  ) {
    updateAdjustment(entries, advantage.actorPlayerId, -1);
    tally = buildTally(entries);
    topPlayerIds = getTopPlayerIds(tally);
  }

  if (
    advantage?.effect === "tie_priority" &&
    topPlayerIds.length > 1 &&
    topPlayerIds.includes(advantage.actorPlayerId) &&
    advantage.tieOpponentPlayerId &&
    topPlayerIds.includes(advantage.tieOpponentPlayerId) &&
    advantage.tieOpponentPlayerId !== advantage.actorPlayerId
  ) {
    return {
      tally,
      topPlayerIds,
      requiresRunoff: false,
      eliminatedPlayerId: advantage.tieOpponentPlayerId,
      ignoredVoterPlayerIds,
    };
  }

  return {
    tally,
    topPlayerIds,
    requiresRunoff: topPlayerIds.length > 1,
    eliminatedPlayerId:
      topPlayerIds.length === 1 ? topPlayerIds[0] : undefined,
    ignoredVoterPlayerIds,
  };
}

export function resolveTieByLot(
  evaluation: VoteEvaluation,
  selectedPlayerId: string,
): VoteEvaluation {
  if (!evaluation.requiresRunoff || evaluation.topPlayerIds.length < 2) {
    throw new Error("Ein Losentscheid ist nur bei einem fortbestehenden Gleichstand zulässig.");
  }
  if (!evaluation.topPlayerIds.includes(selectedPlayerId)) {
    throw new Error("Der Losentscheid muss einen der gleichstehenden Spieler betreffen.");
  }

  return {
    ...evaluation,
    requiresRunoff: false,
    eliminatedPlayerId: selectedPlayerId,
  };
}

export function finalizeRound(
  state: GameState,
  votes: Vote[],
  evaluation: VoteEvaluation,
  advantageUse?: AdvantageUse,
): { state: GameState; outcome: RoundOutcome } {
  if (!state.millionairePlayerId) {
    throw new Error("Die Runde kann ohne festgelegten Millionär nicht abgeschlossen werden.");
  }
  if (state.roundOutcomes.some((outcome) => outcome.round === state.currentRound)) {
    throw new Error("Diese Runde wurde bereits verbindlich abgeschlossen.");
  }
  if (!evaluation.eliminatedPlayerId || evaluation.requiresRunoff) {
    throw new Error("Vor dem Rundenabschluss muss ein eindeutiges Ausscheidungsergebnis vorliegen.");
  }

  const millionairePlayerId = state.millionairePlayerId;
  const eliminatedPlayerId = evaluation.eliminatedPlayerId;
  const millionaireSurvived = millionairePlayerId !== eliminatedPlayerId;
  const roundDefinition = ROUNDS.find(
    (round) => round.number === state.currentRound,
  );
  if (!roundDefinition) throw new Error("Ungültige Runde.");

  const elimination = applyPlayerLifecycleChange(state, {
    playerId: eliminatedPlayerId,
    action: "eliminate",
    reason: "vote",
  });
  const submittedVotes = new Map(
    votes
      .filter((vote) => vote.stage === "main")
      .map((vote) => [vote.voterPlayerId, vote.accusedPlayerId]),
  );
  const pointRecipientPlayerIds: string[] = [];
  const correctGuessPlayerIds: string[] = [];

  const scoredPlayers = elimination.state.players.map((player) => {
    const before = getPlayer(state, player.id);
    const stillEligible = getPlayerCapabilities(player).eligibleToWin;
    if (!stillEligible) return player;

    if (player.id === millionairePlayerId && millionaireSurvived) {
      pointRecipientPlayerIds.push(player.id);
      return {
        ...player,
        points: player.points + roundDefinition.points,
      };
    }

    if (
      before.role === "investigator" &&
      submittedVotes.get(player.id) === millionairePlayerId
    ) {
      pointRecipientPlayerIds.push(player.id);
      correctGuessPlayerIds.push(player.id);
      return {
        ...player,
        points: player.points + roundDefinition.points,
        correctGuesses: player.correctGuesses + 1,
        lastCorrectGuessRound: state.currentRound,
      };
    }

    return player;
  });

  const outcome: RoundOutcome = {
    round: state.currentRound,
    millionairePlayerId,
    eliminatedPlayerId,
    millionaireSurvived,
    pointRecipientPlayerIds,
    correctGuessPlayerIds,
    tally: evaluation.tally,
    advantageId: advantageUse?.advantageId,
  };

  return {
    state: {
      ...elimination.state,
      phase: "result",
      players: scoredPlayers,
      roundOutcomes: [...state.roundOutcomes, outcome],
      revision: elimination.state.revision + 1,
    },
    outcome,
  };
}

export function resolveFinalWinner(
  state: GameState,
  finalOutcome: RoundOutcome,
): FinalWinnerResolution {
  if (finalOutcome.round !== 4) {
    throw new Error("Die Gewinnerermittlung ist nur für das Finale zulässig.");
  }

  if (finalOutcome.millionaireSurvived) {
    return {
      winnerPlayerId: finalOutcome.millionairePlayerId,
      requiresLot: false,
      tiedPlayerIds: [],
      reason: "millionaire_survived",
    };
  }

  let candidates = state.players.filter(
    (player) => getPlayerCapabilities(player).eligibleToWin,
  );
  if (candidates.length === 0) {
    return { requiresLot: true, tiedPlayerIds: [], reason: "lot" };
  }

  const bestPoints = Math.max(...candidates.map((player) => player.points));
  candidates = candidates.filter((player) => player.points === bestPoints);
  if (candidates.length === 1) {
    return {
      winnerPlayerId: candidates[0].id,
      requiresLot: false,
      tiedPlayerIds: [],
      reason: "points",
    };
  }

  const bestCorrectGuesses = Math.max(
    ...candidates.map((player) => player.correctGuesses),
  );
  candidates = candidates.filter(
    (player) => player.correctGuesses === bestCorrectGuesses,
  );
  if (candidates.length === 1) {
    return {
      winnerPlayerId: candidates[0].id,
      requiresLot: false,
      tiedPlayerIds: [],
      reason: "correct_guesses",
    };
  }

  const latestCorrectGuess = Math.max(
    ...candidates.map((player) => player.lastCorrectGuessRound ?? 0),
  );
  candidates = candidates.filter(
    (player) =>
      (player.lastCorrectGuessRound ?? 0) === latestCorrectGuess,
  );
  if (candidates.length === 1) {
    return {
      winnerPlayerId: candidates[0].id,
      requiresLot: false,
      tiedPlayerIds: [],
      reason: "later_correct_guess",
    };
  }

  return {
    requiresLot: true,
    tiedPlayerIds: candidates.map((player) => player.id),
    reason: "lot",
  };
}
