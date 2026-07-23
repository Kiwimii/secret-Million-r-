"use client";

import { useEffect, useMemo, useState } from "react";
import { ADVANTAGES, MISSIONS } from "@/lib/game/catalog";
import { CHALLENGES, getChallengeById } from "@/lib/game/challenges";
import { PHASE_LABELS, ROUNDS } from "@/lib/game/constants";
import {
  getAccusablePlayers,
  getPlayerCapabilities,
  getVotingPlayers,
} from "@/lib/game/engine";
import { getTeamForPlayer } from "@/lib/game/teams";
import type { HostGuide } from "@/lib/game/host-guide";
import type {
  MissionStatus,
  PlayerLifecycleAction,
  PlayerState,
  TeamCode,
  VoteEvaluation,
} from "@/lib/game/types";
import type {
  DemoAdvantageSelection,
  DemoSnapshot,
} from "@/lib/demo/model";
import {
  getPlayerStatusClass,
  getPlayerStatusLabel,
} from "@/lib/demo/useDemoGame";

const ACTION_LABELS: Record<PlayerLifecycleAction, string> = {
  eliminate: "Aus Gewinnerpool entfernen",
  depart: "Als abgereist markieren",
  pause: "Vorübergehend pausieren",
  return: "Zurückmelden",
  disqualify: "Disqualifizieren",
  reinstate: "Admin-Korrektur",
};

function playerDescription(player: PlayerState): string {
  if (player.registrationStatus === "invited") {
    return "Profil noch nicht registriert";
  }
  const capabilities = getPlayerCapabilities(player);
  const pool = capabilities.eligibleToWin
    ? "Gewinnerpool"
    : "nicht gewinnberechtigt";
  const participation = capabilities.canVote
    ? "stimmt weiter ab"
    : "keine Stimme";
  return `${pool} · ${participation}`;
}

function teamTitle(team: TeamCode) {
  return team === "azur" ? "Team Azur" : "Team Gold";
}

