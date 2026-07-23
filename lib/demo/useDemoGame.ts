"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ADVANTAGES } from "@/lib/game/catalog";
import {
  advanceGame,
  applyPlayerLifecycleChange,
  drawRandomMillionaire,
  evaluateVotes,
  finalizeRound,
  getAccusablePlayers,
  getPlayerCapabilities,
  getVotingPlayers,
  resolveFinalWinner,
  resolveTieByLot,
  secureRandomIndex,
} from "@/lib/game/engine";
import type {
  AdvantageUse,
  FinalWinnerResolution,
  MissionStatus,
  PlayerLifecycleAction,
  PlayerState,
  RoundNumber,
  RoundOutcome,
  Vote,
  VoteEvaluation,
  VoteStage,
} from "@/lib/game/types";
import {
  createInitialDemoSnapshot,
  emptyRoundVotes,
  isDemoSnapshot,
  type DemoAdvantageSelection,
  type DemoSnapshot,
  type RoleDecision,
} from "./model";

const STORAGE_KEY = "secret-millionaer.demo.v3";
const CHANNEL_NAME = "secret-millionaer-demo-v3";

function readSnapshot(): DemoSnapshot {
  if (typeof window === "undefined") return createInitialDemoSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDemoSnapshot();
    const parsed: unknown = JSON.parse(raw);
    return isDemoSnapshot(parsed) ? parsed : createInitialDemoSnapshot();
  } catch {
    return createInitialDemoSnapshot();
  }
}

function persistSnapshot(snapshot: DemoSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent(CHANNEL_NAME, { detail: snapshot }));
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(snapshot);
    channel.close();
  } catch {
    // storage/custom event bleibt als Fallback aktiv.
  }
}

function touch(snapshot: DemoSnapshot): DemoSnapshot {
  return { ...snapshot, updatedAt: new Date().toISOString() };
}

function getRoundVotes(snapshot: DemoSnapshot, round: RoundNumber) {
  return snapshot.votesByRound[round] ?? emptyRoundVotes();
}

function votesForStage(snapshot: DemoSnapshot, stage: VoteStage): Vote[] {
  const roundVotes = getRoundVotes(snapshot, snapshot.game.currentRound)[stage];
  return Object.entries(roundVotes).map(([voterPlayerId, accusedPlayerId]) => ({
    voterPlayerId,
    accusedPlayerId,
    stage,
  }));
}

function deterministicTarget(
  voterId: string,
  candidateIds: string[],
  millionaireId?: string,
): string {
  const alternate = candidateIds.find((candidateId) => candidateId !== voterId);
  if (!alternate) return candidateIds[0];
  const numeric = Number(voterId.replace(/\D/g, "")) || 0;
  if (millionaireId && numeric % 3 !== 0 && millionaireId !== voterId) return millionaireId;
  return alternate;
}

function sanitizeVotes(snapshot: DemoSnapshot, game: DemoSnapshot["game"]): DemoSnapshot["votesByRound"] {
  const validVoterIds = new Set(getVotingPlayers(game).map((player) => player.id));
  const validCandidateIds = new Set(getAccusablePlayers(game).map((player) => player.id));
  const round = game.currentRound;
  const current = getRoundVotes(snapshot, round);

  function sanitizeStage(votes: Record<string, string>) {
    return Object.fromEntries(
      Object.entries(votes).filter(
        ([voterId, targetId]) => validVoterIds.has(voterId) && validCandidateIds.has(targetId),
      ),
    );
  }

  return {
    ...snapshot.votesByRound,
    [round]: {
      main: sanitizeStage(current.main),
      runoff: sanitizeStage(current.runoff),
    },
  };
}

function sanitizeRoleDecisions(
  snapshot: DemoSnapshot,
  game: DemoSnapshot["game"],
): DemoSnapshot["roleDecisionsByRound"] {
  const eligibleIds = new Set(
    game.players
      .filter((player) => getPlayerCapabilities(player).eligibleToWin)
      .map((player) => player.id),
  );
  const round = game.currentRound;
  const current = snapshot.roleDecisionsByRound[round] ?? {};
  return {
    ...snapshot.roleDecisionsByRound,
    [round]: Object.fromEntries(
      Object.entries(current).filter(([playerId]) => eligibleIds.has(playerId)),
    ),
  };
}

