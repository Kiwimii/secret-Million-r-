import type {
  GameState,
  LifecycleChangeResult,
  PlayerCapabilities,
  PlayerLifecycleChange,
  PlayerState,
} from "./types";

export function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new Error(`Spieler ${playerId} wurde nicht gefunden.`);
  }
  return player;
}

export function getPlayerCapabilities(player: PlayerState): PlayerCapabilities {
  const registered = player.registrationStatus !== "invited";
  const present = player.attendanceStatus === "present";
  const disqualified = player.winnerPoolStatus === "disqualified";
  const eligible = player.winnerPoolStatus === "eligible";

  return {
    eligibleToWin:
      registered && eligible && player.attendanceStatus !== "departed",
    canVote: registered && present && !disqualified,
    canJoinChallenges: registered && present && !disqualified,
    canBeMillionaire: registered && present && eligible,
  };
}

export function getEligibleMillionaireCandidates(
  state: GameState,
): PlayerState[] {
  return state.players.filter(
    (player) => getPlayerCapabilities(player).canBeMillionaire,
  );
}

export function getVotingPlayers(state: GameState): PlayerState[] {
  return state.players.filter(
    (player) => getPlayerCapabilities(player).canVote,
  );
}

export function getAccusablePlayers(state: GameState): PlayerState[] {
  return state.players.filter(
    (player) => getPlayerCapabilities(player).canBeMillionaire,
  );
}

export function setMillionaire(
  state: GameState,
  playerId: string,
): GameState {
  const selected = getPlayer(state, playerId);
  if (!getPlayerCapabilities(selected).canBeMillionaire) {
    throw new Error(
      "Nur ein registrierter, anwesender und gewinnberechtigter Spieler kann Millionär werden.",
    );
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
      return {
        ...player,
        role:
          player.id === playerId ? "millionaire" : "investigator",
      };
    }),
  };
}

export function applyPlayerLifecycleChange(
  state: GameState,
  change: PlayerLifecycleChange,
): LifecycleChangeResult {
  const currentPlayer = getPlayer(state, change.playerId);
  const round = change.effectiveRound ?? state.currentRound;
  const isCurrentMillionaire =
    state.millionairePlayerId === change.playerId;
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
          updatedPlayer.winnerPoolStatus === "eligible"
            ? "eliminated"
            : updatedPlayer.winnerPoolStatus,
        role: "none",
        eliminatedInRound: updatedPlayer.eliminatedInRound ?? round,
        departedInRound: updatedPlayer.departedInRound ?? round,
        exitReason: change.reason ?? "early_departure",
        exitNote: change.note,
      };
      break;
    case "pause":
      if (updatedPlayer.attendanceStatus === "departed") {
        throw new Error(
          "Ein bereits abgereister Spieler kann nur über eine administrative Korrektur zurückkehren.",
        );
      }
      updatedPlayer = {
        ...updatedPlayer,
        attendanceStatus: "temporarily_absent",
      };
      break;
    case "return":
      if (updatedPlayer.attendanceStatus !== "temporarily_absent") {
        throw new Error(
          "Nur ein vorübergehend abwesender Spieler kann regulär zurückkehren.",
        );
      }
      if (updatedPlayer.registrationStatus === "invited") {
        throw new Error(
          "Ein eingeladenes Profil muss sich zuerst persönlich registrieren.",
        );
      }
      updatedPlayer = {
        ...updatedPlayer,
        attendanceStatus: "present",
      };
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
      if (updatedPlayer.registrationStatus === "invited") {
        throw new Error(
          "Ein eingeladenes Profil kann nicht administrativ aktiviert werden. Die Person muss sich registrieren.",
        );
      }
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

  const canStillBeMillionaire =
    getPlayerCapabilities(updatedPlayer).canBeMillionaire;
  const needsDecision = isCurrentMillionaire && !canStillBeMillionaire;
  const isTemporaryBlock =
    isCurrentMillionaire && change.action === "pause";
  const clearMillionaire = needsDecision && change.action !== "pause";

  const nextState: GameState = {
    ...state,
    revision: state.revision + 1,
    millionairePlayerId: clearMillionaire
      ? undefined
      : state.millionairePlayerId,
    players: state.players.map((player) =>
      player.id === updatedPlayer.id ? updatedPlayer : player,
    ),
  };

  const warnings: string[] = [];
  if (clearMillionaire) {
    warnings.push(
      "Der aktuelle Millionär ist nicht mehr verfügbar. Vor dem Start der nächsten Runde muss ein gültiger Nachfolger bestimmt werden.",
    );
  }
  if (isTemporaryBlock) {
    warnings.push(
      "Der aktuelle Millionär ist vorübergehend abwesend. Das Spiel bleibt gesperrt, bis er zurückkehrt oder ersetzt wird.",
    );
  }
  if (change.action === "depart") {
    warnings.push(
      "Der Spieler nimmt ab sofort weder an Abstimmungen noch an Challenges teil.",
    );
  }

  return {
    state: nextState,
    requiresMillionaireReplacement: clearMillionaire,
    blocksProgress: clearMillionaire || isTemporaryBlock,
    warnings,
  };
}
