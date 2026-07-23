"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient, User } from "@supabase/supabase-js";
import { CHALLENGES } from "@/lib/game/challenges";
import { getRoundPhaseSequence } from "@/lib/game/constants";
import { MISSIONS } from "@/lib/game/catalog";
import type { RoundNumber, RoundPhase, TeamCode } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  LiveChallengeRound,
  LiveGameSummary,
  LiveLobbyMember,
  LiveMissionSelection,
  LivePlayerProgress,
  LivePresencePayload,
  LivePrivateState,
  LiveProgressPatch,
  LiveSessionIdentity,
} from "./types";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";
const HEARTBEAT_MS = 20_000;

type RpcRow = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function optionalString(value: unknown): string | undefined {
  const result = asString(value);
  return result || undefined;
}

function readStoredIdentity(): LiveSessionIdentity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<LiveSessionIdentity>;
    if (
      (parsed.accessRole === "host" || parsed.accessRole === "player") &&
      typeof parsed.joinCode === "string" &&
      typeof parsed.gameId === "string"
    ) {
      return parsed as LiveSessionIdentity;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function storeIdentity(identity?: LiveSessionIdentity) {
  if (typeof window === "undefined") return;
  if (!identity) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(identity));
}

async function ensureAnonymousUser(client: SupabaseClient): Promise<User> {
  const {
    data: { session },
  } = await client.auth.getSession();
  if (session?.user) return session.user;

  const { data, error } = await client.auth.signInAnonymously({
    options: { data: { application: "secret-millionaer" } },
  });
  if (error || !data.user) {
    throw new Error(
      error?.message.includes("Anonymous sign-ins are disabled")
        ? "Anonyme Gerätesitzungen sind im Supabase-Projekt noch nicht aktiviert."
        : error?.message ?? "Die Gerätesitzung konnte nicht erstellt werden.",
    );
  }
  return data.user;
}

async function rpcData(
  client: SupabaseClient,
  functionName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await client.rpc(functionName, args);
  if (error) throw new Error(error.message);
  return data;
}

async function rpcRows(
  client: SupabaseClient,
  functionName: string,
  args: Record<string, unknown>,
): Promise<RpcRow[]> {
  const data = await rpcData(client, functionName, args);
  if (Array.isArray(data)) return data as RpcRow[];
  if (data && typeof data === "object") return [data as RpcRow];
  return [];
}

function mapSummary(row: RpcRow): LiveGameSummary {
  return {
    gameId: asString(row.game_id),
    title: asString(row.title),
    joinCode: asString(row.join_code),
    currentRound: Number(row.current_round) as RoundNumber,
    phase: asString(row.phase) as RoundPhase,
    revision: Number(row.revision),
    acceptingPlayers: Boolean(row.accepting_players),
    isHost: Boolean(row.is_host),
    memberId: optionalString(row.member_id),
  };
}

function mapLobbyMember(row: RpcRow): LiveLobbyMember {
  return {
    memberId: asString(row.member_id),
    displayName: asString(row.display_name),
    avatarPath: optionalString(row.avatar_path),
    attendanceStatus: asString(row.attendance_status) as LiveLobbyMember["attendanceStatus"],
    winnerPoolStatus: asString(row.winner_pool_status) as LiveLobbyMember["winnerPoolStatus"],
    profileCompleted: Boolean(row.profile_completed),
    challengeTeam: optionalString(row.challenge_team) as TeamCode | undefined,
  };
}

