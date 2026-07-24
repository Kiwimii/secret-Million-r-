"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ADVANTAGES, MISSIONS } from "@/lib/game/catalog";
import type { RoundNumber } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = {
  accessRole: "host" | "player";
  gameId: string;
  memberId?: string;
  joinCode: string;
};

type Summary = {
  current_round: number;
  phase: string;
};

type LobbyMember = {
  memberId: string;
  displayName: string;
  attendanceStatus: string;
  winnerPoolStatus: string;
};

type PrivateState = {
  role?: "millionaire" | "investigator" | "none";
  mission?: {
    status: "assigned" | "completed" | "failed";
  };
  advantage?: {
    catalog_id: string;
    effect: "double_vote" | "triple_vote" | "redirect_vote";
    title_snapshot: string;
    description_snapshot: string;
    player_instructions_snapshot?: string;
    source_target_member_id?: string;
    target_member_id?: string;
    used_at?: string;
    expired_at?: string;
  };
};

type RoundSetup = {
  round: RoundNumber;
  missionId?: string;
  advantageId?: string;
};

type RoundOverview = {
  round: number;
  mission?: {
    title: string;
    status: string;
    assignedDisplayName: string;
  };
  advantage?: {
    title: string;
    effect: string;
    selectedAt?: string;
    sourceDisplayName?: string;
    targetDisplayName?: string;
  };
};

type HostOverview = {
  rounds: RoundOverview[];
};

type RpcRow = Record<string, unknown>;

