"use client";

import { useMemo, useState } from "react";
import { ADVANTAGES, MISSIONS } from "@/lib/game/catalog";
import { PHASE_LABELS, PLAYER_NAMES, ROUND_PHASES, ROUNDS } from "@/lib/game/constants";
import {
  advanceGame,
  applyPlayerLifecycleChange,
  getEligibleMillionaireCandidates,
  getNextGameStep,
  getPlayerCapabilities,
  setMillionaire,
} from "@/lib/game/engine";
import type {
  GameState,
  MissionStatus,
  PlayerLifecycleAction,
  PlayerState,
  RoundNumber,
} from "@/lib/game/types";

const ACTION_LABELS: Record<PlayerLifecycleAction, string> = {
  eliminate: "Aus Gewinnerpool entfernen",
  depart: "Als abgereist markieren",
  pause: "Vorübergehend abwesend",
  return: "Zurück im Spiel",
  disqualify: "Disqualifizieren",
  reinstate: "Admin-Korrektur: reaktivieren",
};

function createPlayer(name: string, index: number): PlayerState {
  return {
    id: `player-${index + 1}`,
    name,
    attendanceStatus: "present",
    winnerPoolStatus: "eligible",
    role: index === 0 ? "millionaire" : "investigator",
    points: 0,
    correctGuesses: 0,
  };
}

function createDemoState(): GameState {
  return {
    id: "demo-blaue-adria",
    currentRound: 1,
    phase: "lobby",
    millionairePlayerId: "player-1",
    revision: 1,
    roundOutcomes: [],
    players: PLAYER_NAMES.map(createPlayer),
  };
}

function statusLabel(player: PlayerState): string {
  if (player.attendanceStatus === "departed") return "Abgereist";
  if (player.attendanceStatus === "temporarily_absent") return "Abwesend";
  if (player.winnerPoolStatus === "disqualified") return "Disqualifiziert";
  if (player.winnerPoolStatus === "eliminated") return "Ausgeschieden";
  return "Aktiv";
}

function statusBadge(player: PlayerState): string {
  if (player.attendanceStatus === "departed") return "badge-departed";
  if (player.attendanceStatus === "temporarily_absent") return "badge-paused";
  if (player.winnerPoolStatus === "disqualified") return "badge-disqualified";
  if (player.winnerPoolStatus === "eliminated") return "badge-eliminated";
  return "badge-active";
}

function playerDetail(player: PlayerState): string {
  const capabilities = getPlayerCapabilities(player);
  const pool = capabilities.eligibleToWin ? "Gewinnerpool" : "nicht gewinnberechtigt";
  const participation = capabilities.canVote
    ? capabilities.canJoinChallenges
      ? "stimmt und spielt weiter"
      : "stimmt weiter"
    : "keine Stimme · keine Challenge";
  const role = player.role === "millionaire" ? "Millionär" : player.role === "investigator" ? "Ermittler" : "keine Rolle";
  return `${pool} · ${role} · ${participation}`;
}

function phaseSequence(round: RoundNumber) {
  return round < 4 ? [...ROUND_PHASES, "role_transfer" as const] : [...ROUND_PHASES, "finished" as const];
}

