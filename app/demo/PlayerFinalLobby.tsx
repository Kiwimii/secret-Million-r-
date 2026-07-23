"use client";

import { ADVANTAGES, MISSIONS } from "@/lib/game/catalog";
import { getChallengeById } from "@/lib/game/challenges";
import {
  PHASE_LABELS,
  ROUNDS,
  getRoundPhaseSequence,
} from "@/lib/game/constants";
import { getAccusablePlayers, getPlayerCapabilities } from "@/lib/game/engine";
import { getTeamForPlayer } from "@/lib/game/teams";
import type { PlayerState } from "@/lib/game/types";
import type { DemoSnapshot, RoleDecision } from "@/lib/demo/model";
import {
  getPlayerStatusClass,
  getPlayerStatusLabel,
} from "@/lib/demo/useDemoGame";
import LobbyOverview from "./LobbyOverview";

function phaseInstruction(phase: string, isMillionaire: boolean): string {
  const instructions: Record<string, string> = {
    lobby:
      "Prüfe dein Profil, die Teilnehmerliste und dein zufällig ausgelostes Challenge-Team. Warte anschließend auf die Startfreigabe.",
    role_reveal:
      "Öffne deine Rollenkarte diskret und merke dir deine Aufgabe.",
    mission: isMillionaire
      ? "Lies deine geheime Mission und verhalte dich unauffällig."
      : "Beobachte die anderen. Die geheime Mission ist nicht öffentlich.",
    challenge:
      "Spiele die ausgewählte Team-Challenge. Das Gewinnerteam bestimmt anschließend den Fragesteller.",
    question:
      "Der bestimmte Fragesteller erhält eine exklusive Ja-Nein-Information von André.",
    discussion:
      "Diskutiert offen. Der Fragesteller darf über seine Antwort berichten oder bluffen.",
    mission_review:
      "André bewertet verdeckt, ob die Mission erfüllt wurde.",
    advantage:
      "Ein möglicher Vorteil wird ausschließlich für den Millionär vorbereitet.",
    evaluation:
      "Die Spielleitung zählt reguläre Stimmen und mögliche Vorteilskorrekturen.",
    role_transfer:
      "Gib deine geheime Rollenentscheidung ab. Niemand bestimmt selbst den Nachfolger.",
    finished:
      "Das Spiel ist beendet. Der Hauptgewinner wird aufgelöst.",
  };
  return (
    instructions[phase] ??
    "Warte auf die nächste Freigabe der Spielleitung."
  );
}

function teamLabel(team?: "azur" | "gold") {
  if (team === "azur") return "Team Azur";
  if (team === "gold") return "Team Gold";
  return "Noch kein Team";
}

