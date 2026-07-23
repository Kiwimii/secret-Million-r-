"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceGame,
  applyPlayerLifecycleChange,
  evaluateVotes,
  finalizeRound,
  getAccusablePlayers,
  getPlayerCapabilities,
  getVotingPlayers,
  resolveTieByLot,
  setMillionaire,
} from "@/lib/game/engine";
import type {
  GameState,
  MissionStatus,
  PlayerLifecycleAction,
  PlayerState,
  RoundNumber,
  RoundOutcome,
  Vote,
  VoteEvaluation,
} from "@/lib/game/types";

const STORAGE_KEY = "secret-millionaer.demo.v2";
const CHANNEL_NAME = "secret-millionaer-demo";

export interface DemoSnapshot {
  game: GameState;
  votesByRound: Partial<Record<RoundNumber, Record<string, string>>>;
  missionStatusByRound: Partial<Record<RoundNumber, MissionStatus>>;
  advantageIdByRound: Partial<Record<RoundNumber, string>>;
  lastOutcome?: RoundOutcome;
  hostMessage: string;
  updatedAt: string;
}

const DEMO_PLAYERS = ["Schubi", "Lars", "Danny", "Masl", "Rene", "Gregor", "Felix"] as const;

function createPlayer(name: string, index: number): PlayerState {
  return {
    id: `player-${index + 1}`,
    name,
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role: index === 1 ? "millionaire" : "investigator",
    points: 0,
    correctGuesses: 0,
  };
}

export function createInitialDemoSnapshot(): DemoSnapshot {
  return {
    game: {
      id: "blaue-adria-demo",
      currentRound: 1,
      phase: "lobby",
      players: DEMO_PLAYERS.map(createPlayer),
      millionairePlayerId: "player-2",
      revision: 1,
      roundOutcomes: [],
    },
    votesByRound: {},
    missionStatusByRound: {
      1: "unassigned",
      2: "unassigned",
      3: "unassigned",
      4: "unassigned",
    },
    advantageIdByRound: {
      1: "r1-double-vote",
      2: "r2-block-vote",
      3: "r3-two-shadow-votes",
      4: "r4-redirect",
    },
    hostMessage: "Willkommen in der mobilen Testversion.",
    updatedAt: new Date().toISOString(),
  };
}

function isSnapshot(value: unknown): value is DemoSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoSnapshot>;
  return Boolean(candidate.game && Array.isArray(candidate.game.players));
}

function readSnapshot(): DemoSnapshot {
  if (typeof window === "undefined") return createInitialDemoSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDemoSnapshot();
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : createInitialDemoSnapshot();
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
    // BroadcastChannel ist eine Komfortfunktion. storage/custom event reicht als Fallback.
  }
}

function touch(snapshot: DemoSnapshot): DemoSnapshot {
  return { ...snapshot, updatedAt: new Date().toISOString() };
}

function votesForRound(snapshot: DemoSnapshot, round: RoundNumber): Vote[] {
  const storedVotes = snapshot.votesByRound[round] ?? {};
  return Object.entries(storedVotes).map(([voterPlayerId, accusedPlayerId]) => ({
    voterPlayerId,
    accusedPlayerId,
    stage: "main" as const,
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

export interface DemoActions {
  reset(): void;
  setHostMessage(message: string): void;
  advance(): void;
  changePlayer(playerId: string, action: PlayerLifecycleAction): void;
  assignMillionaire(playerId: string): void;
  setMissionStatus(status: MissionStatus): void;
  setAdvantage(advantageId: string): void;
  submitVote(voterPlayerId: string, accusedPlayerId: string): void;
  fillMissingVotes(): void;
  evaluateCurrentVotes(): VoteEvaluation;
  finalizeCurrentRound(): RoundOutcome;
}

export function useDemoStore(): {
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
        if (isSnapshot(parsed)) setSnapshot(parsed);
      } catch {
        // Ungültige Fremddaten ignorieren.
      }
    };

    const handleCustom = (event: Event) => {
      const customEvent = event as CustomEvent<DemoSnapshot>;
      if (isSnapshot(customEvent.detail)) setSnapshot(customEvent.detail);
    };

    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<DemoSnapshot>) => {
        if (isSnapshot(event.data)) setSnapshot(event.data);
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
    setHostMessage(message) {
      commit((current) => ({ ...current, hostMessage: message }));
    },
    advance() {
      commit((current) => ({
        ...current,
        game: advanceGame(current.game),
        hostMessage: "Die Spielleitung hat die nächste Phase freigegeben.",
      }));
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
          hostMessage:
            result.warnings[0] ?? "Die Spielleitung hat den Spielerstatus geändert.",
        };
      });
    },
    assignMillionaire(playerId) {
      commit((current) => ({
        ...current,
        game: setMillionaire(current.game, playerId),
        hostMessage: "Die Millionärsrolle wurde durch die Spielleitung neu bestätigt.",
      }));
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
              : "Die geheime Mission wurde vorbereitet.",
      }));
    },
    setAdvantage(advantageId) {
      commit((current) => ({
        ...current,
        advantageIdByRound: {
          ...current.advantageIdByRound,
          [current.game.currentRound]: advantageId,
        },
      }));
    },
    submitVote(voterPlayerId, accusedPlayerId) {
      commit((current) => ({
        ...current,
        votesByRound: {
          ...current.votesByRound,
          [current.game.currentRound]: {
            ...(current.votesByRound[current.game.currentRound] ?? {}),
            [voterPlayerId]: accusedPlayerId,
          },
        },
        hostMessage: "Eine geheime Stimme wurde abgegeben.",
      }));
    },
    fillMissingVotes() {
      commit((current) => {
        const voters = getVotingPlayers(current.game);
        const candidates = getAccusablePlayers(current.game);
        const candidateIds = candidates.map((candidate) => candidate.id);
        const existing = current.votesByRound[current.game.currentRound] ?? {};
        const completed = { ...existing };
        for (const voter of voters) {
          if (!completed[voter.id]) {
            completed[voter.id] = deterministicTarget(
              voter.id,
              candidateIds,
              current.game.millionairePlayerId,
            );
          }
        }
        return {
          ...current,
          votesByRound: {
            ...current.votesByRound,
            [current.game.currentRound]: completed,
          },
          hostMessage: "Fehlende Stimmen wurden für den Test automatisch ergänzt.",
        };
      });
    },
    evaluateCurrentVotes() {
      return evaluateVotes(snapshot.game, votesForRound(snapshot, snapshot.game.currentRound), {
        requireAllVotes: true,
      });
    },
    finalizeCurrentRound() {
      const votes = votesForRound(snapshot, snapshot.game.currentRound);
      let evaluation = evaluateVotes(snapshot.game, votes, { requireAllVotes: true });
      if (evaluation.requiresRunoff) {
        evaluation = resolveTieByLot(evaluation, evaluation.topPlayerIds[0]);
      }
      const finalized = finalizeRound(snapshot.game, votes, evaluation);
      const next = touch({
        ...snapshot,
        game: finalized.state,
        lastOutcome: finalized.outcome,
        hostMessage: "Das Rundenergebnis wurde veröffentlicht.",
      });
      persistSnapshot(next);
      setSnapshot(next);
      return finalized.outcome;
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

export function countEligiblePlayers(game: GameState): number {
  return game.players.filter((player) => getPlayerCapabilities(player).eligibleToWin).length;
}

export function countVotingPlayers(game: GameState): number {
  return game.players.filter((player) => getPlayerCapabilities(player).canVote).length;
}
