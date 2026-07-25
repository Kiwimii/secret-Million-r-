"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = {
  accessRole: "host" | "player";
  gameId: string;
  joinCode: string;
};

type Player = {
  memberId: string;
  displayName: string;
  attendanceStatus: string;
  winnerPoolStatus: string;
  currentRole: string;
  isCurrentMillionaire: boolean;
  roleRevealed: boolean;
  missionOpened: boolean;
  advantageOpened: boolean;
  challengeBriefingOpened: boolean;
  voteSubmitted: boolean;
  roleDecisionSubmitted: boolean;
  screenKey?: string;
  stepKey?: string;
};

type RoundOverview = {
  round: number;
  result?: {
    millionaireSurvived: boolean;
  };
  roleDecision?: {
    decision: string;
  };
};

type Overview = {
  game: {
    currentRound: number;
    phase: string;
    currentMillionaireMemberId?: string;
    currentMillionaireDisplayName?: string;
  };
  players: Player[];
  rounds: RoundOverview[];
};

function readIdentity(): Identity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as Partial<Identity> | null;
    if (!parsed || parsed.accessRole !== "host" || !parsed.gameId || !parsed.joinCode) return undefined;
    return parsed as Identity;
  } catch {
    return undefined;
  }
}

function phaseLabel(phase: string) {
  const labels: Record<string, string> = {
    role_reveal: "Rollenanzeige",
    mission: "Mission",
    challenge: "Challenge-Briefing",
    advantage: "Vorteil",
    voting: "Abstimmung",
    role_transfer: "Korkenentscheidung",
  };
  return labels[phase] ?? phase;
}

