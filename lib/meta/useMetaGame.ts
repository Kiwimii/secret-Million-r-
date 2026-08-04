"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AttendanceStatus,
  CompetitionStatus,
  MetaGameView,
  MetaIdentity,
  MissionStatus,
  RoundPackageInput,
  TeamCode,
} from "./types";

const STORAGE_KEY = "secret-millionaer.meta-session.v2";
const REFRESH_MS = 12_000;

type RpcValue = Record<string, unknown>;

function parseIdentity(): MetaIdentity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as MetaIdentity;
    if (!parsed.gameId || !parsed.joinCode || !["host", "player"].includes(parsed.accessRole)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function saveIdentity(identity?: MetaIdentity) {
  if (typeof window === "undefined") return;
  if (!identity) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

async function ensureAnonymousUser(client: SupabaseClient): Promise<User> {
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;
  const { data, error } = await client.auth.signInAnonymously({
    options: { data: { application: "secret-millionaer-meta" } },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Gerätesitzung konnte nicht erstellt werden.");
  return data.user;
}

async function rpc<T>(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

function toIdentity(value: RpcValue, accessRole: "host" | "player"): MetaIdentity {
  return {
    accessRole,
    gameId: String(value.game_id ?? ""),
    joinCode: String(value.join_code ?? ""),
    memberId: value.member_id ? String(value.member_id) : undefined,
  };
}

export interface MetaGameController {
  configured: boolean;
  ready: boolean;
  loading: boolean;
  error?: string;
  identity?: MetaIdentity;
  view?: MetaGameView;
  createGame(input: {
    title: string;
    pin: string;
    totalRounds: number;
    finalRule: "classic" | "points";
    notesVisibility: "host" | "private";
  }): Promise<void>;
  joinGame(input: { code: string; name: string; pin: string; avatarPath?: string }): Promise<void>;
  resumeHost(code: string, pin: string): Promise<void>;
  refresh(): Promise<void>;
  clearSession(): Promise<void>;
  configureRound(roundPackage: RoundPackageInput): Promise<void>;
  drawMillionaire(force?: boolean): Promise<void>;
  releaseRoles(): Promise<void>;
  publishMission(): Promise<void>;
  drawTeams(): Promise<void>;
  setChallengeWinner(team: TeamCode): Promise<void>;
  setMissionStatus(status: MissionStatus): Promise<void>;
  setEffectSelection(selection: Record<string, string>): Promise<void>;
  openVoting(): Promise<void>;
  saveVoteDraft(targetMemberId: string): Promise<void>;
  submitVote(targetMemberId: string): Promise<void>;
  closeVoting(): Promise<void>;
  publishResult(): Promise<void>;
  submitRoleDecision(decision: "keep" | "transfer"): Promise<void>;
  advanceRound(): Promise<void>;
  setMemberStatus(input: {
    memberId: string;
    attendanceStatus?: AttendanceStatus;
    competitionStatus?: CompetitionStatus;
    reason?: string;
  }): Promise<void>;
  saveNote(subjectMemberId: string, note: string): Promise<void>;
  markNotificationsRead(): Promise<void>;
  setAcceptingPlayers(accepting: boolean): Promise<void>;
}

export function useMetaGame(): MetaGameController {
  const configured = isSupabaseConfigured();
  const clientRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const identityRef = useRef<MetaIdentity | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [identity, setIdentityState] = useState<MetaIdentity>();
  const [view, setView] = useState<MetaGameView>();

  const setIdentity = useCallback((next?: MetaIdentity) => {
    identityRef.current = next;
    setIdentityState(next);
    saveIdentity(next);
  }, []);

  const load = useCallback(async (target?: MetaIdentity) => {
    const active = target ?? identityRef.current;
    const client = clientRef.current;
    if (!client || !active) return;
    const next = await rpc<MetaGameView>(client, "meta_get_game_view", {
      target_game_id: active.gameId,
    });
    setView(next);
    setError(undefined);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Spielstand konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!configured) {
      setError("Die öffentliche Supabase-Konfiguration fehlt.");
      setLoading(false);
      setReady(true);
      return;
    }
    const client = createClient();
    clientRef.current = client;
    void (async () => {
      try {
        await ensureAnonymousUser(client);
        const stored = parseIdentity();
        if (cancelled) return;
        if (stored) {
          setIdentity(stored);
          await load(stored);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Live-Verbindung fehlgeschlagen.");
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
  }, [configured, load, setIdentity]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !identity) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    void (async () => {
      await client.realtime.setAuth();
      if (cancelled) return;
      channel = client
        .channel(`meta-game:${identity.gameId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "meta_game_updates",
            filter: `game_id=eq.${identity.gameId}`,
          },
          () => void load(identity),
        )
        .subscribe();
      channelRef.current = channel;
    })();

    const interval = window.setInterval(() => void load(identity), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(identity);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void client.removeChannel(channel);
    };
  }, [identity, load]);

  const mutate = useCallback(async (name: string, args: Record<string, unknown> = {}) => {
    const client = clientRef.current;
    const active = identityRef.current;
    if (!client || !active) throw new Error("Keine aktive Spielinstanz.");
    setLoading(true);
    try {
      await rpc(client, name, { target_game_id: active.gameId, ...args });
      await load(active);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Aktion fehlgeschlagen.";
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const createGame = useCallback(async (input: {
    title: string;
    pin: string;
    totalRounds: number;
    finalRule: "classic" | "points";
    notesVisibility: "host" | "private";
  }) => {
    const client = clientRef.current;
    if (!client) throw new Error("Live-Verbindung ist noch nicht bereit.");
    setLoading(true);
    try {
      const value = await rpc<RpcValue>(client, "meta_create_game", {
        game_title: input.title,
        host_pin: input.pin,
        requested_rounds: input.totalRounds,
        requested_final_rule: input.finalRule,
        requested_notes_visibility: input.notesVisibility,
      });
      const next = toIdentity(value, "host");
      setIdentity(next);
      await load(next);
    } finally {
      setLoading(false);
    }
  }, [load, setIdentity]);

  const joinGame = useCallback(async (input: { code: string; name: string; pin: string; avatarPath?: string }) => {
    const client = clientRef.current;
    if (!client) throw new Error("Live-Verbindung ist noch nicht bereit.");
    setLoading(true);
    try {
      const value = await rpc<RpcValue>(client, "meta_join_game", {
        raw_join_code: input.code,
        requested_name: input.name,
        player_pin: input.pin,
        requested_avatar_path: input.avatarPath ?? null,
      });
      const next = toIdentity(value, "player");
      setIdentity(next);
      await load(next);
    } finally {
      setLoading(false);
    }
  }, [load, setIdentity]);

  const resumeHost = useCallback(async (code: string, pin: string) => {
    const client = clientRef.current;
    if (!client) throw new Error("Live-Verbindung ist noch nicht bereit.");
    setLoading(true);
    try {
      const value = await rpc<RpcValue>(client, "meta_resume_host", {
        raw_join_code: code,
        host_pin: pin,
      });
      const next = toIdentity(value, "host");
      setIdentity(next);
      await load(next);
    } finally {
      setLoading(false);
    }
  }, [load, setIdentity]);

  const clearSession = useCallback(async () => {
    const client = clientRef.current;
    if (client && channelRef.current) await client.removeChannel(channelRef.current);
    setIdentity(undefined);
    setView(undefined);
    setError(undefined);
  }, [setIdentity]);

  return {
    configured,
    ready,
    loading,
    error,
    identity,
    view,
    createGame,
    joinGame,
    resumeHost,
    refresh,
    clearSession,
    configureRound: (roundPackage) => mutate("meta_host_configure_round", { round_package: roundPackage }),
    drawMillionaire: (force = false) => mutate("meta_host_draw_millionaire", { force_redraw: force }),
    releaseRoles: () => mutate("meta_host_release_roles"),
    publishMission: () => mutate("meta_host_publish_mission"),
    drawTeams: () => mutate("meta_host_draw_teams"),
    setChallengeWinner: (team) => mutate("meta_host_set_challenge_winner", { winning_team: team }),
    setMissionStatus: (status) => mutate("meta_host_set_mission_status", { mission_result: status }),
    setEffectSelection: (selection) => mutate("meta_player_set_effect_selection", { effect_selection: selection }),
    openVoting: () => mutate("meta_host_open_voting"),
    saveVoteDraft: (targetMemberId) => mutate("meta_save_vote_draft", { target_member_id: targetMemberId }),
    submitVote: (targetMemberId) => mutate("meta_submit_vote", { target_member_id: targetMemberId }),
    closeVoting: () => mutate("meta_host_close_voting"),
    publishResult: () => mutate("meta_host_publish_result"),
    submitRoleDecision: (decision) => mutate("meta_player_role_decision", { role_decision: decision }),
    advanceRound: () => mutate("meta_host_advance_round"),
    setMemberStatus: (input) => mutate("meta_host_set_member_status", {
      target_member_id: input.memberId,
      new_attendance_status: input.attendanceStatus ?? null,
      new_competition_status: input.competitionStatus ?? null,
      change_reason: input.reason ?? null,
    }),
    saveNote: (subjectMemberId, note) => mutate("meta_save_note", {
      subject_member_id: subjectMemberId,
      note_text: note,
    }),
    markNotificationsRead: () => mutate("meta_mark_notifications_read"),
    setAcceptingPlayers: (accepting) => mutate("meta_host_set_accepting_players", { accepting }),
  };
}
