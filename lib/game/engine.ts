import { ROUND_PHASES, ROUNDS } from "./constants";
import type {
  AdvantageUse,
  FinalWinnerResolution,
  GameState,
  LifecycleChangeResult,
  NextGameStep,
  PlayerCapabilities,
  PlayerLifecycleChange,
  PlayerState,
  RoundNumber,
  RoundOutcome,
  Vote,
  VoteEvaluation,
  VoteStage,
  VoteTallyEntry,
} from "./types";

export function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new Error(`Spieler ${playerId} wurde nicht gefunden.`);
  }
  return player;
}

export function getPlayerCapabilities(player: PlayerState): PlayerCapabilities {
  const present = player.attendanceStatus === "present";
  const disqualified = player.winnerPoolStatus === "disqualified";
  const eligible = player.winnerPoolStatus === "eligible";

  return {
    eligibleToWin: eligible && player.attendanceStatus !== "departed",
    canVote: present && !disqualified,
    canJoinChallenges: present && !disqualified,
    canBeMillionaire: present && eligible,
  };
}

export function getEligibleMillionaireCandidates(state: GameState): PlayerState[] {
  return state.players.filter((player) => getPlayerCapabilities(player).canBeMillionaire);
}

export function getVotingPlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => getPlayerCapabilities(player).canVote);
}

export function getAccusablePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => getPlayerCapabilities(player).canBeMillionaire);
}

export function setMillionaire(state: GameState, playerId: string): GameState {
  const selected = getPlayer(state, playerId);
  if (!getPlayerCapabilities(selected).canBeMillionaire) {
    throw new Error("Nur ein anwesender und gewinnberechtigter Spieler kann Millionär werden.");
  }

  return {
    ...state,
    millionairePlayerId: playerId,
    revision: state.revision + 1,
    players: state.players.map((player) => {
      const capabilities = getPlayerCapabilities(player);
      if (!capabilities.eligibleToWin) {
        return { ...player, role: "none" };
      }
      return { ...player, role: player.id === playerId ? "millionaire" : "investigator" };
    }),
  };
}

export function applyPlayerLifecycleChange(
  state: GameState,
  change: PlayerLifecycleChange,
): LifecycleChangeResult {
  const currentPlayer = getPlayer(state, change.playerId);
  const round = change.effectiveRound ?? state.currentRound;
  const isCurrentMillionaire = state.millionairePlayerId === change.playerId;
  let updatedPlayer: PlayerState = { ...currentPlayer };

  switch (change.action) {
    case "eliminate":
      updatedPlayer = {
        ...updatedPlayer,
        winnerPoolStatus: "eliminated",
        role: "none",
        eliminatedInRound: updatedPlayer.eliminatedInRound ?? round,
        exitReason: change.reason ?? "host_decision",
        exitNote: change.note,
      };
      break;
    case "depart":
      updatedPlayer = {
        ...updatedPlayer,
        attendanceStatus: "departed",
        winnerPoolStatus:
          updatedPlayer.winnerPoolStatus === "eligible" ? "eliminated" : updatedPlayer.winnerPoolStatus,
        role: "none",
        eliminatedInRound: updatedPlayer.eliminatedInRound ?? round,
        departedInRound: updatedPlayer.departedInRound ?? round,
        exitReason: change.reason ?? "early_departure",
        exitNote: change.note,
      };
      break;
    case "pause":
      if (updatedPlayer.attendanceStatus === "departed") {
        throw new Error("Ein bereits abgereister Spieler kann nur über eine administrative Korrektur zurückkehren.");
      }
      updatedPlayer = { ...updatedPlayer, attendanceStatus: "temporarily_absent" };
      break;
    case "return":
      if (updatedPlayer.attendanceStatus !== "temporarily_absent") {
        throw new Error("Nur ein vorübergehend abwesender Spieler kann regulär zurückkehren.");
      }
      updatedPlayer = { ...updatedPlayer, attendanceStatus: "present" };
      break;
    case "disqualify":
      updatedPlayer = {
        ...updatedPlayer,
        winnerPoolStatus: "disqualified",
        role: "none",
        eliminatedInRound: updatedPlayer.eliminatedInRound ?? round,
        exitReason: change.reason ?? "rule_violation",
        exitNote: change.note,
      };
      break;
    case "reinstate":
      updatedPlayer = {
        ...updatedPlayer,
        attendanceStatus: "present",
        winnerPoolStatus: "eligible",
        role: "investigator",
        eliminatedInRound: undefined,
        departedInRound: undefined,
        exitReason: undefined,
        exitNote: undefined,
      };
      break;
  }

  const canStillBeMillionaire = getPlayerCapabilities(updatedPlayer).canBeMillionaire;
  const requiresMillionaireReplacement = isCurrentMillionaire && !canStillBeMillionaire;
  const isTemporaryBlock = isCurrentMillionaire && change.action === "pause";
  const clearMillionaire = requiresMillionaireReplacement && change.action !== "pause";

  const nextState: GameState = {
    ...state,
    revision: state.revision + 1,
    millionairePlayerId: clearMillionaire ? undefined : state.millionairePlayerId,
    players: state.players.map((player) =>
      player.id === updatedPlayer.id ? updatedPlayer : player,
    ),
  };

  const warnings: string[] = [];
  if (clearMillionaire) {
    warnings.push(
      "Der aktuelle Millionär ist nicht mehr verfügbar. Vor dem Fortsetzen muss ein gültiger Nachfolger bestimmt werden.",
    );
  }
  if (isTemporaryBlock) {
    warnings.push(
      "Der aktuelle Millionär ist vorübergehend abwesend. Das Spiel bleibt gesperrt, bis er zurückkehrt oder ersetzt wird.",
    );
  }
  if (change.action === "depart") {
    warnings.push("Der Spieler nimmt ab sofort weder an Abstimmungen noch an Challenges teil.");
  }

  return {
    state: nextState,
    requiresMillionaireReplacement: clearMillionaire,
    blocksProgress: clearMillionaire || isTemporaryBlock,
    warnings,
  };
}

