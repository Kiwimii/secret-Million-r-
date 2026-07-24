"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ADVANTAGES } from "@/lib/game/catalog";
import type { MissionStatus, RoundNumber, RoundPhase, TeamCode } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";
import type { LiveGameSummary, LiveSessionIdentity } from "./types";

type JsonRecord = Record<string, unknown>;

export interface LivePublicRoundFlow {
  round: RoundNumber;
  challengeSelected: boolean;
  teamsDrawn: boolean;
  winningTeam?: TeamCode;
  winnerConfirmedAt?: string;
  questionerMemberId?: string;
  questionCompletedAt?: string;
}

export interface LiveHostMissionControl {
  status: MissionStatus;
  title: string;
  assignedMemberId: string;
  reviewedAt?: string;
}

export interface LiveHostAdvantageControl {
  catalogId: string;
  effect: string;
  title: string;
  description: string;
  playerInstructions: string;
  hostInstructions: string;
  limit: string;
  selectionMode: string;
  actorMemberId: string;
  targetMemberId?: string;
  secondaryTargetMemberId?: string;
  sourceTargetMemberId?: string;
  voterMemberId?: string;
  tieOpponentMemberId?: string;
  usedAt?: string;
  expiredAt?: string;
}

export interface LiveHostVote {
  voterMemberId: string;
  accusedMemberId: string;
  stage: "main" | "runoff";
  submittedAt: string;
}

export interface LiveHostRoundControl {
  round: RoundNumber;
  mission?: LiveHostMissionControl;
  advantage?: LiveHostAdvantageControl;
  votes: LiveHostVote[];
}

export interface AdvantageConfiguration {
  targetMemberId?: string;
  secondaryTargetMemberId?: string;
  sourceTargetMemberId?: string;
  voterMemberId?: string;
  tieOpponentMemberId?: string;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapPublicFlow(value: unknown): LivePublicRoundFlow | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as JsonRecord;
  return {
    round: Number(row.round ?? 1) as RoundNumber,
    challengeSelected: Boolean(row.challengeSelected),
    teamsDrawn: Boolean(row.teamsDrawn),
    winningTeam: optionalString(row.winningTeam) as TeamCode | undefined,
    winnerConfirmedAt: optionalString(row.winnerConfirmedAt),
    questionerMemberId: optionalString(row.questionerMemberId),
    questionCompletedAt: optionalString(row.questionCompletedAt),
  };
}

function mapHostControl(value: unknown): LiveHostRoundControl | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as JsonRecord;
  const missionRaw = row.mission && typeof row.mission === "object" ? row.mission as JsonRecord : undefined;
  const advantageRaw = row.advantage && typeof row.advantage === "object" ? row.advantage as JsonRecord : undefined;
  const votesRaw = Array.isArray(row.votes) ? row.votes : [];
  return {
    round: Number(row.round ?? 1) as RoundNumber,
    mission: missionRaw
      ? {
          status: String(missionRaw.status ?? "assigned") as MissionStatus,
          title: String(missionRaw.title ?? "Mission"),
          assignedMemberId: String(missionRaw.assignedMemberId ?? ""),
          reviewedAt: optionalString(missionRaw.reviewedAt),
        }
      : undefined,
    advantage: advantageRaw
      ? {
          catalogId: String(advantageRaw.catalogId ?? ""),
          effect: String(advantageRaw.effect ?? ""),
          title: String(advantageRaw.title ?? "Geheimer Vorteil"),
          description: String(advantageRaw.description ?? ""),
          playerInstructions: String(advantageRaw.playerInstructions ?? ""),
          hostInstructions: String(advantageRaw.hostInstructions ?? ""),
          limit: String(advantageRaw.limit ?? ""),
          selectionMode: String(advantageRaw.selectionMode ?? "none"),
          actorMemberId: String(advantageRaw.actorMemberId ?? ""),
          targetMemberId: optionalString(advantageRaw.targetMemberId),
          secondaryTargetMemberId: optionalString(advantageRaw.secondaryTargetMemberId),
          sourceTargetMemberId: optionalString(advantageRaw.sourceTargetMemberId),
          voterMemberId: optionalString(advantageRaw.voterMemberId),
          tieOpponentMemberId: optionalString(advantageRaw.tieOpponentMemberId),
          usedAt: optionalString(advantageRaw.usedAt),
          expiredAt: optionalString(advantageRaw.expiredAt),
        }
      : undefined,
    votes: votesRaw
      .filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === "object"))
      .map((entry) => ({
        voterMemberId: String(entry.voterMemberId ?? ""),
        accusedMemberId: String(entry.accusedMemberId ?? ""),
        stage: String(entry.stage ?? "main") as "main" | "runoff",
        submittedAt: String(entry.submittedAt ?? ""),
      })),
  };
}

