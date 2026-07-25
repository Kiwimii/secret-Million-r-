"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = { accessRole: "host" | "player"; gameId: string; joinCode: string };
type Summary = { current_round: number; phase: string };
type Player = {
  memberId: string;
  displayName: string;
  currentRole: string;
  roleRevealed: boolean;
  missionOpened: boolean;
  advantageOpened: boolean;
  challengeBriefingOpened: boolean;
  voteSubmitted: boolean;
  roleDecisionSubmitted: boolean;
};
type Overview = {
  game: { currentMillionaireMemberId?: string; currentMillionaireDisplayName?: string };
  players: Player[];
  rounds: Array<{ round: number; roleDecision?: { memberId?: string } }>;
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

function actionForPhase(phase?: string): { step: string; label: string; completed(player: Player): boolean } | undefined {
  if (phase === "role_reveal") return { step: "role", label: "Rolle als gesehen markieren", completed: (p) => p.roleRevealed };
  if (phase === "mission") return { step: "mission", label: "Mission als geöffnet markieren", completed: (p) => p.missionOpened };
  if (phase === "challenge") return { step: "challenge", label: "Challenge als geöffnet markieren", completed: (p) => p.challengeBriefingOpened };
  if (phase === "advantage") return { step: "advantage", label: "Vorteil als geöffnet markieren", completed: (p) => p.advantageOpened };
  return undefined;
}

export default function HostManualPlayerActions() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [overview, setOverview] = useState<Overview>();
  const [hostGrid, setHostGrid] = useState<HTMLElement | null>(null);
  const [busyKey, setBusyKey] = useState<string>();
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
        options: { data: { application: "secret-millionaer", purpose: "host-manual-player-actions" } },
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
      const [lookup, overviewResponse] = await Promise.all([
        client.rpc("lookup_live_game", { raw_join_code: activeIdentity.joinCode }),
        client.rpc("get_live_host_game_overview", { target_game_id: activeIdentity.gameId }),
      ]);
      if (lookup.error) throw new Error(lookup.error.message);
      if (overviewResponse.error) throw new Error(overviewResponse.error.message);
      setSummary(Array.isArray(lookup.data) ? lookup.data[0] as Summary : undefined);
      setOverview(overviewResponse.data as Overview);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die manuelle Steuerung konnte nicht geladen werden.");
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2200);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const locate = () => setHostGrid(document.querySelector<HTMLElement>(".sgi-host-grid"));
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  async function run(key: string, fn: (client: ReturnType<typeof createClient>) => Promise<void>) {
    setBusyKey(key);
    setMessage(undefined);
    setError(undefined);
    try {
      const client = await ensureSession();
      await fn(client);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die manuelle Aktion ist fehlgeschlagen.");
    } finally {
      setBusyKey(undefined);
    }
  }

  async function completeStep(player: Player, step: string, label: string) {
    if (!identity) return;
    await run(`${player.memberId}:${step}`, async (client) => {
      const response = await client.rpc("host_complete_player_step", {
        target_game_id: identity.gameId,
        target_member_id: player.memberId,
        requested_step: step,
      });
      if (response.error) throw new Error(response.error.message);
      setMessage(`${player.displayName}: ${label} wurde manuell abgeschlossen.`);
    });
  }

  async function decideForMillionaire(decision: "keep" | "release") {
    if (!identity || !overview?.game.currentMillionaireMemberId) return;
    await run(`decision:${decision}`, async (client) => {
      const response = await client.rpc("host_submit_live_cork_decision", {
        target_game_id: identity.gameId,
        target_member_id: overview.game.currentMillionaireMemberId,
        requested_decision: decision,
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data as { transition?: { advanced?: boolean; nextRound?: number; reason?: string } };
      if (decision === "release") {
        setMessage("Zufälliger Nachfolger wurde geheim bestimmt. Du kannst ihn nun bestätigen oder neu auslosen.");
      } else if (result.transition?.advanced) {
        setMessage(`Runde ${result.transition.nextRound ?? ""} wurde gestartet.`);
      } else {
        setMessage(`Entscheidung gespeichert. Mission und Vorteil für Runde ${result.transition?.nextRound ?? "?"} müssen noch vorbereitet werden.`);
      }
    });
  }

  if (!identity || !hostGrid || !summary || !overview) return null;

  const phaseAction = actionForPhase(summary.phase);
  const currentRoundDecision = overview.rounds.find((round) => Number(round.round) === Number(summary.current_round))?.roleDecision;
  const decisionMissing = summary.phase === "role_transfer" && !currentRoundDecision && Boolean(overview.game.currentMillionaireMemberId);

  return createPortal(
    <section className="sgi-panel hma-panel" data-host-manual-actions="v1">
      <header>
        <div><p>Notfallsteuerung</p><h3>Spieleraktionen manuell abschließen</h3></div>
        <span>Nur verwenden, wenn ein Gerät festhängt.</span>
      </header>

      {decisionMissing && (
        <div className="hma-decision">
          <strong>Rollenentscheidung blockiert</strong>
          <span>{overview.game.currentMillionaireDisplayName ?? "Der aktuelle Millionär"} hat noch keine Korkenentscheidung übermittelt.</span>
          <div>
            <button disabled={Boolean(busyKey)} onClick={() => void decideForMillionaire("keep")} type="button">Millionär bleibt</button>
            <button disabled={Boolean(busyKey)} onClick={() => void decideForMillionaire("release")} type="button">Zufällig weitergeben</button>
          </div>
        </div>
      )}

      {phaseAction ? (
        <div className="hma-player-list">
          {overview.players.map((player) => {
            const done = phaseAction.completed(player);
            return (
              <article key={player.memberId}>
                <div><strong>{player.displayName}</strong><span>{done ? "Schritt abgeschlossen" : "Schritt noch offen"}</span></div>
                <button
                  disabled={done || Boolean(busyKey)}
                  type="button"
                  onClick={() => void completeStep(player, phaseAction.step, phaseAction.label)}
                >
                  {done ? "✓ Erledigt" : phaseAction.label}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="hma-neutral">Für die aktuelle Phase gibt es keinen gefahrlosen einzelnen Fortschritts-Schritt. Nutze die vorhandene Notfall-Phasensteuerung nur als letzte Option.</p>
      )}

      {(message || error) && <div className={`hma-feedback ${error ? "error" : "success"}`}>{error ?? message}</div>}
    </section>,
    hostGrid,
  );
}