function readIdentity(): Identity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as Partial<Identity> | null;
    if (!parsed || (parsed.accessRole !== "host" && parsed.accessRole !== "player")) return undefined;
    if (!parsed.gameId || !parsed.joinCode) return undefined;
    return parsed as Identity;
  } catch {
    return undefined;
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

export default function HostSelectedAdvantageFlow() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [privateState, setPrivateState] = useState<PrivateState>();
  const [lobby, setLobby] = useState<LobbyMember[]>([]);
  const [overview, setOverview] = useState<HostOverview>();
  const [setups, setSetups] = useState<RoundSetup[]>([]);
  const [hostOpen, setHostOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundNumber>(1);
  const [missionId, setMissionId] = useState(MISSIONS[0]?.id ?? "");
  const [advantageId, setAdvantageId] = useState(ADVANTAGES[0]?.id ?? "");
  const [sourceMemberId, setSourceMemberId] = useState("");
  const [targetMemberId, setTargetMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const ensureSession = useCallback(async () => {
    const client = getClient();
    const current = await client.auth.getSession();
    if (current.error) throw new Error(current.error.message);
    if (!current.data.session?.user) {
      const signedIn = await client.auth.signInAnonymously({
        options: { data: { application: "secret-millionaer", purpose: "host-selected-advantage" } },
      });
      if (signedIn.error || !signedIn.data.user) throw new Error(signedIn.error?.message ?? "Gerätesitzung fehlt.");
    }
    return client;
  }, [getClient]);

  const refresh = useCallback(async () => {
    const activeIdentity = readIdentity();
    setIdentity(activeIdentity);
    if (!activeIdentity || !isSupabaseConfigured() || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const client = await ensureSession();
      const lookup = await client.rpc("lookup_live_game", { raw_join_code: activeIdentity.joinCode });
      if (lookup.error) throw new Error(lookup.error.message);
      const row = Array.isArray(lookup.data) ? lookup.data[0] as RpcRow | undefined : undefined;
      if (!row) throw new Error("Die laufende Partie wurde nicht gefunden.");
      const nextSummary = {
        current_round: Number(row.current_round),
        phase: asString(row.phase),
      };
      setSummary(nextSummary);
      setSelectedRound((current) => current || nextSummary.current_round as RoundNumber);

      const lobbyResponse = await client.rpc("get_public_lobby_members", { target_game_id: activeIdentity.gameId });
      if (lobbyResponse.error) throw new Error(lobbyResponse.error.message);
      setLobby(((lobbyResponse.data ?? []) as RpcRow[]).map((member) => ({
        memberId: asString(member.member_id),
        displayName: asString(member.display_name),
        attendanceStatus: asString(member.attendance_status),
        winnerPoolStatus: asString(member.winner_pool_status),
      })));

      if (activeIdentity.accessRole === "host") {
        const [missionSelections, advantageSelections, overviewResponse] = await Promise.all([
          client.from("round_mission_selections").select("round_number,catalog_id").eq("game_id", activeIdentity.gameId),
          client.from("round_advantage_selections").select("round_number,catalog_id").eq("game_id", activeIdentity.gameId),
          client.rpc("get_live_host_game_overview", { target_game_id: activeIdentity.gameId }),
        ]);
        if (missionSelections.error) throw new Error(missionSelections.error.message);
        if (advantageSelections.error) throw new Error(advantageSelections.error.message);
        if (overviewResponse.error) throw new Error(overviewResponse.error.message);

        const nextSetups = ([1, 2, 3, 4] as const).map((round) => ({
          round,
          missionId: missionSelections.data?.find((entry) => Number(entry.round_number) === round)?.catalog_id,
          advantageId: advantageSelections.data?.find((entry) => Number(entry.round_number) === round)?.catalog_id,
        }));
        setSetups(nextSetups);
        setOverview(overviewResponse.data as HostOverview);
        setPrivateState(undefined);
      } else {
        const privateResponse = await client.rpc("get_live_private_state", { target_game_id: activeIdentity.gameId });
        if (privateResponse.error) throw new Error(privateResponse.error.message);
        setPrivateState(privateResponse.data as PrivateState);
        setOverview(undefined);
      }
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Vorteilsablauf konnte nicht geladen werden.");
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2200);
    const sync = () => void refresh();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [refresh]);

  useEffect(() => {
    const setup = setups.find((entry) => entry.round === selectedRound);
    setMissionId(setup?.missionId ?? MISSIONS[0]?.id ?? "");
    setAdvantageId(setup?.advantageId ?? ADVANTAGES[0]?.id ?? "");
  }, [selectedRound, setups]);

  const candidates = useMemo(
    () => lobby.filter((member) => member.attendanceStatus === "present" && member.winnerPoolStatus === "eligible"),
    [lobby],
  );

  useEffect(() => {
    if (!sourceMemberId || !candidates.some((member) => member.memberId === sourceMemberId)) {
      setSourceMemberId(candidates[0]?.memberId ?? "");
    }
    if (!targetMemberId || !candidates.some((member) => member.memberId === targetMemberId) || targetMemberId === sourceMemberId) {
      setTargetMemberId(candidates.find((member) => member.memberId !== sourceMemberId)?.memberId ?? "");
    }
  }, [candidates, sourceMemberId, targetMemberId]);

  async function runAction(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await action();
      setMessage(success);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRoundPackage() {
    if (!identity) return;
    const mission = MISSIONS.find((entry) => entry.id === missionId);
    const advantage = ADVANTAGES.find((entry) => entry.id === advantageId);
    if (!mission || !advantage) return;
    await runAction(async () => {
      const client = await ensureSession();
      const missionResponse = await client.rpc("select_live_round_mission", {
        target_game_id: identity.gameId,
        target_round: selectedRound,
        mission_catalog_id: mission.id,
        mission_title: mission.title,
        mission_task: mission.task,
        mission_success_criteria: mission.successCriteria,
        mission_time_window: mission.timeWindow,
      });
      if (missionResponse.error) throw new Error(missionResponse.error.message);
      const advantageResponse = await client.rpc("select_live_round_advantage", {
        target_game_id: identity.gameId,
        target_round: selectedRound,
        advantage_catalog_id: advantage.id,
        advantage_effect: advantage.effect,
        advantage_title: advantage.title,
        advantage_description: advantage.description,
        advantage_player_instructions: advantage.playerInstructions,
        advantage_host_instructions: advantage.hostInstructions,
        advantage_limit: advantage.limit,
        advantage_selection_mode: advantage.selectionMode,
      });
      if (advantageResponse.error) throw new Error(advantageResponse.error.message);
    }, `Mission und Vorteilsart für Runde ${selectedRound} wurden gemeinsam festgelegt.`);
  }

  async function markMission(status: "completed" | "failed") {
    if (!identity || !summary) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("mark_live_mission_status", {
        target_game_id: identity.gameId,
        target_round: Number(summary.current_round),
        requested_status: status,
      });
      if (response.error) throw new Error(response.error.message);
    }, status === "completed"
      ? "Mission bestätigt. Der von André festgelegte Vorteil ist für die Abstimmung freigeschaltet."
      : "Mission gescheitert. Der festgelegte Vorteil ist verfallen.");
  }

  async function applyAdvantage() {
    if (!identity || !summary || !privateState?.advantage) return;
    const effect = privateState.advantage.effect;
    if (effect === "redirect_vote" && (!sourceMemberId || !targetMemberId || sourceMemberId === targetMemberId)) {
      setError("Für die goldene Umleitung müssen zwei verschiedene Spieler gewählt werden.");
      return;
    }
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("choose_live_millionaire_advantage", {
        target_game_id: identity.gameId,
        target_round: Number(summary.current_round),
        requested_effect: effect,
        requested_source_member_id: effect === "redirect_vote" ? sourceMemberId : null,
        requested_target_member_id: effect === "redirect_vote" ? targetMemberId : null,
      });
      if (response.error) throw new Error(response.error.message);
    }, `${privateState.advantage.title_snapshot} wurde für diese Abstimmung aktiviert.`);
  }

  if (!identity || !summary) return null;

  const activeRound = overview?.rounds.find((round) => round.round === selectedRound);
  const selectedMission = MISSIONS.find((entry) => entry.id === missionId);
  const selectedAdvantage = ADVANTAGES.find((entry) => entry.id === advantageId);
  const showPlayerActivation = identity.accessRole === "player"
    && summary.phase === "voting"
    && privateState?.role === "millionaire"
    && privateState.mission?.status === "completed"
    && Boolean(privateState.advantage)
    && !privateState.advantage?.used_at
    && !privateState.advantage?.expired_at;

  return (
    <div className="hsaf-root" data-advantage-flow="host-selected-v1">
      {identity.accessRole === "host" && (
        <>
          <button className="hsaf-host-trigger" type="button" onClick={() => setHostOpen(true)}>
            <span>◆</span> André · Mission + Vorteil
          </button>
          {hostOpen && (
            <div className="hsaf-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setHostOpen(false);
            }}>
              <section className="hsaf-host-panel" role="dialog" aria-modal="true" aria-labelledby="hsaf-host-title">
                <header>
                  <div><p>Rundenpaket</p><h2 id="hsaf-host-title">Mission und Vorteilsart gemeinsam festlegen</h2><span>André bestimmt die Art. Der Millionär darf sie später nicht ändern.</span></div>
                  <button type="button" onClick={() => setHostOpen(false)} aria-label="Schließen">×</button>
                </header>

                <nav className="hsaf-rounds">
                  {([1, 2, 3, 4] as const).map((round) => (
                    <button className={selectedRound === round ? "active" : ""} type="button" onClick={() => setSelectedRound(round)} key={round}>
                      Runde {round}
                      <small>{setups.find((entry) => entry.round === round)?.missionId && setups.find((entry) => entry.round === round)?.advantageId ? "Komplett" : "Offen"}</small>
                    </button>
                  ))}
                </nav>

                <div className="hsaf-package-grid">
                  <label><span>Geheime Mission</span><select value={missionId} onChange={(event) => setMissionId(event.target.value)}>{MISSIONS.map((mission) => <option value={mission.id} key={mission.id}>{mission.title}</option>)}</select><small>{selectedMission?.task}</small></label>
                  <label><span>Vorteilsart dieser Runde</span><select value={advantageId} onChange={(event) => setAdvantageId(event.target.value)}>{ADVANTAGES.map((advantage) => <option value={advantage.id} key={advantage.id}>{advantage.title}</option>)}</select><small>{selectedAdvantage?.description}</small></label>
                </div>

                <div className="hsaf-rule"><b>Verbindliche Logik</b><span>Erst wenn André die Mission als erfolgreich bestätigt, wird genau dieser Vorteil während der Abstimmung für den Millionär freigeschaltet.</span></div>
                <button className="hsaf-primary" disabled={busy} type="button" onClick={() => void saveRoundPackage()}>{busy ? "Wird gespeichert …" : `Mission + Vorteil für Runde ${selectedRound} speichern`}</button>

                {activeRound?.mission && selectedRound === Number(summary.current_round) && (
                  <section className="hsaf-review">
                    <div><p>Aktuelle Mission</p><strong>{activeRound.mission.title}</strong><span>Geheim bei {activeRound.mission.assignedDisplayName} · Status: {activeRound.mission.status}</span></div>
                    <div><button className="success" disabled={busy} type="button" onClick={() => void markMission("completed")}>✓ Mission erfolgreich</button><button className="danger" disabled={busy} type="button" onClick={() => void markMission("failed")}>✕ Mission gescheitert</button></div>
                  </section>
                )}

                {activeRound?.advantage && (
                  <section className="hsaf-status">
                    <span>Von André festgelegter Vorteil</span>
                    <strong>{activeRound.advantage.title}</strong>
                    <small>{activeRound.advantage.selectedAt ? "Vom Millionär in der Abstimmung angewendet" : activeRound.mission?.status === "completed" ? "Freigeschaltet – wartet auf Anwendung in der Abstimmung" : activeRound.mission?.status === "failed" ? "Verfallen" : "Noch gesperrt"}</small>
                    {activeRound.advantage.sourceDisplayName && <em>Ausgangsziel: {activeRound.advantage.sourceDisplayName}</em>}
                    {activeRound.advantage.targetDisplayName && <em>Endziel: {activeRound.advantage.targetDisplayName}</em>}
                  </section>
                )}

                {(error || message) && <div className={`hsaf-message ${error ? "error" : "success"}`}>{error ?? message}</div>}
              </section>
            </div>
          )}
        </>
      )}

      {showPlayerActivation && privateState?.advantage && (
        <div className="hsaf-player-backdrop">
          <section className="hsaf-player-card">
            <p>Mission erfolgreich · von André freigeschaltet</p>
            <h2>{privateState.advantage.title_snapshot}</h2>
            <strong>{privateState.advantage.description_snapshot}</strong>
            <div className="hsaf-locked-type"><span>Vorteilsart</span><b>Von André vor der Runde festgelegt</b><small>Du kannst die Art nicht ändern. Du entscheidest nur über die Anwendung in dieser Abstimmung.</small></div>
            {privateState.advantage.effect === "redirect_vote" && (
              <div className="hsaf-targets">
                <label><span>Eine Stimme wegnehmen von</span><select value={sourceMemberId} onChange={(event) => setSourceMemberId(event.target.value)}>{candidates.map((member) => <option value={member.memberId} key={member.memberId}>{member.displayName}</option>)}</select></label>
                <label><span>Stimmen geben an</span><select value={targetMemberId} onChange={(event) => setTargetMemberId(event.target.value)}>{candidates.filter((member) => member.memberId !== sourceMemberId).map((member) => <option value={member.memberId} key={member.memberId}>{member.displayName}</option>)}</select></label>
              </div>
            )}
            <button className="hsaf-apply" disabled={busy || (privateState.advantage.effect === "redirect_vote" && (!sourceMemberId || !targetMemberId || sourceMemberId === targetMemberId))} type="button" onClick={() => void applyAdvantage()}>{busy ? "Wird aktiviert …" : `${privateState.advantage.title_snapshot} jetzt anwenden`}</button>
            <small className="hsaf-vote-note">Danach gibst du deine geheime Stimme normal ab. Die Wirkung wird automatisch und verdeckt ausgewertet.</small>
            {(error || message) && <div className={`hsaf-message ${error ? "error" : "success"}`}>{error ?? message}</div>}
          </section>
        </div>
      )}
    </div>
  );
}