export function useLiveRoundControl(
  identity: LiveSessionIdentity | undefined,
  summary: LiveGameSummary | undefined,
  baseRefresh: () => Promise<void>,
) {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [publicFlow, setPublicFlow] = useState<LivePublicRoundFlow>();
  const [hostControl, setHostControl] = useState<LiveHostRoundControl>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const rpc = useCallback(async (name: string, args: Record<string, unknown>) => {
    const { data, error: rpcError } = await getClient().rpc(name, args);
    if (rpcError) throw new Error(rpcError.message);
    return data;
  }, [getClient]);

  const refresh = useCallback(async () => {
    if (!identity || !summary) {
      setPublicFlow(undefined);
      setHostControl(undefined);
      return;
    }
    setLoading(true);
    try {
      const publicData = await rpc("get_live_public_round_flow", {
        target_game_id: identity.gameId,
      });
      setPublicFlow(mapPublicFlow(publicData));
      if (identity.accessRole === "host") {
        const hostData = await rpc("get_live_host_round_control", {
          target_game_id: identity.gameId,
        });
        setHostControl(mapHostControl(hostData));
      } else {
        setHostControl(undefined);
      }
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Rundensteuerung konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [identity, rpc, summary]);

  useEffect(() => {
    void refresh();
  }, [refresh, summary?.revision, summary?.phase, summary?.currentRound]);

  const runAndRefresh = useCallback(async (name: string, args: Record<string, unknown>) => {
    setLoading(true);
    try {
      const result = await rpc(name, args);
      await baseRefresh();
      await refresh();
      setError(undefined);
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Aktion fehlgeschlagen.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [baseRefresh, refresh, rpc]);

  const selectAdvantage = useCallback(async (round: RoundNumber, advantageId: string) => {
    if (!identity || identity.accessRole !== "host") throw new Error("Nur André darf Vorteile auswählen.");
    const advantage = ADVANTAGES.find((entry) => entry.id === advantageId);
    if (!advantage) throw new Error("Vorteil nicht gefunden.");
    await runAndRefresh("select_live_round_advantage", {
      target_game_id: identity.gameId,
      target_round: round,
      advantage_catalog_id: advantage.id,
      advantage_effect: advantage.effect,
      advantage_title: advantage.title,
      advantage_description: advantage.description,
      advantage_player_instructions: advantage.playerInstructions,
      advantage_host_instructions: advantage.hostInstructions,
      advantage_limit: advantage.limit,
      advantage_selection_mode: advantage.selectionMode,
    });
  }, [identity, runAndRefresh]);

  const markMissionStatus = useCallback(async (round: RoundNumber, status: "completed" | "failed") => {
    if (!identity || identity.accessRole !== "host") throw new Error("Nur André darf Missionen bewerten.");
    await runAndRefresh("mark_live_mission_status", {
      target_game_id: identity.gameId,
      target_round: round,
      requested_status: status,
    });
  }, [identity, runAndRefresh]);

  const configureAdvantage = useCallback(async (round: RoundNumber, config: AdvantageConfiguration) => {
    if (!identity || identity.accessRole !== "host") throw new Error("Nur André darf Vorteile konfigurieren.");
    await runAndRefresh("configure_live_advantage", {
      target_game_id: identity.gameId,
      target_round: round,
      requested_target_member_id: config.targetMemberId ?? null,
      requested_secondary_target_member_id: config.secondaryTargetMemberId ?? null,
      requested_source_target_member_id: config.sourceTargetMemberId ?? null,
      requested_voter_member_id: config.voterMemberId ?? null,
      requested_tie_opponent_member_id: config.tieOpponentMemberId ?? null,
    });
  }, [identity, runAndRefresh]);

  const selectQuestioner = useCallback(async (memberId: string) => {
    if (!identity || identity.accessRole !== "player") throw new Error("Kein Spielerprofil aktiv.");
    await runAndRefresh("select_live_questioner", {
      target_game_id: identity.gameId,
      requested_questioner_member_id: memberId,
    });
  }, [identity, runAndRefresh]);

  const completeQuestion = useCallback(async (round: RoundNumber) => {
    if (!identity || identity.accessRole !== "host") throw new Error("Nur André darf die Frage abhaken.");
    await runAndRefresh("complete_live_question", {
      target_game_id: identity.gameId,
      target_round: round,
    });
  }, [identity, runAndRefresh]);

  const completePlayerStep = useCallback(async (memberId: string, step: string) => {
    if (!identity || identity.accessRole !== "host") throw new Error("Nur André darf technische Schritte abschließen.");
    await runAndRefresh("host_complete_player_step", {
      target_game_id: identity.gameId,
      target_member_id: memberId,
      requested_step: step,
    });
  }, [identity, runAndRefresh]);

  const forcePhase = useCallback(async (round: RoundNumber, phase: RoundPhase) => {
    if (!identity || identity.accessRole !== "host") throw new Error("Nur André darf die Notfallsteuerung verwenden.");
    await runAndRefresh("force_live_game_phase", {
      target_game_id: identity.gameId,
      target_round: round,
      target_phase: phase,
    });
  }, [identity, runAndRefresh]);

  const reconnect = useCallback(async () => {
    await baseRefresh();
    await refresh();
  }, [baseRefresh, refresh]);

  return {
    publicFlow,
    hostControl,
    error,
    loading,
    refresh,
    reconnect,
    selectAdvantage,
    markMissionStatus,
    configureAdvantage,
    selectQuestioner,
    completeQuestion,
    completePlayerStep,
    forcePhase,
  };
}
