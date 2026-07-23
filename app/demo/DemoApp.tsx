"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ADVANTAGES, MISSIONS } from "@/lib/game/catalog";
import { PHASE_LABELS, ROUNDS } from "@/lib/game/constants";
import {
  getAccusablePlayers,
  getEligibleMillionaireCandidates,
  getNextGameStep,
  getPlayerCapabilities,
  getVotingPlayers,
} from "@/lib/game/engine";
import type { MissionStatus, PlayerLifecycleAction, PlayerState } from "@/lib/game/types";
import {
  countEligiblePlayers,
  countVotingPlayers,
  getPlayerStatusClass,
  getPlayerStatusLabel,
  useDemoStore,
} from "@/lib/demo/store";

type ViewMode = "portal" | "host" | "player";

const ACTION_LABELS: Record<PlayerLifecycleAction, string> = {
  eliminate: "Aus Gewinnerpool entfernen",
  depart: "Als abgereist markieren",
  pause: "Vorübergehend pausieren",
  return: "Zurückmelden",
  disqualify: "Disqualifizieren",
  reinstate: "Admin-Korrektur",
};

function playerDescription(player: PlayerState): string {
  const capabilities = getPlayerCapabilities(player);
  const pool = capabilities.eligibleToWin ? "Gewinnerpool" : "nicht gewinnberechtigt";
  const participation = capabilities.canVote ? "stimmt weiter ab" : "keine Stimme";
  return `${pool} · ${participation}`;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "gerade eben";
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function DemoApp() {
  const { snapshot, actions, connected } = useDemoStore();
  const [mode, setMode] = useState<ViewMode>("portal");
  const [selectedPlayerId, setSelectedPlayerId] = useState("player-1");
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [voteTargetId, setVoteTargetId] = useState("");
  const [pendingActions, setPendingActions] = useState<Record<string, PlayerLifecycleAction>>({});
  const [replacementId, setReplacementId] = useState("player-1");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const savedMode = window.sessionStorage.getItem("sm-demo-view") as ViewMode | null;
    const savedPlayer = window.sessionStorage.getItem("sm-demo-player");
    if (savedMode && ["portal", "host", "player"].includes(savedMode)) setMode(savedMode);
    if (savedPlayer) setSelectedPlayerId(savedPlayer);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("sm-demo-view", mode);
    window.sessionStorage.setItem("sm-demo-player", selectedPlayerId);
  }, [mode, selectedPlayerId]);

  useEffect(() => {
    setRoleRevealed(false);
    setVoteTargetId("");
  }, [snapshot.game.currentRound]);

  const currentRound = ROUNDS.find((round) => round.number === snapshot.game.currentRound) ?? ROUNDS[0];
  const selectedPlayer = snapshot.game.players.find((player) => player.id === selectedPlayerId) ?? snapshot.game.players[0];
  const currentMission = MISSIONS.find((mission) => mission.round === snapshot.game.currentRound && !mission.reserve);
  const currentMissionStatus = snapshot.missionStatusByRound[snapshot.game.currentRound] ?? "unassigned";
  const currentAdvantageId = snapshot.advantageIdByRound[snapshot.game.currentRound];
  const currentAdvantage = ADVANTAGES.find((advantage) => advantage.id === currentAdvantageId);
  const nextStep = getNextGameStep(snapshot.game);
  const millionaire = snapshot.game.players.find((player) => player.id === snapshot.game.millionairePlayerId);
  const accusablePlayers = getAccusablePlayers(snapshot.game);
  const votingPlayers = getVotingPlayers(snapshot.game);
  const eligibleMillionaires = getEligibleMillionaireCandidates(snapshot.game);
  const votes = snapshot.votesByRound[snapshot.game.currentRound] ?? {};
  const selectedPlayerVote = votes[selectedPlayer.id];

  const phaseProgress = useMemo(() => {
    const order = [
      "lobby",
      "role_reveal",
      "mission",
      "challenge",
      "question",
      "discussion",
      "mission_review",
      "advantage",
      "voting",
      "evaluation",
      "result",
      "role_transfer",
      "finished",
    ];
    const index = Math.max(0, order.indexOf(snapshot.game.phase));
    return Math.round((index / (order.length - 1)) * 100);
  }, [snapshot.game.phase]);

  function run(action: () => void, success?: string) {
    try {
      action();
      setError(undefined);
      if (success) setMessage(success);
    } catch (caught) {
      setMessage(undefined);
      setError(caught instanceof Error ? caught.message : "Die Aktion konnte nicht ausgeführt werden.");
    }
  }

  function selectMode(nextMode: ViewMode) {
    setMode(nextMode);
    setMessage(undefined);
    setError(undefined);
  }

  if (!connected) {
    return (
      <main className="demo-loading">
        <div className="demo-orbit" aria-hidden="true"><span>€</span></div>
        <p>Testspiel wird geladen …</p>
      </main>
    );
  }

  return (
    <main className="demo-app">
      <header className="demo-header">
        <Link href="/" className="demo-brand" aria-label="Zur Startseite">
          <span className="demo-brand-token">SM</span>
          <span>
            <strong>Secret Millionär</strong>
            <small>Blaue Adria · Mobile Testversion</small>
          </span>
        </Link>
        <div className="demo-connection">
          <span className="live-dot" />
          Browser-Sync aktiv
        </div>
      </header>

      {mode === "portal" && (
        <PortalView
          players={snapshot.game.players}
          roundTitle={currentRound.title}
          phaseLabel={PHASE_LABELS[snapshot.game.phase]}
          onHost={() => selectMode("host")}
          onPlayer={(playerId) => {
            setSelectedPlayerId(playerId);
            selectMode("player");
          }}
          onReset={() => run(actions.reset, "Die Testpartie wurde zurückgesetzt.")}
        />
      )}

      {mode === "host" && (
        <HostView
          snapshot={snapshot}
          currentRound={currentRound}
          currentMission={currentMission}
          currentMissionStatus={currentMissionStatus}
          currentAdvantageId={currentAdvantageId}
          currentAdvantageTitle={currentAdvantage?.title}
          nextStepLabel={nextStep ? PHASE_LABELS[nextStep.phase] : "Spiel beendet"}
          millionaireName={millionaire?.name ?? "Nicht festgelegt"}
          eligibleMillionaires={eligibleMillionaires}
          votingCount={votingPlayers.length}
          eligibleCount={countEligiblePlayers(snapshot.game)}
          voteCount={Object.keys(votes).length}
          pendingActions={pendingActions}
          replacementId={replacementId}
          onBack={() => selectMode("portal")}
          onAdvance={() => run(actions.advance, "Nächste Phase freigegeben.")}
          onReset={() => run(actions.reset, "Die Testpartie wurde zurückgesetzt.")}
          onPendingAction={(playerId, action) =>
            setPendingActions((current) => ({ ...current, [playerId]: action }))
          }
          onPlayerAction={(playerId) =>
            run(() => actions.changePlayer(playerId, pendingActions[playerId] ?? "eliminate"))
          }
          onReplacementChange={setReplacementId}
          onAssignMillionaire={() => run(() => actions.assignMillionaire(replacementId), "Millionär neu bestätigt.")}
          onMissionStatus={(status) => run(() => actions.setMissionStatus(status))}
          onAdvantageChange={(advantageId) => run(() => actions.setAdvantage(advantageId))}
          onFillVotes={() => run(actions.fillMissingVotes, "Fehlende Stimmen automatisch ergänzt.")}
          onEvaluate={() => {
            run(() => {
              const evaluation = actions.evaluateCurrentVotes();
              const names = evaluation.topPlayerIds
                .map((playerId) => snapshot.game.players.find((player) => player.id === playerId)?.name)
                .filter(Boolean)
                .join(", ");
              setMessage(
                evaluation.requiresRunoff
                  ? `Gleichstand: ${names}. Für die Testversion wird beim Abschluss automatisch gelost.`
                  : `Höchste Stimmenzahl: ${names}.`,
              );
            });
          }}
          onFinalize={() => {
            run(() => {
              const outcome = actions.finalizeCurrentRound();
              const eliminated = snapshot.game.players.find((player) => player.id === outcome.eliminatedPlayerId)?.name;
              setMessage(`${eliminated ?? "Ein Spieler"} wurde aus dem Gewinnerpool entfernt.`);
            });
          }}
        />
      )}

      {mode === "player" && (
        <PlayerView
          snapshot={snapshot}
          player={selectedPlayer}
          currentRound={currentRound}
          currentMission={currentMission}
          currentMissionStatus={currentMissionStatus}
          currentAdvantageTitle={currentAdvantage?.title}
          millionaireId={snapshot.game.millionairePlayerId}
          roleRevealed={roleRevealed}
          voteTargetId={voteTargetId}
          submittedVoteTargetId={selectedPlayerVote}
          accusablePlayers={accusablePlayers}
          phaseProgress={phaseProgress}
          onBack={() => selectMode("portal")}
          onRevealRole={() => setRoleRevealed(true)}
          onVoteTarget={setVoteTargetId}
          onSubmitVote={() => {
            if (!voteTargetId) {
              setError("Wähle zuerst einen Verdächtigen aus.");
              return;
            }
            run(() => actions.submitVote(selectedPlayer.id, voteTargetId), "Deine Stimme wurde geheim gespeichert.");
          }}
        />
      )}

      {(message || error) && (
        <div className={`demo-toast ${error ? "demo-toast-error" : ""}`} role="status">
          <span>{error ?? message}</span>
          <button type="button" onClick={() => { setMessage(undefined); setError(undefined); }}>×</button>
        </div>
      )}

      <footer className="demo-footer">
        <span>Stand {formatUpdatedAt(snapshot.updatedAt)}</span>
        <span>Demo-Code 472918</span>
      </footer>
    </main>
  );
}