function Avatar({ player }: { player: PlayerState }) {
  return (
    <span className="demo-avatar profile-avatar">
      {player.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.avatarUrl} alt="" />
      ) : (
        player.name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export default function HostFinalExpanded({
  snapshot,
  guide,
  votingCount,
  eligibleCount,
  voteCount,
  roleDecisionCount,
  roleDecisionRequired,
  evaluation,
  pendingActions,
  onBack,
  onReset,
  onPrimary,
  onDrawRandom,
  onPlayerAction,
  onPendingAction,
  onChallenge,
  onDrawTeams,
  onChallengeWinner,
  onMissionStatus,
  onAdvantage,
  onQuestioner,
  onQuestion,
  onFillVotes,
  onPreviewEvaluation,
  onStartRunoff,
  onPublishResult,
  onFillRoleDecisions,
  onResolveRoleTransfer,
}: {
  snapshot: DemoSnapshot;
  guide: HostGuide;
  votingCount: number;
  eligibleCount: number;
  voteCount: number;
  roleDecisionCount: number;
  roleDecisionRequired: number;
  evaluation?: VoteEvaluation;
  pendingActions: Record<string, PlayerLifecycleAction>;
  onBack(): void;
  onReset(): void;
  onPrimary(): void;
  onDrawRandom(): void;
  onPlayerAction(playerId: string): void;
  onPendingAction(playerId: string, action: PlayerLifecycleAction): void;
  onChallenge(challengeId: string): void;
  onDrawTeams(): void;
  onChallengeWinner(team: TeamCode): void;
  onMissionStatus(status: MissionStatus): void;
  onAdvantage(selection: DemoAdvantageSelection): void;
  onQuestioner(playerId: string): void;
  onQuestion(question: string, answer: boolean): void;
  onFillVotes(): void;
  onPreviewEvaluation(): void;
  onStartRunoff(): void;
  onPublishResult(): void;
  onFillRoleDecisions(): void;
  onResolveRoleTransfer(): void;
}) {
  const round = snapshot.game.currentRound;
  const roundDefinition =
    ROUNDS.find((entry) => entry.number === round) ?? ROUNDS[0];
  const mission = MISSIONS.find(
    (entry) => entry.round === round && !entry.reserve,
  );
  const missionStatus =
    snapshot.missionStatusByRound[round] ?? "unassigned";
  const advantageSelection = snapshot.advantageByRound[round];
  const advantageDefinition = ADVANTAGES.find(
    (entry) => entry.id === advantageSelection?.advantageId,
  );
  const challenge = getChallengeById(snapshot.challengeIdByRound[round]);
  const teamAssignments = snapshot.teamsByRound[round] ?? [];
  const challengeWinner = snapshot.challengeWinnerByRound[round];
  const currentMillionaire = snapshot.game.players.find(
    (player) => player.id === snapshot.game.millionairePlayerId,
  );
  const accusablePlayers = getAccusablePlayers(snapshot.game);
  const votingPlayers = getVotingPlayers(snapshot.game);
  const winnerTeamPlayerIds = new Set(
    teamAssignments
      .filter((assignment) => assignment.team === challengeWinner)
      .map((assignment) => assignment.playerId),
  );
  const questionerCandidates = snapshot.game.players.filter(
    (player) =>
      getPlayerCapabilities(player).canJoinChallenges &&
      winnerTeamPlayerIds.has(player.id),
  );
  const availableAdvantages = ADVANTAGES.filter(
    (entry) => entry.round === round || entry.reserve,
  );
  const [questionText, setQuestionText] = useState(
    snapshot.questionTextByRound[round] ?? "",
  );
  const [questionAnswer, setQuestionAnswer] = useState(
    snapshot.questionAnswerByRound[round] ?? true,
  );

  useEffect(() => {
    setQuestionText(snapshot.questionTextByRound[round] ?? "");
    setQuestionAnswer(snapshot.questionAnswerByRound[round] ?? true);
  }, [round, snapshot.questionAnswerByRound, snapshot.questionTextByRound]);

  const tallyRows = useMemo(() => {
    if (!evaluation) return [];
    return [...evaluation.tally]
      .sort((left, right) => right.effectiveVotes - left.effectiveVotes)
      .map((entry) => ({
        ...entry,
        name:
          snapshot.game.players.find(
            (player) => player.id === entry.playerId,
          )?.name ?? "Unbekannt",
      }));
  }, [evaluation, snapshot.game.players]);

  function updateAdvantage(patch: Partial<DemoAdvantageSelection>) {
    const fallbackId =
      advantageSelection?.advantageId ?? availableAdvantages[0]?.id;
    if (!fallbackId) return;
    onAdvantage({
      advantageId: fallbackId,
      ...advantageSelection,
      ...patch,
    });
  }

  const targetPlayers = accusablePlayers.filter((player) => {
    if (
      ["redirect_one_vote", "protect_other"].includes(
        advantageDefinition?.effect ?? "",
      )
    ) {
      return player.id !== snapshot.game.millionairePlayerId;
    }
    return true;
  });

  const affectedVoters = votingPlayers.filter((player) => {
    if (advantageDefinition?.effect === "ignore_eliminated_vote") {
      return player.winnerPoolStatus === "eliminated";
    }
    if (advantageDefinition?.effect === "bounce_vote_to_voter") {
      return accusablePlayers.some((candidate) => candidate.id === player.id);
    }
    if (
      ["block_vote", "redirect_selected_vote"].includes(
        advantageDefinition?.effect ?? "",
      )
    ) {
      return player.id !== snapshot.game.millionairePlayerId;
    }
    return true;
  });

  function renderAdvantageSelectors() {
    if (!advantageDefinition) return null;
    const mode = advantageDefinition.selectionMode;
    return (
      <>
        {["target", "target_and_voter", "two_targets", "source_and_target"].includes(
          mode,
        ) && (
          <>
            <label className="demo-select-label" htmlFor="advantage-target">
              {mode === "source_and_target" ? "Endziel" : "Zielspieler"}
            </label>
            <select
              id="advantage-target"
              value={advantageSelection?.targetPlayerId ?? ""}
              onChange={(event) =>
                updateAdvantage({ targetPlayerId: event.target.value })
              }
            >
              <option value="">Bitte auswählen</option>
              {targetPlayers.map((player) => (
                <option value={player.id} key={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </>
        )}

        {["voter", "target_and_voter"].includes(mode) && (
          <>
            <label className="demo-select-label" htmlFor="advantage-voter">
              Betroffener Wähler
            </label>
            <select
              id="advantage-voter"
              value={advantageSelection?.voterPlayerId ?? ""}
              onChange={(event) =>
                updateAdvantage({ voterPlayerId: event.target.value })
              }
            >
              <option value="">Bitte auswählen</option>
              {affectedVoters.map((player) => (
                <option value={player.id} key={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </>
        )}

        {mode === "two_targets" && (
          <>
            <label
              className="demo-select-label"
              htmlFor="advantage-second-target"
            >
              Zweites Ziel
            </label>
            <select
              id="advantage-second-target"
              value={advantageSelection?.secondaryTargetPlayerId ?? ""}
              onChange={(event) =>
                updateAdvantage({
                  secondaryTargetPlayerId: event.target.value,
                })
              }
            >
              <option value="">Bitte auswählen</option>
              {targetPlayers
                .filter(
                  (player) =>
                    player.id !== advantageSelection?.targetPlayerId,
                )
                .map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </>
        )}

        {mode === "source_and_target" && (
          <>
            <label
              className="demo-select-label"
              htmlFor="advantage-source-target"
            >
              Ausgangsziel
            </label>
            <select
              id="advantage-source-target"
              value={advantageSelection?.sourceTargetPlayerId ?? ""}
              onChange={(event) =>
                updateAdvantage({
                  sourceTargetPlayerId: event.target.value,
                })
              }
            >
              <option value="">Bitte auswählen</option>
              {accusablePlayers
                .filter(
                  (player) =>
                    player.id !== advantageSelection?.targetPlayerId,
                )
                .map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </>
        )}

        {mode === "tie_opponent" && (
          <>
            <label className="demo-select-label" htmlFor="tie-opponent">
              Gleichstandsgegner
            </label>
            <select
              id="tie-opponent"
              value={advantageSelection?.tieOpponentPlayerId ?? ""}
              onChange={(event) =>
                updateAdvantage({
                  tieOpponentPlayerId: event.target.value,
                })
              }
            >
              <option value="">Bitte auswählen</option>
              {accusablePlayers
                .filter(
                  (player) =>
                    player.id !== snapshot.game.millionairePlayerId,
                )
                .map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </>
        )}
      </>
    );
  }

  return (
    <section className="demo-workspace">
      <div className="demo-mobile-toolbar">
        <button type="button" onClick={onBack}>← Lobby</button>
        <span>Spielleitung</span>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      <div className="demo-command-hero">
        <div>
          <p className="section-label">Spielleitung · Runde {round}</p>
          <h1>{roundDefinition.title}</h1>
          <p>{snapshot.hostMessage}</p>
        </div>
        <div className="demo-phase-badge">
          <small>Aktuelle Phase</small>
          <strong>{PHASE_LABELS[snapshot.game.phase]}</strong>
        </div>
      </div>

      <section className="demo-host-guide" aria-labelledby="host-guide-title">
        <div className="demo-guide-head">
          <div>
            <p className="section-label">Regieanweisung</p>
            <h2 id="host-guide-title">{guide.title}</h2>
          </div>
          <span className="demo-guide-phase">
            {PHASE_LABELS[snapshot.game.phase]}
          </span>
        </div>
        <p className="demo-guide-objective">{guide.objective}</p>
        <div className="demo-guide-grid">
          <div>
            <h3>Vor dem nächsten Klick prüfen</h3>
            <ul>
              {guide.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="demo-click-effect">
            <h3>Was der Klick auslöst</h3>
            <strong>{guide.clickLabel}</strong>
            <p>{guide.clickEffect}</p>
          </div>
        </div>
        {guide.warning && (
          <div className="demo-guide-warning">
            <strong>Achtung:</strong> {guide.warning}
          </div>
        )}
        {guide.blockedReason && (
          <div className="demo-guide-blocked">
            <strong>Noch gesperrt:</strong> {guide.blockedReason}
          </div>
        )}
      </section>

      <div className="demo-metrics">
        <div><small>Gewinnerpool</small><strong>{eligibleCount}</strong></div>
        <div><small>Stimmberechtigt</small><strong>{votingCount}</strong></div>
        <div><small>Stimmen</small><strong>{voteCount}/{votingCount}</strong></div>
        <div><small>Millionär · geheim</small><strong>{currentMillionaire?.name ?? "Nicht ausgelost"}</strong></div>
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
          <p className="demo-small-copy">
            Eingeladene Profile werden erst nach der persönlichen Registrierung aktiv.
            Ausscheiden betrifft nur den Gewinnerpool; Abreise entfernt zusätzlich aus
            Abstimmungen und Teams.
          </p>
          <div className="demo-player-list">
            {snapshot.game.players.map((player) => {
              const team = getTeamForPlayer(teamAssignments, player.id);
              return (
                <div className="demo-player-row" key={player.id}>
                  <Avatar player={player} />
                  <div className="demo-player-copy">
                    <strong>{player.name}</strong>
                    <small>
                      {playerDescription(player)}
                      {team ? ` · ${teamTitle(team)}` : ""}
                    </small>
                  </div>
                  <span className={`demo-status ${getPlayerStatusClass(player)}`}>
                    {getPlayerStatusLabel(player)}
                  </span>
                  <select
                    aria-label={`Aktion für ${player.name}`}
                    value={pendingActions[player.id] ?? "eliminate"}
                    onChange={(event) =>
                      onPendingAction(
                        player.id,
                        event.target.value as PlayerLifecycleAction,
                      )
                    }
                  >
                    {Object.entries(ACTION_LABELS).map(([value, label]) => (
                      <option value={value} key={value}>{label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onPlayerAction(player.id)}
                    disabled={player.registrationStatus === "invited"}
                  >
                    Anwenden
                  </button>
                </div>
              );
            })}
          </div>
        </article>

        <div className="demo-control-column">
          <article className="demo-panel">
            <p className="section-label">Geheime Rolle</p>
            <h2>Zufallsauslosung</h2>
            <div className="demo-secret-name">
              {currentMillionaire?.name ?? "Noch niemand"}
            </div>
            <p className="demo-small-copy">
              Die Rolle wird niemals manuell vergeben. Bei Korkenabgabe wird der
              bisherige Millionär aus der Ziehung ausgeschlossen.
            </p>
            {!snapshot.game.millionairePlayerId && (
              <button
                className="button button-primary full-width"
                type="button"
                onClick={onDrawRandom}
              >
                {snapshot.game.phase === "lobby"
                  ? "Startmillionär zufällig auslosen"
                  : "Ersatz zufällig auslosen"}
              </button>
            )}
          </article>

          <article className="demo-panel challenge-control-card">
            <p className="section-label">Challenge-Auswahl · 16 Prüfungen</p>
            <h2>{challenge?.title ?? "Challenge auswählen"}</h2>
            <select
              value={challenge?.id ?? ""}
              onChange={(event) => onChallenge(event.target.value)}
              disabled={!["lobby", "mission", "challenge"].includes(
                snapshot.game.phase,
              )}
            >
              <optgroup label="Originale Blaue-Adria-Challenges">
                {CHALLENGES.filter((entry) => entry.original).map(
                  (entry) => (
                    <option value={entry.id} key={entry.id}>
                      {entry.title} · {entry.publicName}
                    </option>
                  ),
                )}
              </optgroup>
              <optgroup label="Neue Challenge-Optionen">
                {CHALLENGES.filter((entry) => !entry.original).map(
                  (entry) => (
                    <option value={entry.id} key={entry.id}>
                      {entry.title} · {entry.publicName}
                    </option>
                  ),
                )}
              </optgroup>
            </select>

            {challenge && (
              <div className="challenge-detail-stack">
                <div>
                  <strong>Spieler-Briefing</strong>
                  <p>{challenge.playerBriefing}</p>
                </div>
                <div>
                  <strong>Spielleiter-Ablauf</strong>
                  <p>{challenge.hostInstructions}</p>
                </div>
                <div className="challenge-meta-grid">
                  <span><small>Dauer</small>{challenge.duration}</span>
                  <span><small>Siegbedingung</small>{challenge.winCondition}</span>
                </div>
                <div>
                  <strong>Material</strong>
                  <ul>
                    {challenge.material.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="challenge-safety">
                  <strong>Sicherheit:</strong> {challenge.safetyNote}
                </div>
              </div>
            )}

            <button
              className="button button-secondary full-width"
              type="button"
              onClick={onDrawTeams}
              disabled={!["lobby", "mission", "challenge"].includes(
                snapshot.game.phase,
              )}
            >
              Teams zufällig neu auslosen
            </button>

            <div className="host-team-grid">
              {(["azur", "gold"] as const).map((team) => (
                <div className={`host-team-card team-${team}`} key={team}>
                  <strong>{teamTitle(team)}</strong>
                  <ul>
                    {teamAssignments
                      .filter((assignment) => assignment.team === team)
                      .map((assignment) => (
                        <li key={assignment.playerId}>
                          {snapshot.game.players.find(
                            (player) => player.id === assignment.playerId,
                          )?.name ?? "Unbekannt"}
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    className={challengeWinner === team ? "active" : ""}
                    onClick={() => onChallengeWinner(team)}
                    disabled={snapshot.game.phase !== "challenge"}
                  >
                    {challengeWinner === team
                      ? "Als Sieger bestätigt"
                      : "Als Gewinnerteam bestätigen"}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="demo-panel">
            <p className="section-label">Geheime Mission</p>
            <h2>{mission?.title ?? "Keine Mission"}</h2>
            <p className="demo-small-copy">{mission?.task}</p>
            <div className="demo-segmented">
              <button
                type="button"
                className={missionStatus === "assigned" ? "active" : ""}
                onClick={() => onMissionStatus("assigned")}
              >
                Ausgegeben
              </button>
              <button
                type="button"
                className={missionStatus === "completed" ? "active" : ""}
                onClick={() => onMissionStatus("completed")}
              >
                Erfüllt
              </button>
              <button
                type="button"
                className={missionStatus === "failed" ? "active" : ""}
                onClick={() => onMissionStatus("failed")}
              >
                Gescheitert
              </button>
            </div>
          </article>

          <article className="demo-panel">
            <p className="section-label">Fragesteller</p>
            <h2>Frage und Antwort</h2>
            <p className="demo-small-copy">
              Auswählbar sind ausschließlich Mitglieder des bestätigten Gewinnerteams.
            </p>
            <label className="demo-select-label" htmlFor="questioner-final">
              Fragesteller
            </label>
            <select
              id="questioner-final"
              value={snapshot.questionerByRound[round] ?? ""}
              onChange={(event) => onQuestioner(event.target.value)}
            >
              <option value="">Bitte auswählen</option>
              {questionerCandidates.map((player) => (
                <option value={player.id} key={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <label className="demo-select-label" htmlFor="question-final">
              Zulässige Ja-Nein-Frage
            </label>
            <textarea
              id="question-final"
              className="demo-textarea"
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Frage vertraulich dokumentieren"
            />
            <div className="demo-answer-row">
              <label>
                <input
                  type="radio"
                  name="secret-answer"
                  checked={questionAnswer}
                  onChange={() => setQuestionAnswer(true)}
                />{" "}
                Ja
              </label>
              <label>
                <input
                  type="radio"
                  name="secret-answer"
                  checked={!questionAnswer}
                  onChange={() => setQuestionAnswer(false)}
                />{" "}
                Nein
              </label>
            </div>
            <button
              className="button button-secondary full-width"
              type="button"
              onClick={() => onQuestion(questionText, questionAnswer)}
            >
              Frage und Antwort speichern
            </button>
          </article>

          <article className="demo-panel advantage-control-card">
            <p className="section-label">Vorteil-Auswahl · 16 Karten</p>
            <h2>Verdeckt konfigurieren</h2>
            <select
              value={advantageSelection?.advantageId ?? ""}
              disabled={missionStatus !== "completed"}
              onChange={(event) =>
                onAdvantage({ advantageId: event.target.value })
              }
            >
              <optgroup label="Bekannte Vorteile">
                {availableAdvantages
                  .filter((advantage) => !advantage.isNew)
                  .map((advantage) => (
                    <option value={advantage.id} key={advantage.id}>
                      {advantage.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Neue Vorteile">
                {availableAdvantages
                  .filter((advantage) => advantage.isNew)
                  .map((advantage) => (
                    <option value={advantage.id} key={advantage.id}>
                      {advantage.title}
                    </option>
                  ))}
              </optgroup>
            </select>

            {advantageDefinition && (
              <div className="advantage-description-stack">
                <div>
                  <strong>Für den Spieler</strong>
                  <p>{advantageDefinition.playerInstructions}</p>
                </div>
                <div>
                  <strong>Für die Spielleitung</strong>
                  <p>{advantageDefinition.hostInstructions}</p>
                </div>
                <div className="advantage-limit">
                  <strong>Grenze:</strong> {advantageDefinition.limit}
                </div>
              </div>
            )}

            {renderAdvantageSelectors()}

            <small className="demo-muted">
              {missionStatus === "completed"
                ? advantageDefinition?.description
                : "Ohne erfüllte Mission wird kein Vorteil angewendet."}
            </small>
          </article>

          <article className="demo-panel demo-action-panel">
            <p className="section-label">Nächste Aktion</p>
            <h2>{guide.clickLabel}</h2>
            <p className="demo-small-copy">{guide.clickEffect}</p>

            {snapshot.game.phase === "voting" && (
              <button
                className="button button-secondary full-width"
                type="button"
                onClick={onFillVotes}
              >
                Fehlende Stimmen für Test simulieren
              </button>
            )}

            {snapshot.game.phase === "evaluation" && (
              <div className="demo-action-stack">
                <button
                  className="button button-secondary full-width"
                  type="button"
                  onClick={onPreviewEvaluation}
                >
                  Auswertungsvorschau berechnen
                </button>
                {evaluation?.requiresRunoff &&
                  (snapshot.voteStageByRound[round] ?? "main") ===
                    "main" && (
                    <button
                      className="button button-primary full-width"
                      type="button"
                      onClick={onStartRunoff}
                    >
                      Stichwahl zwischen Gleichstehenden starten
                    </button>
                  )}
                {evaluation &&
                  (!evaluation.requiresRunoff ||
                    (snapshot.voteStageByRound[round] ?? "main") ===
                      "runoff") && (
                    <button
                      className="button button-primary full-width"
                      type="button"
                      onClick={onPublishResult}
                    >
                      {evaluation.requiresRunoff
                        ? "Losentscheid durchführen und veröffentlichen"
                        : "Ergebnis verbindlich veröffentlichen"}
                    </button>
                  )}
              </div>
            )}

            {snapshot.game.phase === "role_transfer" && (
              <div className="demo-action-stack">
                <div className="demo-decision-counter">
                  Rollenentscheidungen: {roleDecisionCount}/
                  {roleDecisionRequired}
                </div>
                <button
                  className="button button-secondary full-width"
                  type="button"
                  onClick={onFillRoleDecisions}
                >
                  Fehlende Entscheidungen für Test ergänzen
                </button>
                {!snapshot.roleTransferResolvedByRound[round] && (
                  <button
                    className="button button-primary full-width"
                    type="button"
                    onClick={onResolveRoleTransfer}
                  >
                    Rollenentscheidung geheim auflösen
                  </button>
                )}
              </div>
            )}

            {snapshot.game.phase !== "evaluation" &&
              snapshot.game.phase !== "role_transfer" &&
              snapshot.game.phase !== "finished" && (
                <button
                  className="button button-primary full-width"
                  type="button"
                  onClick={onPrimary}
                  disabled={Boolean(guide.blockedReason)}
                >
                  {guide.clickLabel}
                </button>
              )}

            {snapshot.game.phase === "role_transfer" &&
              snapshot.roleTransferResolvedByRound[round] && (
                <button
                  className="button button-primary full-width"
                  type="button"
                  onClick={onPrimary}
                >
                  Nächste Runde starten
                </button>
              )}

            <small className="demo-muted">
              Revision {snapshot.game.revision}
            </small>
          </article>
        </div>
      </div>

      {evaluation && (
        <section className="demo-panel demo-evaluation-preview">
          <div className="demo-panel-heading">
            <div>
              <p className="section-label">Nur Spielleitung</p>
              <h2>Auswertungsvorschau</h2>
            </div>
            <span>
              {evaluation.requiresRunoff
                ? "Gleichstand"
                : "Eindeutiges Ergebnis"}
            </span>
          </div>
          <div className="demo-tally-table">
            <div className="demo-tally-head">
              <span>Spieler</span><span>Regulär</span>
              <span>Korrektur</span><span>Wirksam</span>
            </div>
            {tallyRows.map((entry) => (
              <div className="demo-tally-row" key={entry.playerId}>
                <strong>{entry.name}</strong>
                <span>{entry.regularVotes}</span>
                <span>
                  {entry.adjustment > 0
                    ? `+${entry.adjustment}`
                    : entry.adjustment}
                </span>
                <strong>{entry.effectiveVotes}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {snapshot.finalWinner?.winnerPlayerId && (
        <section className="demo-final-winner">
          <p className="section-label">Hauptgewinner</p>
          <h2>
            {
              snapshot.game.players.find(
                (player) =>
                  player.id === snapshot.finalWinner?.winnerPlayerId,
              )?.name
            }
          </h2>
          <p>Entscheidungsweg: {snapshot.finalWinner.reason}</p>
        </section>
      )}
    </section>
  );
}
