"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type PublicResult = {
  round: number;
  published: boolean;
  tally: Array<{ memberId: string; displayName: string; totalVotes: number }>;
  eliminatedMemberId?: string;
  eliminatedDisplayName?: string;
  tieResolvedRandomly?: boolean;
};

type PrivateState = {
  roleDecisionRequired?: boolean;
  roleDecision?: {
    decision: "keep" | "release" | "replacement";
    targetMemberId?: string;
    submittedAt?: string;
  };
};

type RankingEntry = {
  rank: number;
  memberId: string;
  displayName: string;
  totalPoints: number;
  correctGuesses: number;
  winnerPoolStatus: string;
  isWinner: boolean;
};

type FinalResult = {
  published: boolean;
  winnerMemberId?: string;
  winnerDisplayName?: string;
  winnerReason?: "millionaire_survived" | "points_after_millionaire_exposed";
  millionaireMemberId?: string;
  millionaireDisplayName?: string;
  millionaireSurvived?: boolean;
  ranking: RankingEntry[];
};

type HostOverview = {
  game: {
    currentRound: number;
    phase: string;
  };
  rounds: Array<{
    round: number;
    result?: {
      millionaireDisplayName: string;
      eliminatedDisplayName: string;
      millionaireSurvived: boolean;
    };
    roleDecision?: {
      decision: string;
      targetDisplayName?: string;
    };
  }>;
};

type RpcRow = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

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