function PortalView({
  players,
  roundTitle,
  phaseLabel,
  onHost,
  onPlayer,
  onReset,
}: {
  players: PlayerState[];
  roundTitle: string;
  phaseLabel: string;
  onHost(): void;
  onPlayer(playerId: string): void;
  onReset(): void;
}) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");

  return (
    <section className="demo-portal">
      <div className="demo-hero-panel">
        <div className="demo-hero-copy">
          <p className="section-label">Interaktive Testumgebung</p>
          <h1>Teste das Wochenende direkt im Browser.</h1>
          <p>
            Diese Version funktioniert auf Smartphone und Desktop. Öffne eine zweite Browser-Registerkarte,
            um Spielleitung und Spieleransicht parallel zu testen.
          </p>
          <div className="demo-state-line">
            <span>Runde 1 · {roundTitle}</span>
            <strong>{phaseLabel}</strong>
          </div>
        </div>
        <div className="demo-coin-stage" aria-hidden="true">
          <div className="demo-coin"><span>€</span></div>
          <div className="demo-coin-ring" />
        </div>
      </div>

      <div className="demo-role-grid">
        <article className="demo-panel demo-choice-card">
          <span className="demo-choice-number">01</span>
          <p className="section-label">Kontrollzentrum</p>
          <h2>Als Spielleiter testen</h2>
          <p>Runden freigeben, Missionen bewerten, Rollen wechseln und Spieler jederzeit herausnehmen.</p>
          <button className="button button-primary" type="button" onClick={onHost}>Spielleitung öffnen</button>
        </article>

        <article className="demo-panel demo-choice-card">
          <span className="demo-choice-number">02</span>
          <p className="section-label">Persönliche Ansicht</p>
          <h2>Als Spieler testen</h2>
          <p>Rolle aufdecken, Status verfolgen, Mission sehen und eine geheime Stimme abgeben.</p>
          <label className="demo-select-label" htmlFor="demo-player">Testspieler auswählen</label>
          <select id="demo-player" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
            {players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}
          </select>
          <button className="button button-secondary" type="button" onClick={() => onPlayer(playerId)}>Spieleransicht öffnen</button>
        </article>
      </div>

      <button className="demo-reset-link" type="button" onClick={onReset}>Testspiel vollständig zurücksetzen</button>
    </section>
  );
}