function mapProgress(row: RpcRow, onlineIds: Set<string>): LivePlayerProgress {
  const memberId = asString(row.member_id);
  return {
    memberId,
    displayName: asString(row.display_name),
    avatarPath: optionalString(row.avatar_path),
    attendanceStatus: asString(row.attendance_status) as LivePlayerProgress["attendanceStatus"],
    winnerPoolStatus: asString(row.winner_pool_status) as LivePlayerProgress["winnerPoolStatus"],
    profileCompleted: true,
    challengeTeam: optionalString(row.challenge_team) as TeamCode | undefined,
    screenKey: asString(row.screen_key || "offline"),
    stepKey: asString(row.step_key || "noch_nicht_geöffnet"),
    phaseSeen: asString(row.phase_seen || "lobby") as RoundPhase,
    roleRevealed: Boolean(row.role_revealed),
    missionOpened: Boolean(row.mission_opened),
    advantageOpened: Boolean(row.advantage_opened),
    challengeBriefingOpened: Boolean(row.challenge_briefing_opened),
    voteSubmitted: Boolean(row.vote_submitted),
    roleDecisionSubmitted: Boolean(row.role_decision_submitted),
    lastSeenAt: optionalString(row.last_seen_at),
    currentRole: asString(row.current_role || "none") as LivePlayerProgress["currentRole"],
    online: onlineIds.has(memberId),
  };
}

function mapChallenge(row?: RpcRow | null): LiveChallengeRound | undefined {
  if (!row) return undefined;
  return {
    catalogId: asString(row.catalog_id),
    title: asString(row.title_snapshot),
    publicName: asString(row.public_name_snapshot),
    playerBriefing: asString(row.player_briefing_snapshot),
    hostInstructions: asString(row.host_instructions_snapshot),
    duration: asString(row.duration_snapshot),
    material: Array.isArray(row.material_snapshot)
      ? row.material_snapshot.map((item) => asString(item))
      : [],
    winCondition: asString(row.win_condition_snapshot),
    safetyNote: asString(row.safety_note_snapshot),
    winningTeam: optionalString(row.winning_team) as TeamCode | undefined,
  };
}

function mapMission(row: RpcRow): LiveMissionSelection {
  return {
    catalogId: asString(row.catalog_id),
    title: asString(row.title_snapshot),
    task: asString(row.task_snapshot),
    successCriteria: asString(row.success_criteria_snapshot),
    timeWindow: asString(row.time_window_snapshot),
  };
}

function getNextLiveStep(
  currentRound: RoundNumber,
  currentPhase: RoundPhase,
): { round: RoundNumber; phase: RoundPhase } {
  if (currentPhase === "lobby") return { round: 1, phase: "role_reveal" };
  if (currentPhase === "finished") return { round: currentRound, phase: "finished" };
  const sequence = getRoundPhaseSequence(currentRound);
  const index = sequence.indexOf(currentPhase);
  if (index >= 0 && index < sequence.length - 1) {
    return { round: currentRound, phase: sequence[index + 1] };
  }
  if (currentRound < 4) {
    return { round: (currentRound + 1) as RoundNumber, phase: "role_reveal" };
  }
  return { round: 4, phase: "finished" };
}

export interface LiveGameController {
  configured: boolean;
  ready: boolean;
  loading: boolean;
  error?: string;
  userId?: string;
  identity?: LiveSessionIdentity;
  summary?: LiveGameSummary;
  lobby: LiveLobbyMember[];
  playerProgress: LivePlayerProgress[];
  challenge?: LiveChallengeRound;
  missionSelections: Partial<Record<RoundNumber, LiveMissionSelection>>;
  privateState?: LivePrivateState;
  onlineMemberIds: Set<string>;
  createGame(title: string, pin: string): Promise<LiveSessionIdentity>;
  joinGame(code: string, name: string, pin: string, avatarPath?: string): Promise<LiveSessionIdentity>;
  resumeHost(code: string, pin: string): Promise<LiveSessionIdentity>;
  refresh(): Promise<void>;
  clearSession(): Promise<void>;
  updateProgress(patch: LiveProgressPatch): Promise<void>;
  advancePhase(): Promise<void>;
  drawMillionaire(excludedMemberId?: string): Promise<string>;
  selectMission(round: RoundNumber, missionId: string): Promise<void>;
  selectChallenge(round: RoundNumber, challengeId: string): Promise<void>;
  drawTeams(round: RoundNumber): Promise<void>;
  confirmChallengeWinner(round: RoundNumber, team: TeamCode): Promise<void>;
  revealRole(): Promise<void>;
  submitVote(accusedMemberId: string): Promise<void>;
}