function getAdvantageUse(snapshot: DemoSnapshot): AdvantageUse | undefined {
  const round = snapshot.game.currentRound;
  if (snapshot.missionStatusByRound[round] !== "completed") return undefined;
  const selection = snapshot.advantageByRound[round];
  const actorPlayerId = snapshot.game.millionairePlayerId;
  if (!selection || !actorPlayerId) return undefined;
  const definition = ADVANTAGES.find((advantage) => advantage.id === selection.advantageId);
  if (!definition) throw new Error("Der ausgewählte Vorteil wurde nicht gefunden.");

  return {
    advantageId: definition.id,
    effect: definition.effect,
    actorPlayerId,
    targetPlayerId: selection.targetPlayerId,
    voterPlayerId: selection.voterPlayerId,
    tieOpponentPlayerId: selection.tieOpponentPlayerId,
  };
}

function validateAdvantage(snapshot: DemoSnapshot) {
  if (snapshot.missionStatusByRound[snapshot.game.currentRound] !== "completed") return;
  const use = getAdvantageUse(snapshot);
  if (!use) throw new Error("Bei erfüllter Mission muss ein Vorteil festgelegt werden.");
  if (["add_two_votes", "redirect_one_vote", "add_one_vote", "protect_other"].includes(use.effect) && !use.targetPlayerId) {
    throw new Error("Für diesen Vorteil muss ein Zielspieler ausgewählt werden.");
  }
  if (["block_vote", "ignore_eliminated_vote"].includes(use.effect) && !use.voterPlayerId) {
    throw new Error("Für diesen Vorteil muss ein betroffener Wähler ausgewählt werden.");
  }
  if (use.effect === "tie_priority" && !use.tieOpponentPlayerId) {
    throw new Error("Für den Gleichstandsvorteil muss ein Gegner ausgewählt werden.");
  }
}

function getCandidateIdsForStage(snapshot: DemoSnapshot, stage: VoteStage): string[] | undefined {
  if (stage === "main") return undefined;
  return snapshot.runoffCandidateIdsByRound[snapshot.game.currentRound];
}

function resolveFinalWinnerWithLot(
  game: DemoSnapshot["game"],
  outcome: RoundOutcome,
): FinalWinnerResolution {
  const resolution = resolveFinalWinner(game, outcome);
  if (!resolution.requiresLot || resolution.tiedPlayerIds.length === 0) return resolution;
  const selected = resolution.tiedPlayerIds[secureRandomIndex(resolution.tiedPlayerIds.length)];
  return {
    winnerPlayerId: selected,
    requiresLot: false,
    tiedPlayerIds: resolution.tiedPlayerIds,
    reason: "lot",
  };
}

export interface DemoActions {
  reset(): void;
  advance(): void;
  drawInitialMillionaire(): string;
  drawReplacementMillionaire(): string;
  changePlayer(playerId: string, action: PlayerLifecycleAction): void;
  setMissionStatus(status: MissionStatus): void;
  setAdvantage(selection: DemoAdvantageSelection): void;
  setQuestioner(playerId: string): void;
  setQuestion(question: string, answer: boolean): void;
  submitVote(voterPlayerId: string, accusedPlayerId: string): void;
  fillMissingVotes(): void;
  evaluateCurrentVotes(): VoteEvaluation;
  startRunoff(candidatePlayerIds: string[]): void;
  finalizeCurrentRound(): RoundOutcome;
  submitRoleDecision(playerId: string, decision: RoleDecision): void;
  fillMissingRoleDecisions(): void;
  resolveRoleTransfer(): string;
}