function HostView({
  snapshot,
  currentRound,
  currentMission,
  currentMissionStatus,
  currentAdvantageId,
  currentAdvantageTitle,
  nextStepLabel,
  millionaireName,
  eligibleMillionaires,
  votingCount,
  eligibleCount,
  voteCount,
  pendingActions,
  replacementId,
  onBack,
  onAdvance,
  onReset,
  onPendingAction,
  onPlayerAction,
  onReplacementChange,
  onAssignMillionaire,
  onMissionStatus,
  onAdvantageChange,
  onFillVotes,
  onEvaluate,
  onFinalize,
}: {
  snapshot: ReturnType<typeof useDemoStore>["snapshot"];
  currentRound: (typeof ROUNDS)[number];
  currentMission: (typeof MISSIONS)[number] | undefined;
  currentMissionStatus: MissionStatus;
  currentAdvantageId: string | undefined;
  currentAdvantageTitle: string | undefined;
  nextStepLabel: string;
  millionaireName: string;
  eligibleMillionaires: PlayerState[];
  votingCount: number;
  eligibleCount: number;
  voteCount: number;
  pendingActions: Record<string, PlayerLifecycleAction>;
  replacementId: string;
  onBack(): void;
  onAdvance(): void;
  onReset(): void;
  onPendingAction(playerId: string, action: PlayerLifecycleAction): void;
  onPlayerAction(playerId: string): void;
  onReplacementChange(playerId: string): void;
  onAssignMillionaire(): void;
  onMissionStatus(status: MissionStatus): void;
  onAdvantageChange(advantageId: string): void;
  onFillVotes(): void;
  onEvaluate(): void;
  onFinalize(): void;
}) {
  const availableAdvantages = ADVANTAGES.filter(
    (advantage) => advantage.round === snapshot.game.currentRound || advantage.reserve,
  );

  return (
    <section className="demo-workspace">
      <div className="demo-mobile-toolbar">
        <button type="button" onClick={onBack}>← Übersicht</button>
        <span>Spielleitung</span>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      <div className="demo-command-hero">
        <div>
          <p className="section-label">Spielleitung · Runde {snapshot.game.currentRound}</p>
          <h1>{currentRound.title}</h1>
          <p>{snapshot.hostMessage}</p>
        </div>
        <div className="demo-phase-badge">
          <small>Aktuelle Phase</small>
          <strong>{PHASE_LABELS[snapshot.game.phase]}</strong>
        </div>
      </div>

      <div className="demo-metrics">
        <div><small>Gewinnerpool</small><strong>{eligibleCount}</strong></div>
        <div><small>Stimmberechtigt</small><strong>{votingCount}</strong></div>
        <div><small>Stimmen</small><strong>{voteCount}/{votingCount}</strong></div>
        <div><small>Millionär</small><strong>{millionaireName}</strong></div>
      </div>

      <div className="demo-dashboard-grid">
        <article className="demo-panel demo-player-manager">
          <div className="demo-panel-heading">
            <div>
              <p className="section-label">Teilnehmer</p>
              <h2>Spieler verwalten</h2>
            </div>
            <span>{snapshot.game.players.length} Profile</span>
          </div>

          <div className="demo-player-list">
            {snapshot.game.players.map((player) => (
              <div className="demo-player-row" key={player.id}>
                <span className="demo-avatar">{player.name.slice(0, 1)}</span>
                <div className="demo-player-copy">
                  <strong>{player.name}</strong>
                  <small>{playerDescription(player)}</small>
                </div>
                <span className={`demo-status ${getPlayerStatusClass(player)}`}>{getPlayerStatusLabel(player)}</span>
                <select
                  aria-label={`Aktion für ${player.name}`}
                  value={pendingActions[player.id] ?? "eliminate"}
                  onChange={(event) => onPendingAction(player.id, event.target.value as PlayerLifecycleAction)}
                >
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => onPlayerAction(player.id)}>Anwenden</button>
              </div>
            ))}
          </div>
        </article>

        <div className="demo-control-column">
          <article className="demo-panel">
            <p className="section-label">Geheimrolle</p>
            <h2>Millionär festlegen</h2>
            <div className="demo-secret-name">{millionaireName}</div>
            <select value={replacementId} onChange={(event) => onReplacementChange(event.target.value)}>
              {eligibleMillionaires.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}
            </select>
            <button className="button button-secondary full-width" type="button" onClick={onAssignMillionaire} disabled={!eligibleMillionaires.length}>
              Auswahl bestätigen
            </button>
          </article>

          <article className="demo-panel">
            <p className="section-label">Geheime Mission</p>
            <h2>{currentMission?.title ?? "Keine Mission"}</h2>
            <p className="demo-small-copy">{currentMission?.task}</p>
            <div className="demo-segmented">
              <button type="button" className={currentMissionStatus === "assigned" ? "active" : ""} onClick={() => onMissionStatus("assigned")}>Ausgegeben</button>
              <button type="button" className={currentMissionStatus === "completed" ? "active" : ""} onClick={() => onMissionStatus("completed")}>Erfüllt</button>
              <button type="button" className={currentMissionStatus === "failed" ? "active" : ""} onClick={() => onMissionStatus("failed")}>Gescheitert</button>
            </div>
            <label className="demo-select-label" htmlFor="advantage">Vorteil bei Erfolg</label>
            <select id="advantage" value={currentAdvantageId ?? ""} onChange={(event) => onAdvantageChange(event.target.value)}>
              {availableAdvantages.map((advantage) => (
                <option value={advantage.id} key={advantage.id}>{advantage.reserve ? "Reserve · " : ""}{advantage.title}</option>
              ))}
            </select>
            <small className="demo-muted">Aktiv: {currentAdvantageTitle ?? "Keiner"}</small>
          </article>

          <article className="demo-panel">
            <p className="section-label">Rundensteuerung</p>
            <h2>{PHASE_LABELS[snapshot.game.phase]}</h2>
            {snapshot.game.phase === "evaluation" ? (
              <div className="demo-action-stack">
                <button className="button button-secondary full-width" type="button" onClick={onFillVotes}>Fehlende Stimmen simulieren</button>
                <button className="button button-secondary full-width" type="button" onClick={onEvaluate}>Auswertung prüfen</button>
                <button className="button button-primary full-width" type="button" onClick={onFinalize}>Ergebnis veröffentlichen</button>
              </div>
            ) : (
              <button className="button button-primary full-width" type="button" onClick={onAdvance} disabled={!nextStepLabel || snapshot.game.phase === "finished"}>
                {nextStepLabel} freigeben
              </button>
            )}
            <small className="demo-muted">Revision {snapshot.game.revision}</small>
          </article>
        </div>
      </div>
    </section>
  );
}