export function getNextGameStep(state: GameState): NextGameStep | undefined {
  if (state.phase === "finished") {
    return undefined;
  }
  if (state.phase === "lobby") {
    return { round: 1, phase: "role_reveal" };
  }
  if (state.phase === "result") {
    return state.currentRound === 4
      ? { round: 4, phase: "finished" }
      : { round: state.currentRound, phase: "role_transfer" };
  }
  if (state.phase === "role_transfer") {
    const nextRound = (state.currentRound + 1) as RoundNumber;
    return { round: nextRound, phase: "role_reveal" };
  }

  const currentIndex = ROUND_PHASES.indexOf(state.phase);
  const nextPhase = ROUND_PHASES[currentIndex + 1];
  return nextPhase ? { round: state.currentRound, phase: nextPhase } : undefined;
}

export function canAdvanceGame(state: GameState): { allowed: boolean; reason?: string } {
  const next = getNextGameStep(state);
  if (!next) {
    return { allowed: false, reason: "Das Spiel ist bereits beendet." };
  }

  const nextNeedsMillionaire = !["finished"].includes(next.phase);
  if (nextNeedsMillionaire && !state.millionairePlayerId) {
    return { allowed: false, reason: "Es ist kein aktiver Millionär festgelegt." };
  }

  if (nextNeedsMillionaire && state.millionairePlayerId) {
    const millionaire = getPlayer(state, state.millionairePlayerId);
    if (!getPlayerCapabilities(millionaire).canBeMillionaire) {
      return {
        allowed: false,
        reason: "Der festgelegte Millionär ist nicht anwesend und gewinnberechtigt.",
      };
    }
  }

  return { allowed: true };
}

export function advanceGame(state: GameState): GameState {
  const validation = canAdvanceGame(state);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  const next = getNextGameStep(state);
  if (!next) {
    throw new Error("Kein weiterer Spielschritt vorhanden.");
  }

  return {
    ...state,
    currentRound: next.round,
    phase: next.phase,
    revision: state.revision + 1,
  };
}

function validateVotes(
  state: GameState,
  votes: Vote[],
  stage: VoteStage,
  requireAllVotes: boolean,
): Vote[] {
  const relevantVotes = votes.filter((vote) => vote.stage === stage);
  const voters = getVotingPlayers(state);
  const voterIds = new Set(voters.map((player) => player.id));
  const candidateIds = new Set(getAccusablePlayers(state).map((player) => player.id));
  const seenVoters = new Set<string>();

  for (const vote of relevantVotes) {
    if (!voterIds.has(vote.voterPlayerId)) {
      throw new Error("Eine Stimme stammt von einem aktuell nicht abstimmungsberechtigten Spieler.");
    }
    if (!candidateIds.has(vote.accusedPlayerId)) {
      throw new Error("Beschuldigt werden können nur noch gewinnberechtigte und anwesende Spieler.");
    }
    if (seenVoters.has(vote.voterPlayerId)) {
      throw new Error("Ein Spieler darf pro Abstimmungsstufe nur einmal abstimmen.");
    }
    seenVoters.add(vote.voterPlayerId);
  }

  if (requireAllVotes && seenVoters.size !== voters.length) {
    const missing = voters.filter((player) => !seenVoters.has(player.id)).map((player) => player.name);
    throw new Error(`Es fehlen Stimmen von: ${missing.join(", ")}.`);
  }

  return relevantVotes;
}

function updateAdjustment(entries: Map<string, VoteTallyEntry>, playerId: string, delta: number) {
  const entry = entries.get(playerId);
  if (!entry) {
    throw new Error("Der Vorteil verweist auf kein zulässiges Abstimmungsziel.");
  }
  entry.adjustment += delta;
}

