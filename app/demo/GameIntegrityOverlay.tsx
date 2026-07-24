"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MISSIONS } from "@/lib/game/catalog";
import { PHASE_LABELS } from "@/lib/game/constants";
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
  game_id: string;
  title: string;
  join_code: string;
  current_round: number;
  phase: string;
  revision: number;
};

type LobbyMember = {
  memberId: string;
  displayName: string;
  avatarPath?: string;
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
  role?: "millionaire" | "investigator" | "none";
  mission?: {
    catalog_id: string;
    title_snapshot: string;
    task_snapshot: string;
    status: "assigned" | "completed" | "failed";
  };
  advantage?: {
    catalog_id: string;
    effect: "double_vote" | "triple_vote" | "redirect_vote";
    title_snapshot: string;
    description_snapshot: string;
    source_target_member_id?: string;
    target_member_id?: string;
    used_at?: string;
  };
  roleDecisionRequired?: boolean;
  roleDecision?: {
    decision: "keep" | "release" | "replacement";
    targetMemberId?: string;
    submittedAt?: string;
  };
};

type OverviewPlayer = {
  memberId: string;
  displayName: string;
  avatarPath?: string;
  attendanceStatus: string;
  winnerPoolStatus: string;
  eliminatedInRound?: number;
  departedInRound?: number;
  exitReason?: string;
  currentRole: string;
  isCurrentMillionaire: boolean;
  totalPoints: number;
  correctGuesses: number;
  screenKey?: string;
  stepKey?: string;
  lastSeenAt?: string;
};

type OverviewRound = {
  round: number;
  title: string;
  points: number;
  missionStatus: string;
  mission?: {
    catalogId: string;
    title: string;
    status: string;
    assignedMemberId: string;
    assignedDisplayName: string;
    reviewedAt?: string;
  };
  advantage?: {
    effect: string;
    title: string;
    actorDisplayName: string;
    sourceDisplayName?: string;
    targetDisplayName?: string;
    selectedAt?: string;
  };
  challenge?: {
    title?: string;
    teamsDrawnAt?: string;
    winningTeam?: string;
    questionerDisplayName?: string;
    questionCompletedAt?: string;
  };
  result?: {
    millionaireDisplayName: string;
    eliminatedDisplayName: string;
    millionaireSurvived: boolean;
    regularTally: Array<{ memberId: string; displayName: string; votes: number }>;
    effectiveTally: Array<{ memberId: string; displayName: string; totalVotes: number }>;
    tieResolvedRandomly: boolean;
    publishedAt?: string;
  };
  roleDecision?: {
    decision: string;
    memberDisplayName: string;
    targetDisplayName?: string;
    submittedAt?: string;
  };
  scores: Array<{ memberId: string; displayName: string; points: number; correctGuess: boolean }>;
};