export function useDemoGame(): {
  snapshot: DemoSnapshot;
  actions: DemoActions;
  connected: boolean;
} {
  const [snapshot, setSnapshot] = useState<DemoSnapshot>(() => createInitialDemoSnapshot());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setSnapshot(readSnapshot());
    setConnected(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (isDemoSnapshot(parsed)) setSnapshot(parsed);
      } catch {
        // Ungültige Fremddaten ignorieren.
      }
    };

    const handleCustom = (event: Event) => {
      const customEvent = event as CustomEvent<DemoSnapshot>;
      if (isDemoSnapshot(customEvent.detail)) setSnapshot(customEvent.detail);
    };

    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<DemoSnapshot>) => {
        if (isDemoSnapshot(event.data)) setSnapshot(event.data);
      };
    } catch {
      channel = undefined;
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANNEL_NAME, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANNEL_NAME, handleCustom);
      channel?.close();
    };
  }, []);

  const commit = useCallback((update: (current: DemoSnapshot) => DemoSnapshot) => {
    setSnapshot((current) => {
      const next = touch(update(current));
      persistSnapshot(next);
      return next;
    });
  }, []);

  const actions = useMemo<DemoActions>(() => ({
    reset() {
      const next = createInitialDemoSnapshot();
      persistSnapshot(next);
      setSnapshot(next);
    },

    advance() {
      commit((current) => {
        const round = current.game.currentRound;
        const phase = current.game.phase;
        if (phase === "lobby" && !current.game.millionairePlayerId) {
          throw new Error("Lose zuerst den Startmillionär zufällig aus.");
        }
        if (phase === "mission" && current.missionStatusByRound[round] === "unassigned") {
          throw new Error("Markiere die Mission zuerst als ausgegeben.");
        }
        if (phase === "question") {
          if (!current.questionerByRound[round]) throw new Error("Lege zuerst den Fragesteller fest.");
          if (!current.questionTextByRound[round]) throw new Error("Dokumentiere Frage und Antwort.");
        }
        if (
          phase === "mission_review" &&
          !["completed", "failed"].includes(current.missionStatusByRound[round] ?? "unassigned")
        ) {
          throw new Error("Bewerte die Mission eindeutig als erfüllt oder gescheitert.");
        }
        if (phase === "advantage") validateAdvantage(current);
        if (phase === "voting") {
          const stage = current.voteStageByRound[round] ?? "main";
          const submitted = Object.keys(getRoundVotes(current, round)[stage]).length;
          const required = getVotingPlayers(current.game).length;
          if (submitted !== required) throw new Error(`Es fehlen noch ${required - submitted} Stimmen.`);
        }
        if (phase === "evaluation") {
          throw new Error("Veröffentliche das geprüfte Ergebnis über die Auswertungsaktion.");
        }
        if (phase === "role_transfer" && !current.roleTransferResolvedByRound[round]) {
          throw new Error("Löse zuerst die geheime Rollenentscheidung auf.");
        }
        return {
          ...current,
          game: advanceGame(current.game),
          hostMessage: "Die Spielleitung hat die nächste Phase freigegeben.",
        };
      });
    },

    drawInitialMillionaire() {
      if (snapshot.game.phase !== "lobby") throw new Error("Die Startauslosung ist nur in der Lobby möglich.");
      if (snapshot.game.millionairePlayerId) throw new Error("Der Startmillionär wurde bereits ausgelost.");
      const draw = drawRandomMillionaire(snapshot.game);
      const next = touch({
        ...snapshot,
        game: draw.state,
        hostMessage: "Der Startmillionär wurde zufällig und geheim ausgelost.",
      });
      persistSnapshot(next);
      setSnapshot(next);
      return draw.selectedPlayerId;
    },

    drawReplacementMillionaire() {
      if (snapshot.game.millionairePlayerId) throw new Error("Es ist bereits ein aktiver Millionär festgelegt.");
      const draw = drawRandomMillionaire(snapshot.game);
      const next = touch({
        ...snapshot,
        game: draw.state,
        hostMessage: "Wegen eines Ausfalls wurde die Millionärsrolle zufällig neu ausgelost.",
      });
      persistSnapshot(next);
      setSnapshot(next);
      return draw.selectedPlayerId;
    },

    changePlayer(playerId, action) {
      commit((current) => {
        const result = applyPlayerLifecycleChange(current.game, {
          playerId,
          action,
          reason:
            action === "depart"
              ? "early_departure"
              : action === "disqualify"
                ? "rule_violation"
                : "host_decision",
        });
        return {
          ...current,
          game: result.state,
          votesByRound: sanitizeVotes(current, result.state),
          roleDecisionsByRound: sanitizeRoleDecisions(current, result.state),
          hostMessage:
            result.warnings[0] ??
            "Der Spielerstatus wurde geändert. Ungültige offene Stimmen wurden entfernt.",
        };
      });
    },

    setMissionStatus(status) {
      commit((current) => ({
        ...current,
        missionStatusByRound: {
          ...current.missionStatusByRound,
          [current.game.currentRound]: status,
        },
        hostMessage:
          status === "completed"
            ? "Die geheime Mission wurde als erfüllt bestätigt."
            : status === "failed"
              ? "Die geheime Mission wurde als gescheitert dokumentiert."
              : "Die geheime Mission wurde ausgegeben.",
      }));
    },

    setAdvantage(selection) {
      commit((current) => ({
        ...current,
        advantageByRound: {
          ...current.advantageByRound,
          [current.game.currentRound]: selection,
        },
        hostMessage: "Der Vorteil wurde verdeckt vorbereitet.",
      }));
    },

    setQuestioner(playerId) {
      commit((current) => ({
        ...current,
        questionerByRound: {
          ...current.questionerByRound,
          [current.game.currentRound]: playerId,
        },
        hostMessage: "Der Fragesteller wurde festgelegt.",
      }));
    },

    setQuestion(question, answer) {
      const normalized = question.trim();
      if (!normalized) throw new Error("Die Frage darf nicht leer sein.");
      commit((current) => ({
        ...current,
        questionTextByRound: {
          ...current.questionTextByRound,
          [current.game.currentRound]: normalized,
        },
        questionAnswerByRound: {
          ...current.questionAnswerByRound,
          [current.game.currentRound]: answer,
        },
        hostMessage: "Die exklusive Frage und Antwort wurden vertraulich gespeichert.",
      }));
    },

    submitVote(voterPlayerId, accusedPlayerId) {
      commit((current) => {
        if (current.game.phase !== "voting") throw new Error("Die Abstimmung ist aktuell nicht geöffnet.");
        const stage = current.voteStageByRound[current.game.currentRound] ?? "main";
        const voter = current.game.players.find((player) => player.id === voterPlayerId);
        if (!voter || !getPlayerCapabilities(voter).canVote) throw new Error("Dieser Spieler ist nicht stimmberechtigt.");
        const allowedTargets =
          stage === "runoff"
            ? current.runoffCandidateIdsByRound[current.game.currentRound] ?? []
            : getAccusablePlayers(current.game).map((player) => player.id);
        if (!allowedTargets.includes(accusedPlayerId)) throw new Error("Dieses Abstimmungsziel ist nicht zulässig.");
        const roundVotes = getRoundVotes(current, current.game.currentRound);
        return {
          ...current,
          votesByRound: {
            ...current.votesByRound,
            [current.game.currentRound]: {
              ...roundVotes,
              [stage]: {
                ...roundVotes[stage],
                [voterPlayerId]: accusedPlayerId,
              },
            },
          },
          hostMessage: stage === "runoff" ? "Eine Stichwahlstimme wurde abgegeben." : "Eine geheime Stimme wurde abgegeben.",
        };
      });
    },

    fillMissingVotes() {
      commit((current) => {
        const stage = current.voteStageByRound[current.game.currentRound] ?? "main";
        const candidateIds =
          stage === "runoff"
            ? current.runoffCandidateIdsByRound[current.game.currentRound] ?? []
            : getAccusablePlayers(current.game).map((candidate) => candidate.id);
        if (candidateIds.length === 0) throw new Error("Es gibt keine zulässigen Abstimmungsziele.");
        const roundVotes = getRoundVotes(current, current.game.currentRound);
        const completed = { ...roundVotes[stage] };
        for (const voter of getVotingPlayers(current.game)) {
          if (!completed[voter.id]) {
            completed[voter.id] = deterministicTarget(voter.id, candidateIds, current.game.millionairePlayerId);
          }
        }
        return {
          ...current,
          votesByRound: {
            ...current.votesByRound,
            [current.game.currentRound]: { ...roundVotes, [stage]: completed },
          },
          hostMessage: stage === "runoff" ? "Fehlende Stichwahlstimmen wurden ergänzt." : "Fehlende Stimmen wurden für den Test ergänzt.",
        };
      });
    },

    evaluateCurrentVotes() {
      const stage = snapshot.voteStageByRound[snapshot.game.currentRound] ?? "main";
      return evaluateVotes(snapshot.game, votesForStage(snapshot, stage), {
        stage,
        accusedPlayerIds: getCandidateIdsForStage(snapshot, stage),
        advantageUse: stage === "main" ? getAdvantageUse(snapshot) : undefined,
        requireAllVotes: true,
      });
    },

    startRunoff(candidatePlayerIds) {
      if ((snapshot.voteStageByRound[snapshot.game.currentRound] ?? "main") !== "main") {
        throw new Error("Die Stichwahl wurde bereits gestartet.");
      }
      if (candidatePlayerIds.length < 2) throw new Error("Eine Stichwahl benötigt mindestens zwei Gleichstehende.");
      const next = touch({
        ...snapshot,
        game: { ...snapshot.game, phase: "voting", revision: snapshot.game.revision + 1 },
        voteStageByRound: { ...snapshot.voteStageByRound, [snapshot.game.currentRound]: "runoff" },
        runoffCandidateIdsByRound: {
          ...snapshot.runoffCandidateIdsByRound,
          [snapshot.game.currentRound]: candidatePlayerIds,
        },
        hostMessage: "Gleichstand: Die geheime Stichwahl ist geöffnet. Vorteile gelten nicht erneut.",
      });
      persistSnapshot(next);
      setSnapshot(next);
    },

    finalizeCurrentRound() {
      const stage = snapshot.voteStageByRound[snapshot.game.currentRound] ?? "main";
      const advantageUse = getAdvantageUse(snapshot);
      let evaluation = evaluateVotes(snapshot.game, votesForStage(snapshot, stage), {
        stage,
        accusedPlayerIds: getCandidateIdsForStage(snapshot, stage),
        advantageUse: stage === "main" ? advantageUse : undefined,
        requireAllVotes: true,
      });
      if (evaluation.requiresRunoff && stage === "main") {
        throw new Error("Vor dem Rundenabschluss muss eine Stichwahl gestartet werden.");
      }
      if (evaluation.requiresRunoff && stage === "runoff") {
        const selected = evaluation.topPlayerIds[secureRandomIndex(evaluation.topPlayerIds.length)];
        evaluation = resolveTieByLot(evaluation, selected);
      }

      const finalized = finalizeRound(snapshot.game, votesForStage(snapshot, "main"), evaluation, advantageUse);
      const finalWinner =
        snapshot.game.currentRound === 4
          ? resolveFinalWinnerWithLot(finalized.state, finalized.outcome)
          : undefined;
      const next = touch({
        ...snapshot,
        game: finalized.state,
        lastOutcome: finalized.outcome,
        finalWinner,
        hostMessage:
          stage === "runoff" && evaluation.topPlayerIds.length > 1
            ? "Die Stichwahl endete erneut unentschieden. Das Los hat entschieden."
            : "Das Rundenergebnis wurde veröffentlicht.",
      });
      persistSnapshot(next);
      setSnapshot(next);
      return finalized.outcome;
    },

    submitRoleDecision(playerId, decision) {
      commit((current) => {
        if (current.game.phase !== "role_transfer") throw new Error("Die Rollenentscheidung ist nicht geöffnet.");
        const player = current.game.players.find((entry) => entry.id === playerId);
        if (!player || !getPlayerCapabilities(player).eligibleToWin) {
          throw new Error("Nur gewinnberechtigte Spieler geben eine Rollenentscheidung ab.");
        }
        const isMillionaire = playerId === current.game.millionairePlayerId;
        if (isMillionaire && decision === "not_millionaire") {
          throw new Error("Der Millionär muss den Korken behalten oder abgeben.");
        }
        if (!isMillionaire && decision !== "not_millionaire") {
          throw new Error("Nur der aktuelle Millionär kann über den Korken entscheiden.");
        }
        return {
          ...current,
          roleDecisionsByRound: {
            ...current.roleDecisionsByRound,
            [current.game.currentRound]: {
              ...(current.roleDecisionsByRound[current.game.currentRound] ?? {}),
              [playerId]: decision,
            },
          },
          hostMessage: "Eine geheime Rollenentscheidung wurde abgegeben.",
        };
      });
    },

    fillMissingRoleDecisions() {
      commit((current) => {
        if (current.game.phase !== "role_transfer") throw new Error("Es ist keine Rollenentscheidung geöffnet.");
        const decisions = { ...(current.roleDecisionsByRound[current.game.currentRound] ?? {}) };
        for (const player of current.game.players) {
          if (!getPlayerCapabilities(player).eligibleToWin || decisions[player.id]) continue;
          decisions[player.id] =
            player.id === current.game.millionairePlayerId ? "keep" : "not_millionaire";
        }
        return {
          ...current,
          roleDecisionsByRound: {
            ...current.roleDecisionsByRound,
            [current.game.currentRound]: decisions,
          },
          hostMessage: "Fehlende Rollenentscheidungen wurden für den Test ergänzt.",
        };
      });
    },

    resolveRoleTransfer() {
      if (snapshot.game.phase !== "role_transfer") throw new Error("Die Rollenauflösung ist aktuell nicht zulässig.");
      if (snapshot.roleTransferResolvedByRound[snapshot.game.currentRound]) {
        throw new Error("Diese Rollenentscheidung wurde bereits aufgelöst.");
      }
      const eligiblePlayers = snapshot.game.players.filter(
        (player) => getPlayerCapabilities(player).eligibleToWin,
      );
      const decisions = snapshot.roleDecisionsByRound[snapshot.game.currentRound] ?? {};
      const missing = eligiblePlayers.filter((player) => !decisions[player.id]);
      if (missing.length > 0) {
        throw new Error(`Es fehlen Rollenentscheidungen von: ${missing.map((player) => player.name).join(", ")}.`);
      }

      let nextGame = snapshot.game;
      let selectedPlayerId: string;
      let hostMessage: string;

      if (!snapshot.game.millionairePlayerId) {
        const draw = drawRandomMillionaire(snapshot.game);
        nextGame = draw.state;
        selectedPlayerId = draw.selectedPlayerId;
        hostMessage = "Nach der Enttarnung wurde der neue Millionär zufällig und geheim ausgelost.";
      } else {
        const millionaireId = snapshot.game.millionairePlayerId;
        const decision = decisions[millionaireId];
        if (decision === "release") {
          const draw = drawRandomMillionaire(snapshot.game, { excludePlayerId: millionaireId });
          nextGame = draw.state;
          selectedPlayerId = draw.selectedPlayerId;
          hostMessage = "Der Korken wurde abgegeben. Der Nachfolger wurde zufällig und geheim ausgelost.";
        } else if (decision === "keep") {
          selectedPlayerId = millionaireId;
          hostMessage = "Der aktuelle Millionär behält den Korken für die nächste Runde.";
        } else {
          throw new Error("Die Entscheidung des aktuellen Millionärs fehlt.");
        }
      }

      const next = touch({
        ...snapshot,
        game: nextGame,
        roleTransferResolvedByRound: {
          ...snapshot.roleTransferResolvedByRound,
          [snapshot.game.currentRound]: true,
        },
        hostMessage,
      });
      persistSnapshot(next);
      setSnapshot(next);
      return selectedPlayerId;
    },
  }), [commit, snapshot]);

  return { snapshot, actions, connected };
}