export default function HostPlayerActionRecovery() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const [identity, setIdentity] = useState<Identity>();
  const [overview, setOverview] = useState<Overview>();
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string>();
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const ensureSession = useCallback(async () => {
    const client = getClient();
    const session = await client.auth.getSession();
    if (session.error) throw new Error(session.error.message);
    if (!session.data.session?.user) {
      const signedIn = await client.auth.signInAnonymously({
        options: { data: { application: "secret-millionaer", purpose: "host-player-recovery" } },
      });
      if (signedIn.error || !signedIn.data.user) {
        throw new Error(signedIn.error?.message ?? "Gerätesitzung fehlt.");
      }
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
      const response = await client.rpc("get_live_host_game_overview", {
        target_game_id: activeIdentity.gameId,
      });
      if (response.error) throw new Error(response.error.message);
      setOverview(response.data as Overview);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notfallsteuerung konnte nicht geladen werden.");
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    const sync = () => void refresh();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [refresh]);

  async function run(key: string, rpcName: string, args: Record<string, unknown>, success: string) {
    if (!identity) return;
    setBusyKey(key);
    setError(undefined);
    setNotice(undefined);
    try {
      const client = await ensureSession();
      const response = await client.rpc(rpcName, args);
      if (response.error) throw new Error(response.error.message);
      setNotice(success);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Aktion konnte nicht ausgeführt werden.");
    } finally {
      setBusyKey(undefined);
    }
  }

  if (!identity || !overview) return null;

  const { phase, currentRound, currentMillionaireMemberId, currentMillionaireDisplayName } = overview.game;
  const presentPlayers = overview.players.filter((player) => player.attendanceStatus === "present");
  const voteTargets = presentPlayers.filter((player) => player.winnerPoolStatus === "eligible");
  const currentRoundOverview = overview.rounds.find((round) => round.round === currentRound);
  const corkDecisionOpen = phase === "role_transfer"
    && currentRound < 4
    && currentRoundOverview?.result?.millionaireSurvived
    && !currentRoundOverview.roleDecision;

  const actionable = presentPlayers.filter((player) => {
    if (phase === "role_reveal") return !player.roleRevealed;
    if (phase === "mission") return player.isCurrentMillionaire && !player.missionOpened;
    if (phase === "challenge") return !player.challengeBriefingOpened;
    if (phase === "advantage") return player.isCurrentMillionaire && !player.advantageOpened;
    if (phase === "voting") return player.winnerPoolStatus !== "disqualified" && !player.voteSubmitted;
    return false;
  });

  return (
    <aside className={`hpar-shell ${open ? "is-open" : ""}`} data-host-player-recovery="v1">
      {!open && (
        <button className="hpar-trigger" type="button" onClick={() => setOpen(true)}>
          <span>⚙</span>
          Spieler manuell weiterführen
          {(actionable.length > 0 || corkDecisionOpen) && <b>{actionable.length + (corkDecisionOpen ? 1 : 0)}</b>}
        </button>
      )}

      {open && (
        <section className="hpar-panel" aria-label="Manuelle Spieleraktionen">
          <header>
            <div>
              <p>André · Notfallsteuerung</p>
              <h2>Spieler manuell weiterführen</h2>
              <span>Runde {currentRound} · {phaseLabel(phase)}</span>
            </div>
            <button type="button" aria-label="Schließen" onClick={() => setOpen(false)}>×</button>
          </header>

          <div className="hpar-warning">
            Nur verwenden, wenn ein Spieler technisch festhängt. Entscheidungen werden als Aktion dieses Spielers gespeichert und protokolliert.
          </div>

          {actionable.length === 0 && !corkDecisionOpen && (
            <div className="hpar-empty">Für die aktuelle Phase gibt es keine blockierte Spieleraktion.</div>
          )}

          <div className="hpar-list">
            {actionable.map((player) => {
              const key = `${phase}-${player.memberId}`;
              return (
                <article key={player.memberId}>
                  <div className="hpar-person">
                    <span>{player.displayName.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{player.displayName}</strong>
                      <small>{player.screenKey ?? "unbekannt"} · {player.stepKey ?? "kein Schritt"}</small>
                    </div>
                  </div>

                  {phase === "role_reveal" && (
                    <button disabled={Boolean(busyKey)} type="button" onClick={() => void run(
                      key,
                      "host_complete_player_step",
                      { target_game_id: identity.gameId, target_member_id: player.memberId, requested_step: "role" },
                      `${player.displayName}: Rolle als angesehen markiert.`,
                    )}>Rolle als angesehen bestätigen</button>
                  )}

                  {phase === "mission" && (
                    <button disabled={Boolean(busyKey)} type="button" onClick={() => void run(
                      key,
                      "host_complete_player_step",
                      { target_game_id: identity.gameId, target_member_id: player.memberId, requested_step: "mission" },
                      `${player.displayName}: Mission als geöffnet markiert.`,
                    )}>Mission als geöffnet bestätigen</button>
                  )}

                  {phase === "challenge" && (
                    <button disabled={Boolean(busyKey)} type="button" onClick={() => void run(
                      key,
                      "host_complete_player_step",
                      { target_game_id: identity.gameId, target_member_id: player.memberId, requested_step: "challenge" },
                      `${player.displayName}: Challenge-Briefing bestätigt.`,
                    )}>Challenge-Briefing bestätigen</button>
                  )}

                  {phase === "advantage" && (
                    <button disabled={Boolean(busyKey)} type="button" onClick={() => void run(
                      key,
                      "host_complete_player_step",
                      { target_game_id: identity.gameId, target_member_id: player.memberId, requested_step: "advantage" },
                      `${player.displayName}: Vorteil als geöffnet markiert.`,
                    )}>Vorteil als geöffnet bestätigen</button>
                  )}

                  {phase === "voting" && (
                    <div className="hpar-vote-row">
                      <select
                        aria-label={`Abstimmungsziel für ${player.displayName}`}
                        value={targets[player.memberId] ?? ""}
                        onChange={(event) => setTargets((current) => ({ ...current, [player.memberId]: event.target.value }))}
                      >
                        <option value="">Abstimmungsziel wählen</option>
                        {voteTargets.map((target) => (
                          <option key={target.memberId} value={target.memberId}>{target.displayName}</option>
                        ))}
                      </select>
                      <button
                        disabled={Boolean(busyKey) || !targets[player.memberId]}
                        type="button"
                        onClick={() => void run(
                          key,
                          "host_submit_player_vote",
                          {
                            target_game_id: identity.gameId,
                            target_voter_member_id: player.memberId,
                            target_accused_member_id: targets[player.memberId],
                          },
                          `Stimme für ${player.displayName} gespeichert.`,
                        )}
                      >Stimme verbindlich abgeben</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {corkDecisionOpen && currentMillionaireMemberId && (
            <section className="hpar-cork">
              <p>Offene Korkenentscheidung</p>
              <h3>{currentMillionaireDisplayName ?? "Aktueller Millionär"} kommt nicht weiter</h3>
              <span>André kann die konkrete Entscheidung im Namen des Millionärs übernehmen.</span>
              <div>
                <button disabled={Boolean(busyKey)} type="button" onClick={() => void run(
                  "cork-keep",
                  "host_submit_cork_decision",
                  { target_game_id: identity.gameId, requested_decision: "keep" },
                  "Korkenentscheidung gespeichert: Millionär bleibt.",
                )}>Millionär bleibt</button>
                <button disabled={Boolean(busyKey)} type="button" onClick={() => void run(
                  "cork-release",
                  "host_submit_cork_decision",
                  { target_game_id: identity.gameId, requested_decision: "release" },
                  "Korkenweitergabe gespeichert. André muss den geheimen Kandidaten anschließend bestätigen.",
                )}>Zufällig weitergeben</button>
              </div>
            </section>
          )}

          {notice && <div className="hpar-notice">{notice}</div>}
          {error && <div className="hpar-error" role="alert">{error}</div>}
        </section>
      )}
    </aside>
  );
}