type HostOverview = {
  game: {
    gameId: string;
    title: string;
    joinCode: string;
    currentRound: number;
    phase: string;
    revision: number;
    currentMillionaireMemberId?: string;
    currentMillionaireDisplayName?: string;
  };
  players: OverviewPlayer[];
  rounds: OverviewRound[];
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

function Avatar({ name, src }: { name: string; src?: string }) {
  return (
    <span className="sgi-avatar">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function GameIntegrityOverlay() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshingRef = useRef(false);
  const [identity, setIdentity] = useState<Identity>();
  const [summary, setSummary] = useState<Summary>();
  const [lobby, setLobby] = useState<LobbyMember[]>([]);
  const [privateState, setPrivateState] = useState<PrivateState>();
  const [publicResult, setPublicResult] = useState<PublicResult>();
  const [overview, setOverview] = useState<HostOverview>();
  const [hostOpen, setHostOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundNumber>(1);
  const [selectedMissionId, setSelectedMissionId] = useState(MISSIONS[0]?.id ?? "");
  const [advantageEffect, setAdvantageEffect] = useState<"double_vote" | "triple_vote" | "redirect_vote">("double_vote");
  const [sourceMemberId, setSourceMemberId] = useState("");
  const [targetMemberId, setTargetMemberId] = useState("");
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
        options: { data: { application: "secret-millionaer", purpose: "integrity-overlay" } },
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
      const summaryRow = Array.isArray(lookup.data) ? lookup.data[0] as Summary | undefined : undefined;
      if (!summaryRow) throw new Error("Die laufende Partie wurde nicht gefunden.");
      setSummary(summaryRow);
      setSelectedRound((current) => current || Number(summaryRow.current_round) as RoundNumber);

      const lobbyResult = await client.rpc("get_public_lobby_members", { target_game_id: activeIdentity.gameId });
      if (lobbyResult.error) throw new Error(lobbyResult.error.message);
      const mappedLobby = ((lobbyResult.data ?? []) as RpcRow[]).map((row) => ({
        memberId: asString(row.member_id),
        displayName: asString(row.display_name),
        avatarPath: asString(row.avatar_path) || undefined,
        attendanceStatus: asString(row.attendance_status),
        winnerPoolStatus: asString(row.winner_pool_status),
      }));
      setLobby(mappedLobby);

      const resultResponse = await client.rpc("get_live_public_round_result", {
        target_game_id: activeIdentity.gameId,
        target_round: Number(summaryRow.current_round),
      });
      if (!resultResponse.error) setPublicResult(resultResponse.data as PublicResult);

      if (activeIdentity.accessRole === "host") {
        const hostResponse = await client.rpc("get_live_host_game_overview", { target_game_id: activeIdentity.gameId });
        if (hostResponse.error) throw new Error(hostResponse.error.message);
        const nextOverview = hostResponse.data as HostOverview;
        setOverview(nextOverview);
        setSelectedRound((current) => nextOverview.rounds.some((round) => round.round === current)
          ? current
          : Number(nextOverview.game.currentRound) as RoundNumber);
        setPrivateState(undefined);
      } else {
        const privateResponse = await client.rpc("get_live_private_state", { target_game_id: activeIdentity.gameId });
        if (privateResponse.error) throw new Error(privateResponse.error.message);
        setPrivateState(privateResponse.data as PrivateState);
        setOverview(undefined);
      }
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Live-Spielstand konnte nicht geladen werden.");
    } finally {
      refreshingRef.current = false;
    }
  }, [ensureSession]);

  useEffect(() => {
    setIdentity(readIdentity());
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    const syncIdentity = () => void refresh();
    window.addEventListener("storage", syncIdentity);
    window.addEventListener("focus", syncIdentity);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", syncIdentity);
      window.removeEventListener("focus", syncIdentity);
    };
  }, [refresh]);

  useEffect(() => {
    if (!overview) return;
    const round = overview.rounds.find((entry) => entry.round === selectedRound);
    setSelectedMissionId(round?.mission?.catalogId ?? MISSIONS[0]?.id ?? "");
  }, [overview, selectedRound]);

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

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Aktion ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMission() {
    if (!identity) return;
    const mission = MISSIONS.find((entry) => entry.id === selectedMissionId);
    if (!mission) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("select_live_round_mission", {
        target_game_id: identity.gameId,
        target_round: selectedRound,
        mission_catalog_id: mission.id,
        mission_title: mission.title,
        mission_task: mission.task,
        mission_success_criteria: mission.successCriteria,
        mission_time_window: mission.timeWindow,
      });
      if (response.error) throw new Error(response.error.message);
    }, `Mission für Runde ${selectedRound} gespeichert.`);
  }

  async function markMission(status: "completed" | "failed") {
    if (!identity) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("mark_live_mission_status", {
        target_game_id: identity.gameId,
        target_round: selectedRound,
        requested_status: status,
      });
      if (response.error) throw new Error(response.error.message);
    }, status === "completed" ? "Mission erfolgreich – Vorteil beim Millionär freigeschaltet." : "Mission als gescheitert markiert.");
  }

  async function chooseAdvantage() {
    if (!identity || !summary) return;
    if (advantageEffect === "redirect_vote" && (!sourceMemberId || !targetMemberId || sourceMemberId === targetMemberId)) {
      setError("Für die Umleitung müssen zwei verschiedene Spieler ausgewählt werden.");
      return;
    }
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("choose_live_millionaire_advantage", {
        target_game_id: identity.gameId,
        target_round: Number(summary.current_round),
        requested_effect: advantageEffect,
        requested_source_member_id: advantageEffect === "redirect_vote" ? sourceMemberId : null,
        requested_target_member_id: advantageEffect === "redirect_vote" ? targetMemberId : null,
      });
      if (response.error) throw new Error(response.error.message);
    }, "Dein geheimer Vorteil wurde versiegelt.");
  }

  async function finalizeVote() {
    if (!identity || !summary) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("finalize_live_round_vote", {
        target_game_id: identity.gameId,
        target_round: Number(summary.current_round),
      });
      if (response.error) throw new Error(response.error.message);
    }, "Abstimmung ausgewertet und Ergebnis veröffentlicht.");
  }

  async function submitCorkDecision(decision: "keep" | "release") {
    if (!identity) return;
    await runAction(async () => {
      const client = await ensureSession();
      const response = await client.rpc("submit_live_cork_decision", {
        target_game_id: identity.gameId,
        requested_decision: decision,
      });
      if (response.error) throw new Error(response.error.message);
    }, decision === "keep" ? "Du behältst den goldenen Korken." : "Der goldene Korken wird geheim und zufällig weitergegeben.");
  }

  if (!identity || !summary) return null;

  const currentRoundOverview = overview?.rounds.find((round) => round.round === selectedRound);
  const currentRoundNumber = Number(summary.current_round) as RoundNumber;
  const phase = asString(summary.phase);
  const millionaireMustChoose = identity.accessRole === "player"
    && privateState?.role === "millionaire"
    && privateState.mission?.status === "completed"
    && phase === "advantage";
  const showPlayerResult = identity.accessRole === "player"
    && publicResult?.published
    && (phase === "result" || phase === "role_transfer");

  return (
    <div className="sgi-root" data-core-game-flow="restored-v1">
      {identity.accessRole === "host" && (
        <>
          <button className="sgi-host-trigger" type="button" onClick={() => setHostOpen(true)}>
            <span>♛</span>
            André · Gesamtübersicht
          </button>
          {hostOpen && overview && (
            <div className="sgi-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setHostOpen(false);
            }}>
              <section className="sgi-host-drawer" role="dialog" aria-modal="true" aria-labelledby="sgi-host-title">
                <header className="sgi-drawer-head">
                  <div>
                    <p>Geheime Spielleitung</p>
                    <h2 id="sgi-host-title">Andrés Gesamtübersicht</h2>
                    <span>Runde {overview.game.currentRound} · {PHASE_LABELS[overview.game.phase as keyof typeof PHASE_LABELS] ?? overview.game.phase}</span>
                  </div>
                  <button type="button" onClick={() => setHostOpen(false)} aria-label="Übersicht schließen">×</button>
                </header>

                <div className="sgi-metrics">
                  <article><span>Aktueller Millionär</span><strong>{overview.game.currentMillionaireDisplayName ?? "Wird neu ausgelost"}</strong></article>
                  <article><span>Noch im Gewinnerpool</span><strong>{overview.players.filter((player) => player.winnerPoolStatus === "eligible").length}</strong></article>
                  <article><span>Ausgeschieden</span><strong>{overview.players.filter((player) => player.winnerPoolStatus === "eliminated").length}</strong></article>
                  <article><span>Teilnehmer gesamt</span><strong>{overview.players.length}</strong></article>
                </div>

                <nav className="sgi-round-tabs" aria-label="Runden auswählen">
                  {overview.rounds.map((round) => (
                    <button className={selectedRound === round.round ? "active" : ""} type="button" onClick={() => setSelectedRound(round.round as RoundNumber)} key={round.round}>
                      Runde {round.round}<small>{round.points} Punkt{round.points === 1 ? "" : "e"}</small>
                    </button>
                  ))}
                </nav>

                <div className="sgi-host-grid">
                  <section className="sgi-panel sgi-mission-control">
                    <header><div><p>Geheime Mission</p><h3>Runde {selectedRound} vorbereiten</h3></div><span>{currentRoundOverview?.mission?.status ?? "Noch nicht zugewiesen"}</span></header>
                    <label><span>Mission auswählen</span><select value={selectedMissionId} onChange={(event) => setSelectedMissionId(event.target.value)}>{MISSIONS.map((mission) => <option value={mission.id} key={mission.id}>{mission.title} · {mission.difficulty ?? "mittel"}</option>)}</select></label>
                    <button className="primary" disabled={busy} type="button" onClick={() => void saveMission()}>Mission für Runde {selectedRound} speichern</button>
                    {currentRoundOverview?.mission && (
                      <div className="sgi-mission-status">
                        <strong>{currentRoundOverview.mission.title}</strong>
                        <span>Geheim zugeteilt an {currentRoundOverview.mission.assignedDisplayName}</span>
                        {selectedRound === currentRoundNumber && (
                          <div><button className="success" disabled={busy} type="button" onClick={() => void markMission("completed")}>✓ Erfolgreich</button><button className="danger" disabled={busy} type="button" onClick={() => void markMission("failed")}>✕ Gescheitert</button></div>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="sgi-panel">
                    <header><div><p>Geheimer Vorteil</p><h3>Auswahl des Millionärs</h3></div></header>
                    {currentRoundOverview?.advantage ? (
                      <div className="sgi-secret-detail">
                        <strong>{currentRoundOverview.advantage.title}</strong>
                        <span>Gewählt von {currentRoundOverview.advantage.actorDisplayName}</span>
                        {currentRoundOverview.advantage.sourceDisplayName && <span>Ausgangsziel: {currentRoundOverview.advantage.sourceDisplayName}</span>}
                        {currentRoundOverview.advantage.targetDisplayName && <span>Endziel: {currentRoundOverview.advantage.targetDisplayName}</span>}
                      </div>
                    ) : currentRoundOverview?.mission?.status === "completed" ? <div className="sgi-waiting">Warte auf die geheime Auswahl des Millionärs.</div> : <div className="sgi-waiting">Der Vorteil wird erst nach einer erfolgreichen Mission freigeschaltet.</div>}
                  </section>

                  <section className="sgi-panel">
                    <header><div><p>Rundenergebnis</p><h3>Abstimmung und Ausscheiden</h3></div></header>
                    {currentRoundOverview?.result ? (
                      <div className="sgi-result-secret">
                        <strong>{currentRoundOverview.result.eliminatedDisplayName} ist aus dem Gewinnerpool ausgeschieden.</strong>
                        <span>Millionär der Runde: {currentRoundOverview.result.millionaireDisplayName}</span>
                        <span>{currentRoundOverview.result.millionaireSurvived ? "Millionär überlebt – Korkenentscheidung erforderlich." : "Millionär enttarnt – Nachfolger wurde geheim ausgelost."}</span>
                        {currentRoundOverview.result.tieResolvedRandomly && <em>Gleichstand wurde zufällig aufgelöst.</em>}
                      </div>
                    ) : selectedRound === currentRoundNumber && phase === "evaluation" ? (
                      <button className="primary" disabled={busy} type="button" onClick={() => void finalizeVote()}>Abstimmung auswerten & Person ausschließen</button>
                    ) : <div className="sgi-waiting">Noch kein veröffentlichtes Ergebnis.</div>}
                    {currentRoundOverview?.roleDecision && <div className="sgi-role-decision"><span>Korkenentscheidung</span><strong>{currentRoundOverview.roleDecision.decision === "keep" ? "Behalten" : currentRoundOverview.roleDecision.decision === "replacement" ? "Automatischer Ersatz" : "Zufällig weitergegeben"}</strong>{currentRoundOverview.roleDecision.targetDisplayName && <small>Geheimes Ziel: {currentRoundOverview.roleDecision.targetDisplayName}</small>}</div>}
                  </section>

                  <section className="sgi-panel sgi-score-panel">
                    <header><div><p>Geheime Punkte</p><h3>Korrekte Millionär-Tipps</h3></div></header>
                    {currentRoundOverview?.scores?.length ? currentRoundOverview.scores.map((score) => (
                      <div className={score.correctGuess ? "correct" : ""} key={score.memberId}><span>{score.displayName}</span><strong>{score.points} P.</strong></div>
                    )) : <div className="sgi-waiting">Noch keine Auswertung.</div>}
                  </section>
                </div>

                <section className="sgi-panel sgi-player-overview">
                  <header><div><p>Gesamtübersicht Spieler</p><h3>Rolle, Status, Punkte und technischer Stand</h3></div></header>
                  <div className="sgi-player-grid">
                    {overview.players.map((player) => (
                      <article className={`${player.winnerPoolStatus} ${player.isCurrentMillionaire ? "millionaire" : ""}`} key={player.memberId}>
                        <div className="sgi-person"><Avatar name={player.displayName} src={player.avatarPath} /><div><strong>{player.displayName}</strong><span>{player.isCurrentMillionaire ? "♛ Aktueller Millionär" : player.currentRole === "investigator" ? "Ermittler" : "Keine aktive Rolle"}</span></div></div>
                        <dl><div><dt>Gewinnerpool</dt><dd>{player.winnerPoolStatus === "eligible" ? "Noch drin" : player.winnerPoolStatus === "eliminated" ? `Raus seit Runde ${player.eliminatedInRound ?? "?"}` : "Disqualifiziert"}</dd></div><div><dt>Anwesenheit</dt><dd>{player.attendanceStatus}</dd></div><div><dt>Punkte</dt><dd>{player.totalPoints}</dd></div><div><dt>Treffer</dt><dd>{player.correctGuesses}</dd></div></dl>
                        <small>{player.screenKey ?? "offline"} · {player.stepKey ?? "kein Status"}</small>
                      </article>
                    ))}
                  </div>
                </section>

                {(error || notice) && <div className={`sgi-message ${error ? "error" : "success"}`}>{error ?? notice}</div>}
              </section>
            </div>
          )}
        </>
      )}

      {millionaireMustChoose && (
        <div className="sgi-player-stage">
          <section className="sgi-advantage-stage">
            <p>Mission erfolgreich · nur für dich sichtbar</p>
            <h2>Wähle deinen geheimen Vorteil</h2>
            {privateState?.advantage?.used_at ? (
              <div className="sgi-choice-confirmed"><span>✓</span><strong>{privateState.advantage.title_snapshot}</strong><small>Die Auswahl ist versiegelt und wird automatisch in der Abstimmung berücksichtigt.</small></div>
            ) : (
              <>
                <div className="sgi-advantage-options">
                  <button className={advantageEffect === "double_vote" ? "active" : ""} type="button" onClick={() => setAdvantageEffect("double_vote")}><b>2×</b><strong>Doppelte Stimme</strong><span>Dein später gewähltes Ziel erhält insgesamt zwei Stimmen von dir.</span></button>
                  <button className={advantageEffect === "triple_vote" ? "active" : ""} type="button" onClick={() => setAdvantageEffect("triple_vote")}><b>3×</b><strong>Dreifache Stimme</strong><span>Dein später gewähltes Ziel erhält insgesamt drei Stimmen von dir.</span></button>
                  <button className={advantageEffect === "redirect_vote" ? "active" : ""} type="button" onClick={() => setAdvantageEffect("redirect_vote")}><b>↪</b><strong>Goldene Umleitung</strong><span>Wähle ein Ausgangsziel und ein anderes Endziel. Das Endziel erhält durch dich insgesamt zwei Stimmen.</span></button>
                </div>
                {advantageEffect === "redirect_vote" && (
                  <div className="sgi-redirect-grid">
                    <label><span>Stimme wegnehmen von</span><select value={sourceMemberId} onChange={(event) => setSourceMemberId(event.target.value)}>{candidates.map((member) => <option value={member.memberId} key={member.memberId}>{member.displayName}</option>)}</select></label>
                    <label><span>Stimmen geben an</span><select value={targetMemberId} onChange={(event) => setTargetMemberId(event.target.value)}>{candidates.filter((member) => member.memberId !== sourceMemberId).map((member) => <option value={member.memberId} key={member.memberId}>{member.displayName}</option>)}</select></label>
                  </div>
                )}
                <button className="sgi-seal-button" disabled={busy || (advantageEffect === "redirect_vote" && (!sourceMemberId || !targetMemberId || sourceMemberId === targetMemberId))} type="button" onClick={() => void chooseAdvantage()}>{busy ? "Wird versiegelt …" : "Vorteil geheim versiegeln"}</button>
              </>
            )}
            {(error || notice) && <div className={`sgi-message ${error ? "error" : "success"}`}>{error ?? notice}</div>}
          </section>
        </div>
      )}

      {showPlayerResult && publicResult && (
        <div className="sgi-player-stage result">
          <section className="sgi-public-result">
            <p>Runde {publicResult.round} · öffentliches Ergebnis</p>
            <h2>Die Stimmen sind ausgezählt.</h2>
            <div className="sgi-public-tally">
              {publicResult.tally.map((entry, index) => (
                <article className={entry.memberId === publicResult.eliminatedMemberId ? "eliminated" : ""} key={entry.memberId}>
                  <span>{index + 1}</span><strong>{entry.displayName}</strong><b>{entry.totalVotes} Stimme{entry.totalVotes === 1 ? "" : "n"}</b>
                </article>
              ))}
            </div>
            <div className="sgi-eliminated-banner"><span>Aus dem Gewinnerpool ausgeschieden</span><strong>{publicResult.eliminatedDisplayName}</strong><small>Die Person darf weiter diskutieren, abstimmen und bluffen, kann den Hauptgewinn aber nicht mehr gewinnen.</small></div>
            {privateState?.roleDecisionRequired ? (
              <div className="sgi-cork-choice">
                <p>Nur für dich als Millionär sichtbar</p>
                <h3>Du hast überlebt. Was geschieht mit dem goldenen Korken?</h3>
                <div><button disabled={busy} type="button" onClick={() => void submitCorkDecision("keep")}>♛ Korken behalten</button><button disabled={busy} type="button" onClick={() => void submitCorkDecision("release")}>↻ Geheim zufällig weitergeben</button></div>
              </div>
            ) : privateState?.roleDecision ? (
              <div className="sgi-choice-confirmed"><span>✓</span><strong>Korkenentscheidung versiegelt</strong><small>{privateState.roleDecision.decision === "keep" ? "Du bleibst in der nächsten Runde Millionär." : "Der Nachfolger wurde geheim und zufällig bestimmt."}</small></div>
            ) : phase === "role_transfer" ? <div className="sgi-waiting public">Die geheime Korkenentscheidung läuft. Warte auf André.</div> : null}
            {(error || notice) && <div className={`sgi-message ${error ? "error" : "success"}`}>{error ?? notice}</div>}
          </section>
        </div>
      )}
    </div>
  );
}