export default function RoundTransitionFinaleOverlay() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const stageKeyRef = useRef("");
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [lobby, setLobby] = useState<LobbyMember[]>([]);
  const [publicResult, setPublicResult] = useState<PublicResult>();
  const [privateState, setPrivateState] = useState<PrivateState>();
  const [finalResult, setFinalResult] = useState<FinalResult>();
  const [overview, setOverview] = useState<HostOverview>();
  const [resultPopupRound, setResultPopupRound] = useState<number>();
  const [dismissedHostRound, setDismissedHostRound] = useState<number>();
  const [finalOpen, setFinalOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

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
        options: { data: { application: "secret-millionaer", purpose: "round-transition-finale" } },
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
      const lookup = await client.rpc("lookup_live_game", { raw_join_code: activeIdentity.joinCode });
      if (lookup.error) throw new Error(lookup.error.message);
      const row = Array.isArray(lookup.data) ? lookup.data[0] as Summary | undefined : undefined;
      if (!row) throw new Error("Die laufende Partie wurde nicht gefunden.");
      setSummary(row);

      if (row.phase === "finished") {
        const finalResponse = await client.rpc("get_live_final_result", {
          target_game_id: activeIdentity.gameId,
        });
        if (finalResponse.error) throw new Error(finalResponse.error.message);
        setFinalResult(finalResponse.data as FinalResult);
      } else {
        setFinalResult(undefined);
      }

      if (row.phase === "role_transfer") {
        const resultResponse = await client.rpc("get_live_public_round_result", {
          target_game_id: activeIdentity.gameId,
          target_round: Number(row.current_round),
        });
        if (resultResponse.error) throw new Error(resultResponse.error.message);
        setPublicResult(resultResponse.data as PublicResult);

        if (activeIdentity.accessRole === "host") {
          const overviewResponse = await client.rpc("get_live_host_game_overview", {
            target_game_id: activeIdentity.gameId,
          });
          if (overviewResponse.error) throw new Error(overviewResponse.error.message);
          setOverview(overviewResponse.data as HostOverview);
          setPrivateState(undefined);
          setLobby([]);
        } else {
          const [lobbyResponse, privateResponse] = await Promise.all([
            client.rpc("get_public_lobby_members", { target_game_id: activeIdentity.gameId }),
            client.rpc("get_live_private_state", { target_game_id: activeIdentity.gameId }),
          ]);
          if (lobbyResponse.error) throw new Error(lobbyResponse.error.message);
          if (privateResponse.error) throw new Error(privateResponse.error.message);
          setLobby(((lobbyResponse.data ?? []) as RpcRow[]).map((entry) => ({
            memberId: asString(entry.member_id),
            displayName: asString(entry.display_name),
            attendanceStatus: asString(entry.attendance_status),
            winnerPoolStatus: asString(entry.winner_pool_status),
          })));
          setPrivateState(privateResponse.data as PrivateState);
          setOverview(undefined);
        }
      } else {
        setPublicResult(undefined);
        setPrivateState(undefined);
        setOverview(undefined);
        setLobby([]);
      }
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Übergangsstatus konnte nicht geladen werden.");
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    const sync = () => void refresh();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [refresh]);

  const currentPhase = summary?.phase;
  const currentRound = summary?.current_round;
  useEffect(() => {
    if (!currentPhase || !currentRound) return;
    const nextKey = `${currentPhase}:${currentRound}`;
    if (stageKeyRef.current === nextKey) return;
    stageKeyRef.current = nextKey;
    setError(undefined);
    setNotice(undefined);
    if (currentPhase === "role_transfer") {
      setResultPopupRound(currentRound);
      setDismissedHostRound(undefined);
    }
    if (currentPhase === "finished") setFinalOpen(true);
  }, [currentPhase, currentRound]);

  async function continueRound() {
    if (!identity) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const client = await ensureSession();
      const response = await client.rpc("continue_live_after_round", {
        target_game_id: identity.gameId,
      });
      if (response.error) throw new Error(response.error.message);
      const transition = response.data as { advanced?: boolean; nextRound?: number; reason?: string };
      if (!transition.advanced) {
        throw new Error(`Mission und Vorteil für Runde ${transition.nextRound ?? "?"} müssen zuerst in Andrés Gesamtübersicht festgelegt werden.`);
      }
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die nächste Runde konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCorkDecision(decision: "keep" | "release") {
    if (!identity) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const client = await ensureSession();
      const response = await client.rpc("submit_live_cork_decision", {
        target_game_id: identity.gameId,
        requested_decision: decision,
      });
      if (response.error) throw new Error(response.error.message);
      setNotice(decision === "keep"
        ? "Entscheidung gespeichert: Du bleibst Millionär."
        : "Entscheidung gespeichert: Der Millionär wird geheim neu ausgelost.");
      setResultPopupRound(undefined);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Entscheidung konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  if (!identity || !summary) return null;

  if (summary.phase === "finished" && finalResult?.published) {
    if (!finalOpen) {
      return <button className="smf-final-reopen" type="button" onClick={() => setFinalOpen(true)}>Finale und Rangliste anzeigen</button>;
    }
    return (
      <div className="smf-final-backdrop" data-finale-version="ranking-v2">
        <main className="smf-final-card" aria-labelledby="smf-final-title">
          <button className="smf-popup-close" type="button" aria-label="Finale schließen" onClick={() => setFinalOpen(false)}>×</button>
          <p className="smf-kicker">Secret Millionär · Finale</p>
          <h1 id="smf-final-title">{finalResult.winnerDisplayName} gewinnt.</h1>
          <p className="smf-final-reason">
            {finalResult.winnerReason === "millionaire_survived"
              ? `${finalResult.millionaireDisplayName} blieb bis zum Ende unenttarnt und gewinnt damit automatisch.`
              : `${finalResult.millionaireDisplayName} wurde in Runde 4 enttarnt. Der höchste Punktestand entscheidet.`}
          </p>

          <section className="smf-winner-banner">
            <span>Gewinner</span>
            <strong>{finalResult.winnerDisplayName}</strong>
            <small>{finalResult.ranking.find((entry) => entry.isWinner)?.totalPoints ?? 0} Punkte</small>
          </section>

          <section className="smf-ranking" aria-label="Finale Rangliste">
            <header><span>Rang</span><span>Mitspieler</span><span>Punkte</span></header>
            {finalResult.ranking.map((entry) => (
              <article className={entry.isWinner ? "winner" : ""} key={entry.memberId}>
                <b>{entry.rank}</b>
                <div>
                  <strong>{entry.displayName}</strong>
                  <small>{entry.correctGuesses} richtige Millionärs-Tipp{entry.correctGuesses === 1 ? "" : "s"}{entry.winnerPoolStatus !== "eligible" && !entry.isWinner ? " · zuvor ausgeschieden" : ""}</small>
                </div>
                <span>{entry.totalPoints}</span>
              </article>
            ))}
          </section>
        </main>
      </div>
    );
  }

  if (summary.phase !== "role_transfer") return null;

  if (identity.accessRole === "player") {
    const popupOpen = resultPopupRound === Number(summary.current_round);
    return (
      <div className="smf-between-rounds-lobby" data-between-rounds-lobby="v1">
        <main className="smf-lobby-shell">
          <header className="smf-lobby-header">
            <div>
              <p>Zwischen den Runden</p>
              <h1>Zurück in der Lobby</h1>
              <span>Runde {summary.current_round} ist abgeschlossen. Warte hier, bis die nächste Runde startet.</span>
            </div>
            <div className="smf-session-code"><small>Sitzungscode</small><strong>{identity.joinCode}</strong></div>
          </header>

          <section className="smf-lobby-status">
            <strong>{privateState?.roleDecisionRequired ? "Deine geheime Entscheidung ist noch offen." : "Die Spielleitung bereitet die nächste Runde vor."}</strong>
            <span>Du wirst automatisch weitergeleitet, sobald es weitergeht.</span>
            <button type="button" onClick={() => setResultPopupRound(Number(summary.current_round))}>
              {privateState?.roleDecisionRequired ? "Ergebnis und Entscheidung öffnen" : "Rundenergebnis anzeigen"}
            </button>
          </section>

          <section className="smf-lobby-players" aria-label="Mitspieler in der Lobby">
            <header><h2>Mitspieler</h2><span>{lobby.filter((member) => member.attendanceStatus === "present").length} anwesend</span></header>
            <div>
              {lobby.map((member) => (
                <article className={member.winnerPoolStatus} key={member.memberId}>
                  <b>{member.displayName.slice(0, 1).toUpperCase()}</b>
                  <span>{member.displayName}</span>
                  <small>{member.attendanceStatus === "present" ? "Anwesend" : "Nicht anwesend"}</small>
                </article>
              ))}
            </div>
          </section>

          {(error || notice) && <div className={`smf-lobby-message ${error ? "error" : "success"}`}>{error ?? notice}</div>}
        </main>

        {popupOpen && publicResult?.published && (
          <div className="smf-result-popup-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setResultPopupRound(undefined);
          }}>
            <section className="smf-result-popup" role="dialog" aria-modal="true" aria-labelledby="smf-result-title">
              <button className="smf-popup-close" type="button" aria-label="Rundenergebnis schließen" onClick={() => setResultPopupRound(undefined)}>×</button>
              <p>Runde {publicResult.round} · Ergebnis</p>
              <h2 id="smf-result-title">Die Stimmen sind ausgezählt.</h2>
              <div className="smf-result-tally">
                {publicResult.tally.map((entry, index) => (
                  <article className={entry.memberId === publicResult.eliminatedMemberId ? "eliminated" : ""} key={entry.memberId}>
                    <span>{index + 1}</span><strong>{entry.displayName}</strong><b>{entry.totalVotes}</b>
                  </article>
                ))}
              </div>
              <div className="smf-eliminated"><span>Aus dem Gewinnerpool ausgeschieden</span><strong>{publicResult.eliminatedDisplayName}</strong></div>

              {privateState?.roleDecisionRequired ? (
                <div className="smf-cork-decision">
                  <p>Nur für dich als Millionär sichtbar</p>
                  <h3>Möchtest du Millionär bleiben oder die Rolle geheim zufällig weitergeben?</h3>
                  <div>
                    <button disabled={busy} type="button" onClick={() => void submitCorkDecision("keep")}>♛ Millionär bleiben</button>
                    <button disabled={busy} type="button" onClick={() => void submitCorkDecision("release")}>↻ Zufällig weitergeben</button>
                  </div>
                </div>
              ) : privateState?.roleDecision ? (
                <div className="smf-decision-confirmed">✓ Deine geheime Entscheidung wurde gespeichert.</div>
              ) : (
                <div className="smf-waiting-note">Warte auf die geheime Entscheidung des aktuellen Millionärs und auf André.</div>
              )}
              {(error || notice) && <div className={`smf-lobby-message ${error ? "error" : "success"}`}>{error ?? notice}</div>}
            </section>
          </div>
        )}
      </div>
    );
  }

  if (!overview || dismissedHostRound === Number(summary.current_round)) return null;
  const hostRound = overview.rounds.find((round) => round.round === Number(summary.current_round));
  if (!hostRound?.result) return null;

  const decisionReady = Boolean(hostRound.roleDecision);
  return (
    <aside className="smf-transition-card" data-round-transition="closable-v2">
      <button className="smf-transition-close" type="button" aria-label="Rundenmeldung schließen" onClick={() => setDismissedHostRound(Number(summary.current_round))}>×</button>
      <p>Runde {summary.current_round} abgeschlossen</p>
      <strong>{hostRound.result.eliminatedDisplayName} ist ausgeschieden.</strong>
      <span>
        {hostRound.result.millionaireSurvived
          ? decisionReady
            ? "Die Entscheidung des Millionärs liegt vor."
            : `Warte auf die geheime Entscheidung von ${hostRound.result.millionaireDisplayName}.`
          : "Der Millionär wurde enttarnt. Der Nachfolger ist geheim ausgelost."}
      </span>
      {decisionReady && Number(summary.current_round) < 4 && (
        <button type="button" disabled={busy} onClick={() => void continueRound()}>
          {busy ? "Runde wird vorbereitet …" : `Runde ${Number(summary.current_round) + 1} starten`}
        </button>
      )}
      {error && <em>{error}</em>}
    </aside>
  );
}