export function evaluateVotes(
  state: GameState,
  votes: Vote[],
  options: {
    stage?: VoteStage;
    advantageUse?: AdvantageUse;
    requireAllVotes?: boolean;
  } = {},
): VoteEvaluation {
  const stage = options.stage ?? "main";
  const relevantVotes = validateVotes(state, votes, stage, options.requireAllVotes ?? true);
  const entries = new Map<string, VoteTallyEntry>();
  const ignoredVoterPlayerIds: string[] = [];

  for (const candidate of getAccusablePlayers(state)) {
    entries.set(candidate.id, {
      playerId: candidate.id,
      regularVotes: 0,
      adjustment: 0,
      effectiveVotes: 0,
    });
  }

  for (const vote of relevantVotes) {
    const entry = entries.get(vote.accusedPlayerId);
    if (!entry) {
      throw new Error("Ungültiges Abstimmungsziel.");
    }
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
        if (!actorVote) throw new Error("Die doppelte Stimme benötigt eine abgegebene Stimme des Millionärs.");
        updateAdjustment(entries, actorVote.accusedPlayerId, 1);
        break;
      case "block_vote": {
        if (!advantage.voterPlayerId || advantage.voterPlayerId === advantage.actorPlayerId) {
          throw new Error("Für die Stimmensperre muss ein anderer Wähler bestimmt werden.");
        }
        const blockedVote = relevantVotes.find(
          (vote) => vote.voterPlayerId === advantage.voterPlayerId,
        );
        if (!blockedVote) throw new Error("Der gesperrte Spieler hat keine Stimme abgegeben.");
        updateAdjustment(entries, blockedVote.accusedPlayerId, -1);
        ignoredVoterPlayerIds.push(blockedVote.voterPlayerId);
        break;
      }
      case "add_two_votes":
        if (!advantage.targetPlayerId) throw new Error("Für die Schattenstimmen fehlt das Ziel.");
        updateAdjustment(entries, advantage.targetPlayerId, 2);
        break;
      case "redirect_one_vote":
        if (!advantage.targetPlayerId || advantage.targetPlayerId === advantage.actorPlayerId) {
          throw new Error("Für die Umleitung muss ein anderer gewinnberechtigter Spieler gewählt werden.");
        }
        if ((entries.get(advantage.actorPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.actorPlayerId, -1);
          updateAdjustment(entries, advantage.targetPlayerId, 1);
        }
        break;
      case "add_one_vote":
        if (!advantage.targetPlayerId) throw new Error("Für die Schattenstimme fehlt das Ziel.");
        updateAdjustment(entries, advantage.targetPlayerId, 1);
        break;
      case "ignore_eliminated_vote": {
        if (!advantage.voterPlayerId) throw new Error("Für die blinde Stimme fehlt der Wähler.");
        const selectedVoter = getPlayer(state, advantage.voterPlayerId);
        if (selectedVoter.winnerPoolStatus !== "eliminated") {
          throw new Error("Die blinde Stimme darf nur einen bereits ausgeschiedenen Spieler betreffen.");
        }
        const ignoredVote = relevantVotes.find(
          (vote) => vote.voterPlayerId === advantage.voterPlayerId,
        );
        if (!ignoredVote) throw new Error("Der ausgewählte ausgeschiedene Spieler hat nicht abgestimmt.");
        updateAdjustment(entries, ignoredVote.accusedPlayerId, -1);
        ignoredVoterPlayerIds.push(ignoredVote.voterPlayerId);
        break;
      }
      case "protect_other":
        if (!advantage.targetPlayerId || advantage.targetPlayerId === advantage.actorPlayerId) {
          throw new Error("Das Schutzschild muss einen anderen Spieler schützen.");
        }
        if ((entries.get(advantage.targetPlayerId)?.regularVotes ?? 0) > 0) {
          updateAdjustment(entries, advantage.targetPlayerId, -1);
        }
        break;
      case "tie_priority":
        break;
    }
  }

  const tally = [...entries.values()].map((entry) => ({
    ...entry,
    effectiveVotes: Math.max(0, entry.regularVotes + entry.adjustment),
  }));
  const maximum = Math.max(...tally.map((entry) => entry.effectiveVotes));
  const topPlayerIds = tally
    .filter((entry) => entry.effectiveVotes === maximum)
    .map((entry) => entry.playerId);

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
    eliminatedPlayerId: topPlayerIds.length === 1 ? topPlayerIds[0] : undefined,
    ignoredVoterPlayerIds,
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
  if (!evaluation.eliminatedPlayerId || evaluation.requiresRunoff) {
    throw new Error("Vor dem Rundenabschluss muss ein eindeutiges Ausscheidungsergebnis vorliegen.");
  }

  const millionairePlayerId = state.millionairePlayerId;
  const eliminatedPlayerId = evaluation.eliminatedPlayerId;
  const millionaireSurvived = millionairePlayerId !== eliminatedPlayerId;
  const roundDefinition = ROUNDS.find((round) => round.number === state.currentRound);
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
      return { ...player, points: player.points + roundDefinition.points };
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

  const nextState: GameState = {
    ...elimination.state,
    phase: "result",
    players: scoredPlayers,
    roundOutcomes: [...state.roundOutcomes, outcome],
    revision: elimination.state.revision + 1,
  };

  return { state: nextState, outcome };
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

  const bestCorrectGuesses = Math.max(...candidates.map((player) => player.correctGuesses));
  candidates = candidates.filter((player) => player.correctGuesses === bestCorrectGuesses);
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
    (player) => (player.lastCorrectGuessRound ?? 0) === latestCorrectGuess,
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