export function getPlayerStatusLabel(player: PlayerState): string {
  if (player.attendanceStatus === "departed") return "Abgereist";
  if (player.attendanceStatus === "temporarily_absent") return "Pausiert";
  if (player.winnerPoolStatus === "disqualified") return "Disqualifiziert";
  if (player.winnerPoolStatus === "eliminated") return "Aus Gewinnerpool";
  return "Aktiv";
}

export function getPlayerStatusClass(player: PlayerState): string {
  if (player.attendanceStatus === "departed") return "status-departed";
  if (player.attendanceStatus === "temporarily_absent") return "status-paused";
  if (player.winnerPoolStatus === "disqualified") return "status-disqualified";
  if (player.winnerPoolStatus === "eliminated") return "status-eliminated";
  return "status-active";
}

export function countEligiblePlayers(snapshot: DemoSnapshot): number {
  return snapshot.game.players.filter((player) => getPlayerCapabilities(player).eligibleToWin).length;
}

export function countVotingPlayers(snapshot: DemoSnapshot): number {
  return getVotingPlayers(snapshot.game).length;
}

export function getVoteCount(snapshot: DemoSnapshot): number {
  const stage = snapshot.voteStageByRound[snapshot.game.currentRound] ?? "main";
  return Object.keys(getRoundVotes(snapshot, snapshot.game.currentRound)[stage]).length;
}

export function getRoleDecisionCount(snapshot: DemoSnapshot): number {
  return Object.keys(snapshot.roleDecisionsByRound[snapshot.game.currentRound] ?? {}).length;
}

export function getRoleDecisionRequired(snapshot: DemoSnapshot): number {
  return snapshot.game.players.filter((player) => getPlayerCapabilities(player).eligibleToWin).length;
}