export default function AdminConsole() {
  const [game, setGame] = useState<GameState>(createDemoState);
  const [pendingActions, setPendingActions] = useState<Record<string, PlayerLifecycleAction>>({});
  const [replacementId, setReplacementId] = useState("player-2");
  const [missionByRound, setMissionByRound] = useState<Partial<Record<RoundNumber, string>>>({
    1: "r1-common-oath",
    2: "r2-double-messenger",
    3: "r3-guided-accusation",
    4: "r4-last-picture",
  });
  const [missionStatusByRound, setMissionStatusByRound] = useState<Partial<Record<RoundNumber, MissionStatus>>>({});
  const [advantageByRound, setAdvantageByRound] = useState<Partial<Record<RoundNumber, string>>>({
    1: "r1-double-vote",
    2: "r2-block-vote",
    3: "r3-two-shadow-votes",
    4: "r4-redirect",
  });
  const [notice, setNotice] = useState("Entwicklungsmodus: Änderungen gelten aktuell nur in diesem Browserfenster.");
  const [error, setError] = useState<string>();

  const currentRound = ROUNDS.find((round) => round.number === game.currentRound) ?? ROUNDS[0];
  const currentMissionStatus = missionStatusByRound[game.currentRound] ?? "unassigned";
  const availableMissions = MISSIONS.filter(
    (mission) => mission.reserve || mission.round === game.currentRound,
  );
  const availableAdvantages = ADVANTAGES.filter(
    (advantage) => advantage.reserve || advantage.round === game.currentRound,
  );
  const candidates = getEligibleMillionaireCandidates(game);
  const nextStep = getNextGameStep(game);

  const metrics = useMemo(() => {
    const winnerPool = game.players.filter((player) => getPlayerCapabilities(player).eligibleToWin).length;
    const departed = game.players.filter((player) => player.attendanceStatus === "departed").length;
    const voters = game.players.filter((player) => getPlayerCapabilities(player).canVote).length;
    return { winnerPool, departed, voters };
  }, [game.players]);

  function runPlayerAction(playerId: string) {
    const action = pendingActions[playerId] ?? "eliminate";
    setError(undefined);
    try {
      const result = applyPlayerLifecycleChange(game, {
        playerId,
        action,
        reason:
          action === "depart"
            ? "early_departure"
            : action === "eliminate"
              ? "host_decision"
              : action === "disqualify"
                ? "rule_violation"
                : undefined,
      });
      setGame(result.state);
      setNotice(result.warnings[0] ?? "Spielerstatus wurde aktualisiert und protokolliert.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Statusänderung fehlgeschlagen.");
    }
  }

  function assignReplacement() {
    setError(undefined);
    try {
      setGame((current) => setMillionaire(current, replacementId));
      const selected = game.players.find((player) => player.id === replacementId);
      setNotice(`${selected?.name ?? "Der Spieler"} ist als aktueller Millionär hinterlegt.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Rollenvergabe fehlgeschlagen.");
    }
  }

  function prepareMission() {
    if (!missionByRound[game.currentRound]) {
      setError("Wähle zuerst eine Mission aus.");
      return;
    }
    setMissionStatusByRound((current) => ({ ...current, [game.currentRound]: "assigned" }));
    setError(undefined);
    setNotice("Mission ist vorbereitet. Im echten Betrieb wird sie ausschließlich an den Millionär gesendet.");
  }

  function reviewMission(status: Extract<MissionStatus, "completed" | "failed">) {
    setMissionStatusByRound((current) => ({ ...current, [game.currentRound]: status }));
    setNotice(status === "completed" ? "Mission als erfüllt bestätigt." : "Mission als gescheitert dokumentiert.");
    setError(undefined);
  }

  function advance() {
    setError(undefined);
    if (game.phase === "mission" && currentMissionStatus !== "assigned") {
      setError("Die Mission muss vor Beginn der Challenge vorbereitet und ausgegeben sein.");
      return;
    }
    if (game.phase === "mission_review" && !["completed", "failed"].includes(currentMissionStatus)) {
      setError("Bewerte die Mission, bevor du den Vorteilsschritt öffnest.");
      return;
    }
    if (
      game.phase === "advantage" &&
      currentMissionStatus === "completed" &&
      !advantageByRound[game.currentRound]
    ) {
      setError("Bei erfüllter Mission muss ein Vorteil ausgewählt sein.");
      return;
    }

    try {
      const next = advanceGame(game);
      setGame(next);
      setNotice(`Freigegeben: ${PHASE_LABELS[next.phase]}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der nächste Spielschritt konnte nicht freigegeben werden.");
    }
  }

  const sequence = phaseSequence(game.currentRound);
  const currentPhaseIndex = sequence.indexOf(game.phase as (typeof sequence)[number]);

  return (
    <>
      <header className="page-title admin-title">
        <div>
          <p className="section-label">Kontrollzentrum · Entwicklungsstand</p>
          <h1>{currentRound.title}</h1>
          <p>
            Runde {game.currentRound} · {PHASE_LABELS[game.phase]}. Kritische Ergebnisse werden erst
            nach Bestätigung veröffentlicht.
          </p>
        </div>
        <span className="revision-badge">Revision {game.revision}</span>
      </header>

      <section className="metric-row">
        <div className="metric"><span className="hint">Anwesende Wähler</span><strong>{metrics.voters}</strong></div>
        <div className="metric"><span className="hint">Gewinnerpool</span><strong>{metrics.winnerPool}</strong></div>
        <div className="metric"><span className="hint">Abgereist</span><strong>{metrics.departed}</strong></div>
        <div className="metric"><span className="hint">Aktuelle Phase</span><strong>{PHASE_LABELS[game.phase]}</strong></div>
      </section>

      {(notice || error) && (
        <div className={error ? "system-message system-error" : "system-message"} role="status">
          {error ?? notice}
        </div>
      )}

      <section className="dashboard-grid dashboard-grid-wide">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Spielerstatus</p>
              <h2>Teilnehmer verwalten</h2>
            </div>
            <span className="hint">Ausscheiden und Anwesenheit sind getrennt.</span>
          </div>

          <div className="player-list">
            {game.players.map((player) => (
              <div className="player-row player-row-admin" key={player.id}>
                <span className="mini-avatar">{player.name.slice(0, 1)}</span>
                <div className="player-copy">
                  <p>{player.name}</p>
                  <small>{playerDetail(player)}</small>
                </div>
                <span className={`badge ${statusBadge(player)}`}>{statusLabel(player)}</span>
                <select
                  aria-label={`Aktion für ${player.name}`}
                  value={pendingActions[player.id] ?? "eliminate"}
                  onChange={(event) =>
                    setPendingActions((current) => ({
                      ...current,
                      [player.id]: event.target.value as PlayerLifecycleAction,
                    }))
                  }
                >
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button className="button button-secondary button-compact" type="button" onClick={() => runPlayerAction(player.id)}>
                  Anwenden
                </button>
              </div>
            ))}
          </div>
        </article>

        <aside className="control-stack">
          <section className="panel">
            <p className="section-label">Geheimbereich</p>
            <h2>Millionär</h2>
            <p className="current-secret">
              {game.millionairePlayerId
                ? game.players.find((player) => player.id === game.millionairePlayerId)?.name
                : "Nicht festgelegt"}
            </p>
            <div className="field">
              <label htmlFor="millionaire">Rolle neu festlegen</label>
              <select id="millionaire" value={replacementId} onChange={(event) => setReplacementId(event.target.value)}>
                {candidates.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}
              </select>
            </div>
            <button className="button button-secondary full-width" type="button" onClick={assignReplacement} disabled={candidates.length === 0}>
              Millionär bestätigen
            </button>
          </section>

          <section className="panel">
            <p className="section-label">Rundenakte</p>
            <h2>Mission und Vorteil</h2>
            <div className="field">
              <label htmlFor="mission">Mission für Runde {game.currentRound}</label>
              <select
                id="mission"
                value={missionByRound[game.currentRound] ?? ""}
                onChange={(event) => setMissionByRound((current) => ({ ...current, [game.currentRound]: event.target.value }))}
              >
                {availableMissions.map((mission) => (
                  <option value={mission.id} key={mission.id}>{mission.reserve ? "Reserve · " : ""}{mission.title}</option>
                ))}
              </select>
            </div>
            <button className="button button-secondary full-width" type="button" onClick={prepareMission}>
              Mission vorbereiten
            </button>
            <div className="mission-review-buttons">
              <button type="button" onClick={() => reviewMission("completed")}>Erfüllt</button>
              <button type="button" onClick={() => reviewMission("failed")}>Gescheitert</button>
            </div>
            <div className="field">
              <label htmlFor="advantage">Vorteil bei Erfolg</label>
              <select
                id="advantage"
                value={advantageByRound[game.currentRound] ?? ""}
                disabled={currentMissionStatus === "failed"}
                onChange={(event) => setAdvantageByRound((current) => ({ ...current, [game.currentRound]: event.target.value }))}
              >
                {availableAdvantages.map((advantage) => (
                  <option value={advantage.id} key={advantage.id}>{advantage.reserve ? "Reserve · " : ""}{advantage.title}</option>
                ))}
              </select>
            </div>
            <span className="hint">Missionsstatus: {currentMissionStatus}</span>
          </section>

          <section className="panel">
            <p className="section-label">Rundensteuerung</p>
            <h2>Ablauf</h2>
            <ol className="phase-list">
              {sequence.map((phase, index) => (
                <li
                  key={phase}
                  className={index < currentPhaseIndex ? "done" : index === currentPhaseIndex ? "current" : ""}
                >
                  {PHASE_LABELS[phase]}
                </li>
              ))}
            </ol>
            <button className="button button-primary full-width phase-button" type="button" onClick={advance} disabled={!nextStep}>
              {nextStep ? `${PHASE_LABELS[nextStep.phase]} freigeben` : "Spiel beendet"}
            </button>
          </section>
        </aside>
      </section>
    </>
  );
}
