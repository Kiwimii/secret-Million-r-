"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = {
  accessRole: "host" | "player";
  gameId: string;
  joinCode: string;
};

type Summary = {
  current_round: number;
  phase: string;
};

type VoteRow = {
  memberId: string;
  displayName: string;
  votes?: number;
  totalVotes?: number;
};

type OverviewRound = {
  round: number;
  result?: {
    millionaireDisplayName: string;
    eliminatedDisplayName: string;
    millionaireSurvived: boolean;
    regularTally: VoteRow[];
    effectiveTally: VoteRow[];
    tieResolvedRandomly: boolean;
  };
};

type HostOverview = {
  rounds: OverviewRound[];
};

type CandidateState = {
  available: boolean;
  afterRound?: number;
  nextRound?: number;
  decision?: "keep" | "release" | "replacement";
  candidateMemberId?: string;
  candidateDisplayName?: string;
  hostConfirmedAt?: string;
  requiresHostConfirmation?: boolean;
  canReroll?: boolean;
  rejectedCount?: number;
  roundPackageReady?: boolean;
};

type PenaltyState = {
  round: number;
  memberId?: string;
  displayName?: string;
  penaltyVotes: number;
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

export default function HostSecretRoundControls() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [overview, setOverview] = useState<HostOverview>();
  const [candidate, setCandidate] = useState<CandidateState>();
  const [penalties, setPenalties] = useState<PenaltyState[]>([]);
  const [transitionSlot, setTransitionSlot] = useState<HTMLElement | null>(null);
  const [hostGridSlot, setHostGridSlot] = useState<HTMLElement | null>(null);
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
        options: { data: { application: "secret-millionaer", purpose: "host-secret-round-controls" } },
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
      const nextSummary = Array.isArray(lookup.data) ? lookup.data[0] as Summary | undefined : undefined;
      if (!nextSummary) throw new Error("Die laufende Partie wurde nicht gefunden.");
      setSummary(nextSummary);

      const [overviewResponse, penaltiesResponse] = await Promise.all([
        client.rpc("get_live_host_game_overview", { target_game_id: activeIdentity.gameId }),
        client.rpc("get_live_host_round_penalties", { target_game_id: activeIdentity.gameId }),
      ]);
      if (overviewResponse.error) throw new Error(overviewResponse.error.message);
      if (penaltiesResponse.error) throw new Error(penaltiesResponse.error.message);
      setOverview(overviewResponse.data as HostOverview);
      setPenalties((penaltiesResponse.data ?? []) as PenaltyState[]);

      if (nextSummary.phase === "role_transfer") {
        const candidateResponse = await client.rpc("get_live_next_millionaire_candidate", {
          target_game_id: activeIdentity.gameId,
        });
        if (candidateResponse.error) throw new Error(candidateResponse.error.message);
        setCandidate(candidateResponse.data as CandidateState);
      } else {
        setCandidate(undefined);
      }
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die geheimen Host-Daten konnten nicht geladen werden.");
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2200);
    const sync = () => void refresh();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, [refresh]);

  useEffect(() => {
    const locate = () => {
      const nextTransition = document.querySelector<HTMLElement>(".smf-transition-card");
      const nextGrid = document.querySelector<HTMLElement>(".sgi-host-grid");
      setTransitionSlot((current) => current === nextTransition ? current : nextTransition);
      setHostGridSlot((current) => current === nextGrid ? current : nextGrid);
    };

    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const managesRandomCandidate = Boolean(
    summary?.phase === "role_transfer"
    && candidate?.available
    && candidate.canReroll,
  );

  useEffect(() => {
    if (!transitionSlot) return;
    transitionSlot.classList.toggle("hsc-candidate-managed", managesRandomCandidate);
    return () => transitionSlot.classList.remove("hsc-candidate-managed");
  }, [managesRandomCandidate, transitionSlot]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setMessage(undefined);
    setError(undefined);
    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Aktion ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function rerollCandidate() {
    if (!identity) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("reroll_live_next_millionaire", {
        target_game_id: identity.gameId,
      });
      if (response.error) throw new Error(response.error.message);
      const next = response.data as { candidateDisplayName?: string };
      setMessage(`${next.candidateDisplayName ?? "Ein neuer Spieler"} wurde geheim neu ausgelost.`);
    });
  }

  async function confirmCandidate() {
    if (!identity) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("confirm_live_next_millionaire", {
        target_game_id: identity.gameId,
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data as {
        candidateDisplayName?: string;
        transition?: { advanced?: boolean; nextRound?: number; reason?: string };
      };
      if (result.transition?.advanced) {
        setMessage(`Bestätigt. Runde ${result.transition.nextRound ?? ""} wurde gestartet.`);
      } else if (result.transition?.reason === "round_package_missing") {
        setMessage(`${result.candidateDisplayName ?? "Der neue Millionär"} ist bestätigt. Lege jetzt Mission und Vorteil für Runde ${result.transition.nextRound ?? ""} fest.`);
      } else {
        setMessage(`${result.candidateDisplayName ?? "Der neue Millionär"} wurde geheim bestätigt.`);
      }
    });
  }

  async function continueRound() {
    if (!identity) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("continue_live_after_round", {
        target_game_id: identity.gameId,
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data as { advanced?: boolean; nextRound?: number; reason?: string };
      if (!result.advanced) {
        if (result.reason === "round_package_missing") {
          throw new Error(`Mission und Vorteil für Runde ${result.nextRound ?? "?"} fehlen noch.`);
        }
        throw new Error("Der nächste Millionär muss zuerst bestätigt werden.");
      }
      setMessage(`Runde ${result.nextRound ?? ""} wurde gestartet.`);
    });
  }

  const completedRounds = useMemo(
    () => (overview?.rounds ?? []).filter((round) => Boolean(round.result)),
    [overview],
  );

  if (!identity) return null;

  const candidatePortal = transitionSlot && managesRandomCandidate && candidate?.candidateDisplayName
    ? createPortal(
      <section className="hsc-candidate-control" data-secret-candidate-control="reroll-v1">
        <p>Nur für André sichtbar · geheimer Nachfolger</p>
        <strong>{candidate.candidateDisplayName}</strong>
        <span>
          {candidate.decision === "replacement"
            ? "Automatisch ausgelost, weil der Millionär enttarnt wurde."
            : "Zufällig ausgelost, weil der goldene Korken weitergegeben wurde."}
        </span>
        {candidate.requiresHostConfirmation ? (
          <>
            <small>Der Spieler erfährt noch nichts. Du kannst ihn bestätigen oder ablehnen und erneut zufällig auslosen.</small>
            <div className="hsc-actions">
              <button className="reject" disabled={busy} type="button" onClick={() => void rerollCandidate()}>
                ↻ Ablehnen & neu auslosen
              </button>
              <button className="accept" disabled={busy} type="button" onClick={() => void confirmCandidate()}>
                ✓ Als neuen Millionär bestätigen
              </button>
            </div>
          </>
        ) : (
          <>
            <small>Geheim bestätigt. {candidate.roundPackageReady ? "Die nächste Runde kann starten." : "Mission und Vorteil der nächsten Runde fehlen noch."}</small>
            {candidate.roundPackageReady && (
              <div className="hsc-actions single">
                <button className="accept" disabled={busy} type="button" onClick={() => void continueRound()}>
                  Runde {candidate.nextRound} starten
                </button>
              </div>
            )}
          </>
        )}
        {candidate.rejectedCount ? <em>{candidate.rejectedCount} Kandidat{candidate.rejectedCount === 1 ? "" : "en"} zuvor abgelehnt</em> : null}
        {(message || error) && <div className={`hsc-feedback ${error ? "error" : "success"}`}>{error ?? message}</div>}
      </section>,
      transitionSlot,
    ) : null;

  const resultsPortal = hostGridSlot && completedRounds.length
    ? createPortal(
      <section className="sgi-panel hsc-vote-results" data-host-vote-results="full-v1">
        <header>
          <div><p>Geheime Abstimmungsergebnisse</p><h3>Reguläre und effektive Stimmen</h3></div>
          <span>{completedRounds.length} Runde{completedRounds.length === 1 ? "" : "n"}</span>
        </header>
        <div className="hsc-round-results">
          {completedRounds.map((round) => {
            const result = round.result!;
            const regularByMember = new Map(
              (result.regularTally ?? []).map((entry) => [entry.memberId, Number(entry.votes ?? 0)]),
            );
            const penalty = penalties.find((entry) => Number(entry.round) === Number(round.round) && Number(entry.penaltyVotes) > 0);
            return (
              <article key={round.round}>
                <div className="hsc-result-head">
                  <div><b>Runde {round.round}</b><span>{result.eliminatedDisplayName} ausgeschieden</span></div>
                  <small>Millionär: {result.millionaireDisplayName}</small>
                </div>
                {penalty && (
                  <div className="hsc-penalty-note">
                    Challenge gescheitert: +{penalty.penaltyVotes} Stimmen gegen {penalty.displayName}
                  </div>
                )}
                <div className="hsc-tally">
                  {(result.effectiveTally ?? []).map((entry) => {
                    const regular = regularByMember.get(entry.memberId) ?? 0;
                    const effective = Number(entry.totalVotes ?? 0);
                    const adjustment = effective - regular;
                    return (
                      <div className={entry.displayName === result.eliminatedDisplayName ? "eliminated" : ""} key={entry.memberId}>
                        <span>{entry.displayName}</span>
                        <small>{regular} regulär{adjustment ? ` · ${adjustment > 0 ? "+" : ""}${adjustment} Anpassung` : ""}</small>
                        <strong>{effective}</strong>
                      </div>
                    );
                  })}
                </div>
                {result.tieResolvedRandomly && <em>Ein Gleichstand wurde zufällig aufgelöst.</em>}
              </article>
            );
          })}
        </div>
        <small className="hsc-tally-note">Effektive Stimmen enthalten den geheimen Vorteil und gegebenenfalls den Challenge-Malus.</small>
      </section>,
      hostGridSlot,
    ) : null;

  return <>{candidatePortal}{resultsPortal}</>;
}
