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
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [finalResult, setFinalResult] = useState<FinalResult>();
  const [overview, setOverview] = useState<HostOverview>();
  const [busy, setBusy] = useState(false);
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

      if (activeIdentity.accessRole === "host" && row.phase === "role_transfer") {
        const overviewResponse = await client.rpc("get_live_host_game_overview", {
          target_game_id: activeIdentity.gameId,
        });
        if (overviewResponse.error) throw new Error(overviewResponse.error.message);
        setOverview(overviewResponse.data as HostOverview);
      } else {
        setOverview(undefined);
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

  async function continueRound() {
    if (!identity) return;
    setBusy(true);
    setError(undefined);
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

  if (!identity || !summary) return null;

  if (summary.phase === "finished" && finalResult?.published) {
    return (
      <div className="smf-final-backdrop" data-finale-version="ranking-v1">
        <main className="smf-final-card" aria-labelledby="smf-final-title">
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

  if (identity.accessRole !== "host" || summary.phase !== "role_transfer" || !overview) return null;

  const currentRound = overview.rounds.find((round) => round.round === Number(summary.current_round));
  if (!currentRound?.result) return null;

  const decisionReady = Boolean(currentRound.roleDecision);
  return (
    <aside className="smf-transition-card" data-round-transition="v1">
      <p>Runde {summary.current_round} abgeschlossen</p>
      <strong>{currentRound.result.eliminatedDisplayName} ist ausgeschieden.</strong>
      <span>
        {currentRound.result.millionaireSurvived
          ? decisionReady
            ? "Die Entscheidung des Millionärs liegt vor."
            : `Warte auf die geheime Entscheidung von ${currentRound.result.millionaireDisplayName}.`
          : `Der Millionär wurde enttarnt. Der Nachfolger ist geheim ausgelost.`}
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