function PlayerView({
  snapshot,
  player,
  currentRound,
  currentMission,
  currentMissionStatus,
  currentAdvantageTitle,
  millionaireId,
  roleRevealed,
  voteTargetId,
  submittedVoteTargetId,
  accusablePlayers,
  phaseProgress,
  onBack,
  onRevealRole,
  onVoteTarget,
  onSubmitVote,
}: {
  snapshot: ReturnType<typeof useDemoStore>["snapshot"];
  player: PlayerState;
  currentRound: (typeof ROUNDS)[number];
  currentMission: (typeof MISSIONS)[number] | undefined;
  currentMissionStatus: MissionStatus;
  currentAdvantageTitle: string | undefined;
  millionaireId: string | undefined;
  roleRevealed: boolean;
  voteTargetId: string;
  submittedVoteTargetId: string | undefined;
  accusablePlayers: PlayerState[];
  phaseProgress: number;
  onBack(): void;
  onRevealRole(): void;
  onVoteTarget(playerId: string): void;
  onSubmitVote(): void;
}) {
  const capabilities = getPlayerCapabilities(player);
  const isMillionaire = player.id === millionaireId;
  const submittedTarget = snapshot.game.players.find((candidate) => candidate.id === submittedVoteTargetId);

  return (
    <section className="demo-player-screen">
      <div className="demo-mobile-toolbar">
        <button type="button" onClick={onBack}>← Übersicht</button>
        <span>{player.name}</span>
        <span className={`demo-status ${getPlayerStatusClass(player)}`}>{getPlayerStatusLabel(player)}</span>
      </div>

      <div className="demo-player-top">
        <div>
          <p className="section-label">Runde {snapshot.game.currentRound} · {currentRound.timing}</p>
          <h1>{currentRound.title}</h1>
          <p>{snapshot.hostMessage}</p>
        </div>
        <span className="demo-round-number">0{snapshot.game.currentRound}</span>
      </div>

      <div className="demo-progress-track" aria-label={`Spielfortschritt ${phaseProgress} Prozent`}>
        <span style={{ width: `${phaseProgress}%` }} />
      </div>
      <div className="demo-phase-line">
        <span>Aktuelle Phase</span>
        <strong>{PHASE_LABELS[snapshot.game.phase]}</strong>
      </div>

      <div className="demo-player-content">
        <article className={`demo-role-card ${roleRevealed ? "revealed" : ""} ${isMillionaire ? "millionaire" : "investigator"}`}>
          {!roleRevealed ? (
            <div className="demo-role-hidden">
              <span className="demo-lock">◆</span>
              <p className="section-label">Nur für dich</p>
              <h2>Deine Rolle ist verschlüsselt.</h2>
              <p>Achte darauf, dass niemand auf dein Display schaut.</p>
              <button className="button button-primary" type="button" onClick={onRevealRole}>Rolle aufdecken</button>
            </div>
          ) : (
            <div className="demo-role-revealed">
              <p className="section-label">Deine geheime Rolle</p>
              <span className="demo-role-symbol">{isMillionaire ? "€" : "?"}</span>
              <h2>{isMillionaire ? "Du bist der Millionär." : "Du bist Ermittler."}</h2>
              <p>
                {isMillionaire
                  ? "Bleib unauffällig, erfülle deine Mission und lenke die Abstimmung von dir weg."
                  : "Beobachte die Gruppe, nutze die exklusive Frage und stimme gegen deinen Verdächtigen."}
              </p>
            </div>
          )}
        </article>

        {!capabilities.eligibleToWin && player.attendanceStatus !== "departed" && (
          <article className="demo-panel demo-info-card danger">
            <p className="section-label">Statushinweis</p>
            <h2>Du bist aus dem Gewinnerpool ausgeschieden.</h2>
            <p>Du spielst weiter mit, darfst diskutieren, Challenges bestreiten und abstimmen. Den Hauptpreis kannst du nicht mehr gewinnen.</p>
          </article>
        )}

        {player.attendanceStatus === "departed" && (
          <article className="demo-panel demo-info-card danger">
            <p className="section-label">Spiel beendet</p>
            <h2>Du wurdest als abgereist markiert.</h2>
            <p>Du nimmst nicht mehr an Abstimmungen, Challenges oder Rollenwechseln teil.</p>
          </article>
        )}

        {isMillionaire && roleRevealed && currentMissionStatus !== "unassigned" && (
          <article className="demo-panel demo-mission-card">
            <p className="section-label">Geheime Mission · nur für dich</p>
            <h2>{currentMission?.title}</h2>
            <p>{currentMission?.task}</p>
            <dl>
              <div><dt>Erfolg</dt><dd>{currentMission?.successCriteria}</dd></div>
              <div><dt>Zeitfenster</dt><dd>{currentMission?.timeWindow}</dd></div>
            </dl>
            <span className={`mission-state mission-${currentMissionStatus}`}>{currentMissionStatus}</span>
            {currentMissionStatus === "completed" && currentAdvantageTitle && (
              <div className="demo-advantage-reveal">
                <small>Freigeschalteter Vorteil</small>
                <strong>{currentAdvantageTitle}</strong>
              </div>
            )}
          </article>
        )}

        {snapshot.game.phase === "voting" && capabilities.canVote && (
          <article className="demo-panel demo-vote-card">
            <p className="section-label">Geheime Abstimmung</p>
            <h2>Wer ist der Millionär?</h2>
            {submittedTarget ? (
              <div className="demo-vote-confirmed">
                <span>✓</span>
                <strong>Stimme gespeichert</strong>
                <p>Dein Tipp: {submittedTarget.name}</p>
              </div>
            ) : (
              <>
                <div className="demo-vote-grid">
                  {accusablePlayers.map((candidate) => (
                    <button
                      className={voteTargetId === candidate.id ? "selected" : ""}
                      type="button"
                      key={candidate.id}
                      onClick={() => onVoteTarget(candidate.id)}
                    >
                      <span>{candidate.name.slice(0, 1)}</span>
                      <strong>{candidate.name}</strong>
                    </button>
                  ))}
                </div>
                <button className="button button-primary full-width" type="button" onClick={onSubmitVote}>Stimme geheim abgeben</button>
              </>
            )}
          </article>
        )}

        {snapshot.game.phase === "result" && snapshot.lastOutcome && (
          <article className="demo-panel demo-result-card">
            <p className="section-label">Rundenergebnis</p>
            <span className="demo-result-mark">×</span>
            <h2>
              {snapshot.game.players.find((candidate) => candidate.id === snapshot.lastOutcome?.eliminatedPlayerId)?.name}
              {" "}scheidet aus dem Gewinnerpool aus.
            </h2>
            <p>
              {snapshot.lastOutcome.millionaireSurvived
                ? "Der Millionär blieb unerkannt."
                : "Der Millionär wurde enttarnt. Vor der nächsten Runde wird die Rolle neu vergeben."}
            </p>
          </article>
        )}

        {snapshot.game.phase !== "voting" && snapshot.game.phase !== "result" && (
          <article className="demo-panel demo-info-card">
            <p className="section-label">Aktueller Auftrag</p>
            <h2>{PHASE_LABELS[snapshot.game.phase]}</h2>
            <p>{phaseInstruction(snapshot.game.phase, isMillionaire)}</p>
          </article>
        )}
      </div>
    </section>
  );
}