export function useLiveGame(): LiveGameController {
  const configured = isSupabaseConfigured();
  const clientRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const identityRef = useRef<LiveSessionIdentity | undefined>(undefined);
  const progressRef = useRef<LiveProgressPatch>({
    screenKey: "entry",
    stepKey: "loading",
    phaseSeen: "lobby",
  });

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [identity, setIdentityState] = useState<LiveSessionIdentity>();
  const [summary, setSummary] = useState<LiveGameSummary>();
  const [lobby, setLobby] = useState<LiveLobbyMember[]>([]);
  const [rawProgress, setRawProgress] = useState<RpcRow[]>([]);
  const [onlineMemberIds, setOnlineMemberIds] = useState<Set<string>>(new Set());
  const [challenge, setChallenge] = useState<LiveChallengeRound>();
  const [missionSelections, setMissionSelections] = useState<
    Partial<Record<RoundNumber, LiveMissionSelection>>
  >({});
  const [privateState, setPrivateState] = useState<LivePrivateState>();

  const setIdentity = useCallback((next?: LiveSessionIdentity) => {
    identityRef.current = next;
    setIdentityState(next);
    storeIdentity(next);
  }, []);

  const refreshForIdentity = useCallback(
    async (requestedIdentity?: LiveSessionIdentity) => {
      const activeIdentity = requestedIdentity ?? identityRef.current;
      const client = clientRef.current;
      if (!client || !activeIdentity) return;

      const summaryRows = await rpcRows(client, "lookup_live_game", {
        raw_join_code: activeIdentity.joinCode,
      });
      const nextSummary = summaryRows[0] ? mapSummary(summaryRows[0]) : undefined;
      if (!nextSummary) {
        setIdentity(undefined);
        throw new Error("Die gespeicherte Partie existiert nicht mehr.");
      }
      setSummary(nextSummary);

      const lobbyRows = await rpcRows(client, "get_public_lobby_members", {
        target_game_id: activeIdentity.gameId,
      });
      setLobby(lobbyRows.map(mapLobbyMember));

      const { data: challengeData, error: challengeError } = await client
        .from("challenge_rounds")
        .select("*")
        .eq("game_id", activeIdentity.gameId)
        .eq("round_number", nextSummary.currentRound)
        .maybeSingle();
      if (challengeError) throw new Error(challengeError.message);
      setChallenge(mapChallenge(challengeData as RpcRow | null));

      if (activeIdentity.accessRole === "host") {
        setRawProgress(
          await rpcRows(client, "get_host_player_progress", {
            target_game_id: activeIdentity.gameId,
          }),
        );
        const { data: missionData, error: missionError } = await client
          .from("round_mission_selections")
          .select("*")
          .eq("game_id", activeIdentity.gameId)
          .order("round_number");
        if (missionError) throw new Error(missionError.message);
        const selections: Partial<Record<RoundNumber, LiveMissionSelection>> = {};
        for (const row of (missionData ?? []) as RpcRow[]) {
          selections[Number(row.round_number) as RoundNumber] = mapMission(row);
        }
        setMissionSelections(selections);
        setPrivateState(undefined);
      } else {
        const privateData = await rpcData(client, "get_live_private_state", {
          target_game_id: activeIdentity.gameId,
        });
        setPrivateState(
          privateData && typeof privateData === "object"
            ? (privateData as unknown as LivePrivateState)
            : undefined,
        );
        setRawProgress([]);
        setMissionSelections({});
      }
    },
    [setIdentity],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await refreshForIdentity();
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [refreshForIdentity]);

  useEffect(() => {
    let cancelled = false;
    if (!configured) {
      setError("Die öffentliche Supabase-Konfiguration fehlt im Browser-Build.");
      setLoading(false);
      setReady(true);
      return;
    }

    const client = createClient();
    clientRef.current = client;
    void (async () => {
      try {
        const user = await ensureAnonymousUser(client);
        if (cancelled) return;
        setUserId(user.id);
        const stored = readStoredIdentity();
        if (stored) {
          setIdentity(stored);
          await refreshForIdentity(stored);
        }
        setError(undefined);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Live-Verbindung fehlgeschlagen.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, refreshForIdentity, setIdentity]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !identity || !userId) return;

    let cancelled = false;
    let activeChannel: RealtimeChannel | null = null;
    void (async () => {
      await client.realtime.setAuth();
      if (cancelled) return;

      const channel = client.channel(`game:${identity.gameId}`, {
        config: { private: true, presence: { key: userId } },
      });
      activeChannel = channel;
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<LivePresencePayload>();
          const ids = new Set<string>();
          for (const entries of Object.values(state)) {
            for (const entry of entries) {
              if (entry.memberId) ids.add(entry.memberId);
            }
          }
          setOnlineMemberIds(ids);
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_game_updates",
            filter: `game_id=eq.${identity.gameId}`,
          },
          () => void refreshForIdentity(identity),
        )
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          const progress = progressRef.current;
          await channel.track({
            userId,
            memberId: identity.memberId,
            accessRole: identity.accessRole,
            screenKey: progress.screenKey,
            stepKey: progress.stepKey,
            phaseSeen: progress.phaseSeen,
            trackedAt: new Date().toISOString(),
          } satisfies LivePresencePayload);
        });
    })();

    return () => {
      cancelled = true;
      if (activeChannel) {
        void activeChannel.untrack();
        void client.removeChannel(activeChannel);
        if (channelRef.current === activeChannel) channelRef.current = null;
      }
    };
  }, [identity, refreshForIdentity, userId]);

  useEffect(() => {
    if (!identity || identity.accessRole !== "player") return;
    const timer = window.setInterval(() => {
      const client = clientRef.current;
      if (!client) return;
      const patch = progressRef.current;
      void rpcRows(client, "update_own_player_progress", {
        target_game_id: identity.gameId,
        requested_screen_key: patch.screenKey,
        requested_step_key: patch.stepKey,
        requested_phase_seen: patch.phaseSeen,
        requested_role_revealed: patch.roleRevealed ?? null,
        requested_mission_opened: patch.missionOpened ?? null,
        requested_advantage_opened: patch.advantageOpened ?? null,
        requested_challenge_opened: patch.challengeBriefingOpened ?? null,
        requested_vote_submitted: patch.voteSubmitted ?? null,
        requested_role_decision_submitted: patch.roleDecisionSubmitted ?? null,
      }).catch(() => undefined);
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [identity]);

  const requireClient = useCallback(() => {
    const client = clientRef.current;
    if (!client) throw new Error("Live-Verbindung ist noch nicht bereit.");
    return client;
  }, []);

  const requireHost = useCallback(() => {
    const activeIdentity = identityRef.current;
    if (!activeIdentity || activeIdentity.accessRole !== "host") {
      throw new Error("Nur die aktive Spielleitung darf diese Aktion ausführen.");
    }
    return activeIdentity;
  }, []);

  const requirePlayer = useCallback(() => {
    const activeIdentity = identityRef.current;
    if (!activeIdentity || activeIdentity.accessRole !== "player") {
      throw new Error("Kein Spielerprofil ist aktiv.");
    }
    return activeIdentity;
  }, []);

  const createGame = useCallback(async (title: string, pin: string) => {
    const client = requireClient();
    const rows = await rpcRows(client, "create_live_game", {
      game_title: title,
      host_pin: pin,
    });
    const row = rows[0];
    if (!row) throw new Error("Die Partie konnte nicht erstellt werden.");
    const next: LiveSessionIdentity = {
      accessRole: "host",
      gameId: asString(row.game_id),
      joinCode: asString(row.join_code),
    };
    setIdentity(next);
    await refreshForIdentity(next);
    return next;
  }, [refreshForIdentity, requireClient, setIdentity]);

  const joinGame = useCallback(async (
    code: string,
    name: string,
    pin: string,
    avatarPath?: string,
  ) => {
    const client = requireClient();
    const rows = await rpcRows(client, "join_or_resume_live_game", {
      raw_join_code: code,
      requested_display_name: name,
      player_pin: pin,
      requested_avatar_path: avatarPath ?? null,
    });
    const row = rows[0];
    if (!row) throw new Error("Der Beitritt konnte nicht abgeschlossen werden.");
    const next: LiveSessionIdentity = {
      accessRole: "player",
      gameId: asString(row.game_id),
      memberId: asString(row.member_id),
      joinCode: code.replace(/\D/g, ""),
    };
    setIdentity(next);
    await refreshForIdentity(next);
    return next;
  }, [refreshForIdentity, requireClient, setIdentity]);

  const resumeHost = useCallback(async (code: string, pin: string) => {
    const client = requireClient();
    const data = await rpcData(client, "resume_live_host", {
      raw_join_code: code,
      host_pin: pin,
    });
    const next: LiveSessionIdentity = {
      accessRole: "host",
      gameId: asString(data),
      joinCode: code.replace(/\D/g, ""),
    };
    setIdentity(next);
    await refreshForIdentity(next);
    return next;
  }, [refreshForIdentity, requireClient, setIdentity]);

  const clearSession = useCallback(async () => {
    const client = clientRef.current;
    const channel = channelRef.current;
    if (client && channel) {
      await channel.untrack();
      await client.removeChannel(channel);
    }
    channelRef.current = null;
    setIdentity(undefined);
    setSummary(undefined);
    setLobby([]);
    setRawProgress([]);
    setOnlineMemberIds(new Set());
    setChallenge(undefined);
    setMissionSelections({});
    setPrivateState(undefined);
  }, [setIdentity]);

  const updateProgress = useCallback(async (patch: LiveProgressPatch) => {
    const client = requireClient();
    const activeIdentity = requirePlayer();
    progressRef.current = { ...progressRef.current, ...patch };
    await rpcRows(client, "update_own_player_progress", {
      target_game_id: activeIdentity.gameId,
      requested_screen_key: patch.screenKey,
      requested_step_key: patch.stepKey,
      requested_phase_seen: patch.phaseSeen,
      requested_role_revealed: patch.roleRevealed ?? null,
      requested_mission_opened: patch.missionOpened ?? null,
      requested_advantage_opened: patch.advantageOpened ?? null,
      requested_challenge_opened: patch.challengeBriefingOpened ?? null,
      requested_vote_submitted: patch.voteSubmitted ?? null,
      requested_role_decision_submitted: patch.roleDecisionSubmitted ?? null,
    });
    await channelRef.current?.track({
      userId: userId ?? "unknown",
      memberId: activeIdentity.memberId,
      accessRole: "player",
      screenKey: patch.screenKey,
      stepKey: patch.stepKey,
      phaseSeen: patch.phaseSeen,
      trackedAt: new Date().toISOString(),
    } satisfies LivePresencePayload);
  }, [requireClient, requirePlayer, userId]);

  const advancePhase = useCallback(async () => {
    const client = requireClient();
    const activeIdentity = requireHost();
    if (!summary) throw new Error("Der öffentliche Spielstand ist noch nicht geladen.");
    const next = getNextLiveStep(summary.currentRound, summary.phase);
    await rpcData(client, "set_live_game_phase", {
      target_game_id: activeIdentity.gameId,
      target_round: next.round,
      target_phase: next.phase,
      expected_revision: summary.revision,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requireHost, summary]);

  const drawMillionaire = useCallback(async (excludedMemberId?: string) => {
    const client = requireClient();
    const activeIdentity = requireHost();
    const data = await rpcData(client, "draw_random_millionaire", {
      target_game_id: activeIdentity.gameId,
      excluded_member_id: excludedMemberId ?? null,
    });
    await refreshForIdentity(activeIdentity);
    return asString(data);
  }, [refreshForIdentity, requireClient, requireHost]);

  const selectMission = useCallback(async (round: RoundNumber, missionId: string) => {
    const client = requireClient();
    const activeIdentity = requireHost();
    const mission = MISSIONS.find((entry) => entry.id === missionId);
    if (!mission) throw new Error("Mission nicht gefunden.");
    await rpcData(client, "select_live_round_mission", {
      target_game_id: activeIdentity.gameId,
      target_round: round,
      mission_catalog_id: mission.id,
      mission_title: mission.title,
      mission_task: mission.task,
      mission_success_criteria: mission.successCriteria,
      mission_time_window: mission.timeWindow,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requireHost]);

  const selectChallenge = useCallback(async (round: RoundNumber, challengeId: string) => {
    const client = requireClient();
    const activeIdentity = requireHost();
    const challengeDefinition = CHALLENGES.find((entry) => entry.id === challengeId);
    if (!challengeDefinition) throw new Error("Challenge nicht gefunden.");
    await rpcData(client, "select_live_challenge", {
      target_game_id: activeIdentity.gameId,
      target_round: round,
      challenge_catalog_id: challengeDefinition.id,
      challenge_title: challengeDefinition.title,
      challenge_public_name: challengeDefinition.publicName,
      challenge_player_briefing: challengeDefinition.playerBriefing,
      challenge_host_instructions: challengeDefinition.hostInstructions,
      challenge_duration: challengeDefinition.duration,
      challenge_material: challengeDefinition.material,
      challenge_win_condition: challengeDefinition.winCondition,
      challenge_safety_note: challengeDefinition.safetyNote,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requireHost]);

  const drawTeams = useCallback(async (round: RoundNumber) => {
    const client = requireClient();
    const activeIdentity = requireHost();
    await rpcData(client, "draw_live_challenge_teams", {
      target_game_id: activeIdentity.gameId,
      target_round: round,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requireHost]);

  const confirmChallengeWinner = useCallback(async (round: RoundNumber, team: TeamCode) => {
    const client = requireClient();
    const activeIdentity = requireHost();
    await rpcData(client, "confirm_live_challenge_winner", {
      target_game_id: activeIdentity.gameId,
      target_round: round,
      winning_team_code: team,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requireHost]);

  const revealRole = useCallback(async () => {
    const client = requireClient();
    const activeIdentity = requirePlayer();
    await rpcData(client, "mark_own_role_revealed", {
      target_game_id: activeIdentity.gameId,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requirePlayer]);

  const submitVote = useCallback(async (accusedMemberId: string) => {
    const client = requireClient();
    const activeIdentity = requirePlayer();
    await rpcData(client, "submit_live_vote", {
      target_game_id: activeIdentity.gameId,
      target_accused_member_id: accusedMemberId,
    });
    await refreshForIdentity(activeIdentity);
  }, [refreshForIdentity, requireClient, requirePlayer]);

  const playerProgress = useMemo(
    () => rawProgress.map((row) => mapProgress(row, onlineMemberIds)),
    [onlineMemberIds, rawProgress],
  );

  return {
    configured,
    ready,
    loading,
    error,
    userId,
    identity,
    summary,
    lobby,
    playerProgress,
    challenge,
    missionSelections,
    privateState,
    onlineMemberIds,
    createGame,
    joinGame,
    resumeHost,
    refresh,
    clearSession,
    updateProgress,
    advancePhase,
    drawMillionaire,
    selectMission,
    selectChallenge,
    drawTeams,
    confirmChallengeWinner,
    revealRole,
    submitVote,
  };
}