export default function PlayerFinalLobby({
  snapshot,
  player,
  roleRevealed,
  voteTargetId,
  onBack,
  onRevealRole,
  onVoteTarget,
  onSubmitVote,
  onRoleDecision,
}: {
  snapshot: DemoSnapshot;
  player: PlayerState;
  roleRevealed: boolean;
  voteTargetId: string;
  onBack(): void;
  onRevealRole(): void;
  onVoteTarget(playerId: string): void;
  onSubmitVote(): void;
  onRoleDecision(decision: RoleDecision): void;
}) {
  const round = snapshot.game.currentRound;
  const roundDefinition =
    ROUNDS.find((entry) => entry.number === round) ?? ROUNDS[0];
  const capabilities = getPlayerCapabilities(player);
  const isMillionaire =
    player.id === snapshot.game.millionairePlayerId &&
    player.role === "millionaire";
  const hasActiveRole =
    player.role !== "none" && capabilities.eligibleToWin;
  const roleTransferResolved = Boolean(
    snapshot.roleTransferResolvedByRound[round],
  );
  const nextRoleLocked =
    snapshot.game.phase === "role_transfer" && roleTransferResolved;
  const mission = MISSIONS.find(
    (entry) => entry.round === round && !entry.reserve,
  );
  const missionStatus =
    snapshot.missionStatusByRound[round] ?? "unassigned";
  const advantage = ADVANTAGES.find(
    (entry) =>
      entry.id === snapshot.advantageByRound[round]?.advantageId,
  );
  const challenge = getChallengeById(snapshot.challengeIdByRound[round]);
  const teamAssignments = snapshot.teamsByRound[round] ?? [];
  const playerTeam = getTeamForPlayer(teamAssignments, player.id);
  const challengeWinner = snapshot.challengeWinnerByRound[round];
  const voteStage = snapshot.voteStageByRound[round] ?? "main";
  const roundVotes = snapshot.votesByRound[round] ?? {
    main: {},
    runoff: {},
  };
  const submittedTargetId = roundVotes[voteStage][player.id];
  const submittedTarget = snapshot.game.players.find(
    (entry) => entry.id === submittedTargetId,
  );
  const allowedCandidates =
    voteStage === "runoff"
      ? (snapshot.runoffCandidateIdsByRound[round] ?? [])
          .map((id) =>
            snapshot.game.players.find((entry) => entry.id === id),
          )
          .filter((entry): entry is PlayerState => Boolean(entry))
      : getAccusablePlayers(snapshot.game);
  const questionerId = snapshot.questionerByRound[round];
  const isQuestioner = questionerId === player.id;
  const questionText = snapshot.questionTextByRound[round];
  const questionAnswer = snapshot.questionAnswerByRound[round];
  const roleDecision =
    snapshot.roleDecisionsByRound[round]?.[player.id];
  const phaseSequence = getRoundPhaseSequence(round);
  const phaseIndex =
    snapshot.game.phase === "lobby"
      ? 0
      : Math.max(0, phaseSequence.indexOf(snapshot.game.phase));
  const progress =
    snapshot.game.phase === "finished"
      ? 100
      : Math.round(
          (phaseIndex / Math.max(1, phaseSequence.length - 1)) * 100,
        );
  const winner = snapshot.finalWinner?.winnerPlayerId
    ? snapshot.game.players.find(
        (entry) => entry.id === snapshot.finalWinner?.winnerPlayerId,
      )
    : undefined;

  return (
    <section className="demo-player-screen">
      <div className="demo-mobile-toolbar">
        <button type="button" onClick={onBack}>← Lobby</button>
        <span>{player.name}</span>
        <span className={`demo-status ${getPlayerStatusClass(player)}`}>
          {getPlayerStatusLabel(player)}
        </span>
      </div>

      <div className="demo-player-top player-profile-top">
        <div className="player-profile-heading">
          <div className="player-profile-avatar">
            {player.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatarUrl} alt={`Profilbild von ${player.name}`} />
            ) : (
              <span>{player.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="section-label">
              Runde {round} · {roundDefinition.timing}
            </p>
            <h1>{roundDefinition.title}</h1>
            <p>{snapshot.hostMessage}</p>
          </div>
        </div>
        <span className="demo-round-number">0{round}</span>
      </div>

      <div
        className="demo-progress-track"
        aria-label={`Spielfortschritt ${progress} Prozent`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="demo-phase-line">
        <span>Aktuelle Phase</span>
        <strong>{PHASE_LABELS[snapshot.game.phase]}</strong>
      </div>

      <LobbyOverview
        snapshot={snapshot}
        currentPlayerId={player.id}
        compact={snapshot.game.phase !== "lobby"}
      />

      <section className="player-team-banner">
        <div>
          <small>Dein Challenge-Team</small>
          <strong className={`team-text-${playerTeam ?? "none"}`}>
            {teamLabel(playerTeam)}
          </strong>
        </div>
        <div>
          <small>Ausgewählte Challenge</small>
          <strong>{challenge?.title ?? "Noch nicht ausgewählt"}</strong>
        </div>
        {challengeWinner && (
          <span className={challengeWinner === playerTeam ? "winner" : ""}>
            {challengeWinner === playerTeam
              ? "Dein Team hat gewonnen"
              : `${teamLabel(challengeWinner)} hat gewonnen`}
          </span>
        )}
      </section>

      <div className="demo-player-content">
        <article
          className={`demo-role-card ${roleRevealed ? "revealed" : ""} ${
            isMillionaire ? "millionaire" : "investigator"
          }`}
        >
          {nextRoleLocked ? (
            <div className="demo-role-hidden">
              <span className="demo-lock">◆</span>
              <p className="section-label">Nächste Runde</p>
              <h2>Deine neue Rolle ist versiegelt.</h2>
              <p>
                Die Zufallsauslosung ist abgeschlossen. Deine Rolle wird erst
                beim Start der nächsten Runde sichtbar.
              </p>
            </div>
          ) : !roleRevealed ? (
            <div className="demo-role-hidden">
              <span className="demo-lock">◆</span>
              <p className="section-label">Nur für dich</p>
              <h2>Deine Rolle ist verdeckt.</h2>
              <p>Achte darauf, dass niemand auf dein Display schaut.</p>
              <button
                className="button button-primary"
                type="button"
                onClick={onRevealRole}
                disabled={player.registrationStatus !== "registered"}
              >
                Rolle aufdecken
              </button>
            </div>
          ) : !hasActiveRole ? (
            <div className="demo-role-revealed">
              <p className="section-label">Dein Status</p>
              <span className="demo-role-symbol">×</span>
              <h2>Du hast keine aktive Geheimrolle.</h2>
              <p>
                Du bleibst bei Anwesenheit Teil von Diskussionen, Challenges
                und Abstimmungen, kannst aber nicht mehr Millionär oder
                Hauptgewinner werden.
              </p>
            </div>
          ) : (
            <div className="demo-role-revealed">
              <p className="section-label">Deine geheime Rolle</p>
              <span className="demo-role-symbol">
                {isMillionaire ? "€" : "?"}
              </span>
              <h2>
                {isMillionaire
                  ? "Du bist der Millionär."
                  : "Du bist Ermittler."}
              </h2>
              <p>
                {isMillionaire
                  ? "Bleib unauffällig, erfülle deine Mission und lenke die Abstimmung von dir weg."
                  : "Beobachte die Gruppe, nutze Informationen und stimme gegen deinen Verdächtigen."}
              </p>
            </div>
          )}
        </article>

        {snapshot.game.phase === "challenge" && challenge && playerTeam && (
          <article className="demo-panel demo-challenge-card">
            <p className="section-label">
              Challenge · {teamLabel(playerTeam)}
            </p>
            <h2>{challenge.title}</h2>
            <span className="challenge-public-name">
              {challenge.publicName} · {challenge.duration}
            </span>
            <p>{challenge.playerBriefing}</p>
            <dl>
              <div>
                <dt>Siegbedingung</dt>
                <dd>{challenge.winCondition}</dd>
              </div>
              <div>
                <dt>Sicherheit</dt>
                <dd>{challenge.safetyNote}</dd>
              </div>
            </dl>
          </article>
        )}

        {player.attendanceStatus === "departed" && (
          <article className="demo-panel demo-info-card danger">
            <p className="section-label">Spiel beendet</p>
            <h2>Du wurdest als abgereist markiert.</h2>
            <p>
              Du nimmst nicht mehr an Abstimmungen, Challenges oder
              Rollenwechseln teil.
            </p>
          </article>
        )}

        {!capabilities.eligibleToWin &&
          player.attendanceStatus !== "departed" && (
            <article className="demo-panel demo-info-card danger">
              <p className="section-label">Statushinweis</p>
              <h2>Du bist aus dem Gewinnerpool ausgeschieden.</h2>
              <p>
                Du spielst weiter mit, darfst diskutieren, Challenges
                bestreiten und abstimmen. Den Hauptpreis kannst du nicht mehr
                gewinnen.
              </p>
            </article>
          )}

        {isMillionaire &&
          roleRevealed &&
          !nextRoleLocked &&
          missionStatus !== "unassigned" && (
            <article className="demo-panel demo-mission-card">
              <p className="section-label">
                Geheime Mission · nur für dich
              </p>
              <h2>{mission?.title}</h2>
              <p>{mission?.task}</p>
              <dl>
                <div>
                  <dt>Erfolg</dt>
                  <dd>{mission?.successCriteria}</dd>
                </div>
                <div>
                  <dt>Zeitfenster</dt>
                  <dd>{mission?.timeWindow}</dd>
                </div>
              </dl>
              <span className={`mission-state mission-${missionStatus}`}>
                {missionStatus}
              </span>
            </article>
          )}

        {isMillionaire &&
          roleRevealed &&
          missionStatus === "completed" &&
          advantage && (
            <article className="demo-panel demo-advantage-player-card">
              <p className="section-label">Geheimer Vorteil · nur für dich</p>
              <h2>{advantage.title}</h2>
              <p>{advantage.playerInstructions}</p>
              <div className="advantage-player-limit">
                <strong>Grenze:</strong> {advantage.limit}
              </div>
            </article>
          )}

        {isQuestioner && questionText && snapshot.game.phase !== "lobby" && (
          <article className="demo-panel demo-question-card">
            <p className="section-label">Exklusive Information · nur für dich</p>
            <h2>{questionText}</h2>
            <div
              className={`demo-secret-answer ${
                questionAnswer ? "yes" : "no"
              }`}
            >
              {questionAnswer ? "JA" : "NEIN"}
            </div>
            <p>
              Du darfst der Gruppe die Wahrheit sagen oder bluffen. Zeige diese
              Karte nicht herum.
            </p>
          </article>
        )}

        {snapshot.game.phase === "voting" && capabilities.canVote && (
          <article className="demo-panel demo-vote-card">
            <p className="section-label">
              {voteStage === "runoff"
                ? "Geheime Stichwahl"
                : "Geheime Hauptabstimmung"}
            </p>
            <h2>
              {voteStage === "runoff"
                ? "Wer scheidet im Gleichstand aus?"
                : "Wer ist der Millionär?"}
            </h2>
            {submittedTarget ? (
              <div className="demo-vote-confirmed">
                <span>✓</span>
                <strong>Stimme gespeichert</strong>
                <p>Deine Auswahl: {submittedTarget.name}</p>
              </div>
            ) : (
              <>
                <div className="demo-vote-grid">
                  {allowedCandidates.map((candidate) => (
                    <button
                      className={
                        voteTargetId === candidate.id ? "selected" : ""
                      }
                      type="button"
                      key={candidate.id}
                      onClick={() => onVoteTarget(candidate.id)}
                    >
                      <span>{candidate.name.slice(0, 1)}</span>
                      <strong>{candidate.name}</strong>
                    </button>
                  ))}
                </div>
                <button
                  className="button button-primary full-width"
                  type="button"
                  onClick={onSubmitVote}
                >
                  Stimme geheim abgeben
                </button>
              </>
            )}
          </article>
        )}

        {snapshot.game.phase === "role_transfer" &&
          capabilities.eligibleToWin &&
          !roleTransferResolved && (
            <article className="demo-panel demo-role-decision-card">
              <p className="section-label">Geheime Rollenentscheidung</p>
              <h2>
                {isMillionaire
                  ? "Was geschieht mit dem Korken?"
                  : "Bestätige deine Rollenkarte."}
              </h2>
              {roleDecision ? (
                <div className="demo-vote-confirmed">
                  <span>✓</span>
                  <strong>Entscheidung gespeichert</strong>
                  <p>Die Auflösung erfolgt erst durch die Spielleitung.</p>
                </div>
              ) : isMillionaire ? (
                <div className="demo-role-decision-actions">
                  <button
                    className="button button-secondary full-width"
                    type="button"
                    onClick={() => onRoleDecision("keep")}
                  >
                    Korken behalten
                  </button>
                  <button
                    className="button button-primary full-width"
                    type="button"
                    onClick={() => onRoleDecision("release")}
                  >
                    Korken abgeben
                  </button>
                  <p>
                    Bei Abgabe bestimmst du keinen Nachfolger. Die App lost
                    geheim und zufällig aus allen anderen Berechtigten aus.
                  </p>
                </div>
              ) : (
                <button
                  className="button button-primary full-width"
                  type="button"
                  onClick={() => onRoleDecision("not_millionaire")}
                >
                  Bestätigen: Ich bin nicht der Millionär
                </button>
              )}
            </article>
          )}

        {snapshot.game.phase === "result" && snapshot.lastOutcome && (
          <article className="demo-panel demo-result-card">
            <p className="section-label">Rundenergebnis</p>
            <span className="demo-result-mark">×</span>
            <h2>
              {
                snapshot.game.players.find(
                  (entry) =>
                    entry.id === snapshot.lastOutcome?.eliminatedPlayerId,
                )?.name
              }{" "}
              scheidet aus dem Gewinnerpool aus.
            </h2>
            <p>
              {snapshot.lastOutcome.millionaireSurvived
                ? "Der Millionär blieb unerkannt."
                : "Der Millionär wurde enttarnt. Vor der nächsten Runde wird zufällig neu ausgelost."}
            </p>
          </article>
        )}

        {snapshot.game.phase === "finished" && winner && (
          <article className="demo-panel demo-result-card demo-winner-card">
            <p className="section-label">Secret Millionär · Hauptgewinn</p>
            <span className="demo-role-symbol">€</span>
            <h2>{winner.name} gewinnt das Spiel.</h2>
            <p>
              Es gibt genau einen Hauptgewinner. Der Entscheidungsweg war:{" "}
              {snapshot.finalWinner?.reason}.
            </p>
          </article>
        )}

        {snapshot.game.phase !== "voting" &&
          snapshot.game.phase !== "result" &&
          snapshot.game.phase !== "challenge" &&
          snapshot.game.phase !== "finished" && (
            <article className="demo-panel demo-info-card">
              <p className="section-label">Aktueller Auftrag</p>
              <h2>{PHASE_LABELS[snapshot.game.phase]}</h2>
              <p>
                {phaseInstruction(snapshot.game.phase, isMillionaire)}
              </p>
            </article>
          )}
      </div>
    </section>
  );
}