function phaseInstruction(phase: string, isMillionaire: boolean): string {
  const instructions: Record<string, string> = {
    lobby: "Warte, bis André alle Spieler bestätigt und die erste Runde freigibt.",
    role_reveal: "Öffne deine Rollenkarte diskret und merke dir deine Aufgabe.",
    mission: isMillionaire ? "Lies deine geheime Mission und verhalte dich unauffällig." : "Beobachte die anderen. Die geheime Mission ist nicht öffentlich.",
    challenge: "Nimm an der Team-Challenge teil. Das Gewinnerteam bestimmt den Fragesteller.",
    question: "Der bestimmte Fragesteller erhält eine exklusive Ja-Nein-Information von André.",
    discussion: "Diskutiert offen. Aussagen über die geheime Antwort dürfen wahr oder gelogen sein.",
    mission_review: "André bewertet verdeckt, ob die Mission erfüllt wurde.",
    advantage: "Ein möglicher Vorteil wird ausschließlich für den Millionär vorbereitet.",
    evaluation: "Die Spielleitung zählt Stimmen und Vorteilskorrekturen. Bitte warte.",
    role_transfer: "Alle noch gewinnberechtigten Spieler treffen ihre geheime Rollenentscheidung.",
    finished: "Das Spiel ist beendet. Der Hauptgewinn wird aufgelöst.",
  };
  return instructions[phase] ?? "Warte auf die nächste Freigabe der Spielleitung.";
}
