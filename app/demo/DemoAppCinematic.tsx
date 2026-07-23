"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PHASE_LABELS, ROUNDS } from "@/lib/game/constants";
import { getHostGuide } from "@/lib/game/host-guide";
import { getNextGameStep } from "@/lib/game/flow";
import type {
  PlayerLifecycleAction,
  TeamCode,
  VoteEvaluation,
} from "@/lib/game/types";
import {
  HOST_TUTORIAL,
  INTRO_SLIDES,
  PLAYER_TUTORIAL,
  getActionTransitionCue,
  getPhaseTransitionCue,
  type TransitionCue,
} from "@/lib/demo/onboarding";
import { clearPinAuth } from "@/lib/demo/pin-auth";
import {
  countEligiblePlayers,
  countVotingPlayers,
  getRoleDecisionCount,
  getRoleDecisionRequired,
  getVoteCount,
  useDemoGame,
} from "@/lib/demo/useDemoGame";
import {
  CinematicIntro,
  RoleTutorial,
  TransitionSequence,
} from "./CinematicExperience";
import HostFinal from "./HostFinal";
import PlayerFinal from "./PlayerFinal";
import PortalFinal from "./PortalFinal";

type ViewMode = "portal" | "host" | "player";
type EntrySection = "player" | "host";
type TutorialState =
  | { role: "player"; playerId: string }
  | { role: "host" }
  | undefined;

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "gerade eben";
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DemoAppCinematic() {
  const { snapshot, actions, connected } = useDemoGame();
  const [mode, setMode] = useState<ViewMode>("portal");
  const [introVisible, setIntroVisible] = useState(true);
  const [initialSection, setInitialSection] = useState<EntrySection>("player");
  const [tutorial, setTutorial] = useState<TutorialState>();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [voteTargetId, setVoteTargetId] = useState("");
  const [pendingActions, setPendingActions] = useState<
    Record<string, PlayerLifecycleAction>
  >({});
  const [evaluation, setEvaluation] = useState<VoteEvaluation>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [transitionCue, setTransitionCue] = useState<TransitionCue>();
  const [transitionVisible, setTransitionVisible] = useState(false);
  const transitionLocked = useRef(false);
  const timers = useRef<number[]>([]);
  const observedPhase = useRef(snapshot.game.phase);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const showError = useCallback((caught: unknown) => {
    setMessage(undefined);
    setError(
      caught instanceof Error
        ? caught.message
        : "Die Aktion konnte nicht ausgeführt werden.",
    );
  }, []);

  const playTransition = useCallback(
    (
      cue: TransitionCue,
      action?: () => void,
      onComplete?: () => void,
    ) => {
      if (transitionLocked.current) return;
      transitionLocked.current = true;
      setError(undefined);
      setTransitionCue(cue);
      setTransitionVisible(true);

      const executeTimer = window.setTimeout(() => {
        try {
          action?.();
        } catch (caught) {
          showError(caught);
        }
      }, 620);
      const closeTimer = window.setTimeout(() => {
        setTransitionVisible(false);
        transitionLocked.current = false;
        onComplete?.();
      }, cue.durationMs ?? 1850);
      timers.current.push(executeTimer, closeTimer);
    },
    [showError],
  );

  useEffect(() => {
    const previous = observedPhase.current;
    observedPhase.current = snapshot.game.phase;
    if (
      mode === "player" &&
      previous !== snapshot.game.phase &&
      !transitionLocked.current
    ) {
      playTransition(
        getPhaseTransitionCue(
          snapshot.game.phase,
          snapshot.game.currentRound,
        ),
      );
    }
  }, [mode, playTransition, snapshot.game.currentRound, snapshot.game.phase]);

  useEffect(() => {
    setRoleRevealed(false);
    setVoteTargetId("");
    setEvaluation(undefined);
  }, [
    selectedPlayerId,
    snapshot.game.currentRound,
    snapshot.game.millionairePlayerId,
    snapshot.roleTransferResolvedByRound,
    snapshot.voteStageByRound,
  ]);

  const round = snapshot.game.currentRound;
  const roundDefinition =
    ROUNDS.find((entry) => entry.number === round) ?? ROUNDS[0];
  const selectedPlayer = snapshot.game.players.find(
    (player) => player.id === selectedPlayerId,
  );
  const voteStage = snapshot.voteStageByRound[round] ?? "main";
  const voteCount = getVoteCount(snapshot);
  const votingCount = countVotingPlayers(snapshot);
  const eligibleCount = countEligiblePlayers(snapshot);
  const roleDecisionCount = getRoleDecisionCount(snapshot);
  const roleDecisionRequired = getRoleDecisionRequired(snapshot);
  const teamCount = snapshot.teamsByRound[round]?.length ?? 0;
  const registeredPlayers = snapshot.game.players.filter(
    (player) => player.registrationStatus === "registered",
  ).length;
  const guide = useMemo(
    () =>
      getHostGuide({
        round,
        phase: snapshot.game.phase,
        hasMillionaire: Boolean(snapshot.game.millionairePlayerId),
        registeredPlayers,
        invitedPlayers: 0,
        missionStatus:
          snapshot.missionStatusByRound[round] ?? "unassigned",
        voteStage,
        submittedVotes: voteCount,
        requiredVotes: votingCount,
        roleDecisionsSubmitted: roleDecisionCount,
        roleDecisionsRequired: roleDecisionRequired,
        roleTransferResolved: Boolean(
          snapshot.roleTransferResolvedByRound[round],
        ),
        hasQuestioner: Boolean(snapshot.questionerByRound[round]),
        hasQuestion: Boolean(snapshot.questionTextByRound[round]),
        hasChallenge: Boolean(snapshot.challengeIdByRound[round]),
        teamAssignments: teamCount,
        hasChallengeWinner: Boolean(
          snapshot.challengeWinnerByRound[round],
        ),
      }),
    [
      registeredPlayers,
      roleDecisionCount,
      roleDecisionRequired,
      round,
      snapshot.challengeIdByRound,
      snapshot.challengeWinnerByRound,
      snapshot.game.millionairePlayerId,
      snapshot.game.phase,
      snapshot.missionStatusByRound,
      snapshot.questionTextByRound,
      snapshot.questionerByRound,
      snapshot.roleTransferResolvedByRound,
      teamCount,
      voteCount,
      voteStage,
      votingCount,
    ],
  );

  function run(action: () => void, success?: string) {
    try {
      action();
      setError(undefined);
      if (success) setMessage(success);
    } catch (caught) {
      showError(caught);
    }
  }

  function returnToPortal() {
    setMode("portal");
    setSelectedPlayerId("");
    setRoleRevealed(false);
    setVoteTargetId("");
    setEvaluation(undefined);
    setMessage(undefined);
    setError(undefined);
  }

  function openPlayer(playerId: string, firstSetup: boolean) {
    setSelectedPlayerId(playerId);
    if (firstSetup) {
      playTransition(
        getActionTransitionCue("register"),
        undefined,
        () => setTutorial({ role: "player", playerId }),
      );
      return;
    }
    playTransition(
      getActionTransitionCue("playerUnlock"),
      undefined,
      () => setMode("player"),
    );
  }

  function openHost(firstSetup: boolean) {
    if (firstSetup) {
      playTransition(
        getActionTransitionCue("hostUnlock"),
        undefined,
        () => setTutorial({ role: "host" }),
      );
      return;
    }
    playTransition(
      getActionTransitionCue("hostUnlock"),
      undefined,
      () => setMode("host"),
    );
  }

  function completeTutorial() {
    const current = tutorial;
    setTutorial(undefined);
    if (!current) return;
    playTransition(
      current.role === "host"
        ? getActionTransitionCue("hostUnlock")
        : getActionTransitionCue("playerUnlock"),
      undefined,
      () => setMode(current.role),
    );
  }

  function handlePrimary() {
    if (
      snapshot.game.phase === "lobby" &&
      !snapshot.game.millionairePlayerId
    ) {
      playTransition(getActionTransitionCue("draw"), () => {
        actions.drawInitialMillionaire();
        setMessage("Der Startmillionär wurde zufällig und geheim ausgelost.");
      });
      return;
    }

    const next = getNextGameStep(snapshot.game);
    playTransition(
      getPhaseTransitionCue(next.phase, next.round),
      () => {
        actions.advance();
        setMessage(`${guide.clickLabel} wurde ausgeführt.`);
      },
    );
  }

  function handleRandomDraw() {
    if (["result", "role_transfer", "finished"].includes(snapshot.game.phase)) {
      setError(
        "In dieser Phase erfolgt die Neubesetzung ausschließlich über die geheime Rollenentscheidung.",
      );
      return;
    }
    playTransition(getActionTransitionCue("draw"), () => {
      if (snapshot.game.phase === "lobby") {
        actions.drawInitialMillionaire();
      } else {
        actions.drawReplacementMillionaire();
      }
      setMessage("Die Millionärsrolle wurde zufällig und geheim ausgelost.");
    });
  }

  function previewEvaluation() {
    playTransition(getActionTransitionCue("evaluation"), () => {
      const nextEvaluation = actions.evaluateCurrentVotes();
      setEvaluation(nextEvaluation);
      const names = nextEvaluation.topPlayerIds
        .map(
          (playerId) =>
            snapshot.game.players.find((player) => player.id === playerId)?.name,
        )
        .filter(Boolean)
        .join(", ");
      setMessage(
        nextEvaluation.requiresRunoff
          ? `Gleichstand zwischen: ${names}.`
          : `Eindeutige Höchstzahl bei: ${names}.`,
      );
    });
  }

  function startRunoff() {
    if (!evaluation?.requiresRunoff) {
      setError("Die Vorschau enthält keinen Gleichstand für eine Stichwahl.");
      return;
    }
    playTransition(getPhaseTransitionCue("voting", round), () => {
      actions.startRunoff(evaluation.topPlayerIds);
      setEvaluation(undefined);
      setMessage("Die geheime Stichwahl wurde geöffnet.");
    });
  }

  function publishResult() {
    playTransition(getActionTransitionCue("result"), () => {
      actions.finalizeCurrentRound();
      setEvaluation(undefined);
      setMessage("Das Rundenergebnis wurde verbindlich veröffentlicht.");
    });
  }

  function resetGame() {
    if (
      !window.confirm(
        "Die gesamte Partie, alle Profile und sämtliche PINs werden gelöscht. Wirklich zurücksetzen?",
      )
    ) {
      return;
    }
    clearPinAuth();
    actions.reset();
    setMode("portal");
    setSelectedPlayerId("");
    setTutorial(undefined);
    setIntroVisible(true);
    setMessage("Die Testpartie wurde vollständig zurückgesetzt.");
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
    <main className="demo-app cinematic-app">
      {introVisible && (
        <CinematicIntro
          slides={INTRO_SLIDES}
          onPlayer={() => {
            setInitialSection("player");
            setIntroVisible(false);
          }}
          onHost={() => {
            setInitialSection("host");
            setIntroVisible(false);
          }}
          onSkip={() => {
            setInitialSection("player");
            setIntroVisible(false);
          }}
        />
      )}

      {tutorial && (
        <RoleTutorial
          role={tutorial.role}
          slides={tutorial.role === "host" ? HOST_TUTORIAL : PLAYER_TUTORIAL}
          onComplete={completeTutorial}
        />
      )}

      <TransitionSequence cue={transitionCue} visible={transitionVisible} />

      <header className="demo-header">
        <Link href="/" className="demo-brand" aria-label="Zur Startseite">
          <span className="demo-brand-token">SM</span>
          <span>
            <strong>Secret Millionär</strong>
            <small>Blaue Adria · Einsatztest</small>
          </span>
        </Link>
        <div className="demo-connection">
          <span className="live-dot" />Browser-Sync aktiv
        </div>
      </header>

      {mode === "portal" && (
        <PortalFinal
          snapshot={snapshot}
          roundTitle={roundDefinition.title}
          phaseLabel={PHASE_LABELS[snapshot.game.phase]}
          initialSection={initialSection}
          onHost={openHost}
          onPlayer={openPlayer}
          onRegister={(input) => actions.registerProfile(input)}
        />
      )}

      {mode === "host" && (
        <HostFinal
          snapshot={snapshot}
          guide={guide}
          votingCount={votingCount}
          eligibleCount={eligibleCount}
          voteCount={voteCount}
          roleDecisionCount={roleDecisionCount}
          roleDecisionRequired={roleDecisionRequired}
          evaluation={evaluation}
          pendingActions={pendingActions}
          onBack={returnToPortal}
          onReset={resetGame}
          onPrimary={handlePrimary}
          onDrawRandom={handleRandomDraw}
          onPendingAction={(playerId, action) =>
            setPendingActions((current) => ({ ...current, [playerId]: action }))
          }
          onPlayerAction={(playerId) =>
            run(() => {
              const player = snapshot.game.players.find(
                (entry) => entry.id === playerId,
              );
              const action = pendingActions[playerId] ?? "eliminate";
              if (
                !window.confirm(
                  `${player?.name ?? "Spieler"}: Statusänderung „${action}“ wirklich anwenden?`,
                )
              ) {
                return;
              }
              actions.changePlayer(playerId, action);
              setEvaluation(undefined);
            })
          }
          onChallenge={(challengeId) => run(() => actions.setChallenge(challengeId))}
          onDrawTeams={() => {
            if (
              (snapshot.teamsByRound[round]?.length ?? 0) > 0 &&
              !window.confirm(
                "Die bestehenden Teams werden vollständig neu ausgelost. Fortfahren?",
              )
            ) {
              return;
            }
            playTransition(getActionTransitionCue("teams"), () => {
              actions.drawChallengeTeams();
              setMessage("Team Azur und Team Gold wurden zufällig ausgelost.");
            });
          }}
          onChallengeWinner={(team: TeamCode) =>
            run(
              () => actions.setChallengeWinner(team),
              `${team === "azur" ? "Team Azur" : "Team Gold"} wurde als Gewinner bestätigt.`,
            )
          }
          onMissionStatus={(status) => run(() => actions.setMissionStatus(status))}
          onAdvantage={(selection) => run(() => actions.setAdvantage(selection))}
          onQuestioner={(playerId) => run(() => actions.setQuestioner(playerId))}
          onQuestion={(question, answer) => run(() => actions.setQuestion(question, answer))}
          onFillVotes={() =>
            run(actions.fillMissingVotes, "Fehlende Stimmen wurden für den Test ergänzt.")
          }
          onPreviewEvaluation={previewEvaluation}
          onStartRunoff={startRunoff}
          onPublishResult={publishResult}
          onFillRoleDecisions={() =>
            run(
              actions.fillMissingRoleDecisions,
              "Fehlende Rollenentscheidungen wurden für den Test ergänzt.",
            )
          }
          onResolveRoleTransfer={() =>
            playTransition(getActionTransitionCue("draw"), () => {
              actions.resolveRoleTransfer();
              setMessage("Die Rollenentscheidung wurde geheim aufgelöst.");
            })
          }
        />
      )}

      {mode === "player" && selectedPlayer && (
        <PlayerFinal
          snapshot={snapshot}
          player={selectedPlayer}
          roleRevealed={roleRevealed}
          voteTargetId={voteTargetId}
          onBack={returnToPortal}
          onRevealRole={() =>
            playTransition(
              getActionTransitionCue("revealRole"),
              () => setRoleRevealed(true),
            )
          }
          onVoteTarget={setVoteTargetId}
          onSubmitVote={() => {
            if (!voteTargetId) {
              setError("Wähle zuerst einen Verdächtigen aus.");
              return;
            }
            playTransition(getActionTransitionCue("vote"), () => {
              actions.submitVote(selectedPlayer.id, voteTargetId);
              setMessage("Deine Stimme wurde geheim gespeichert.");
            });
          }}
          onRoleDecision={(decision) =>
            playTransition(getActionTransitionCue("roleDecision"), () => {
              actions.submitRoleDecision(selectedPlayer.id, decision);
              setMessage("Deine geheime Rollenentscheidung wurde gespeichert.");
            })
          }
        />
      )}

      {(message || error) && !transitionVisible && (
        <div
          className={`demo-toast ${error ? "demo-toast-error" : ""}`}
          role="status"
        >
          <span>{error ?? message}</span>
          <button
            type="button"
            onClick={() => {
              setMessage(undefined);
              setError(undefined);
            }}
          >×</button>
        </div>
      )}

      <footer className="demo-footer">
        <span>Stand {formatUpdatedAt(snapshot.updatedAt)}</span>
        <button
          type="button"
          className="footer-intro-button"
          onClick={() => setIntroVisible(true)}
        >Intro erneut ansehen</button>
        <span>Demo-Code 472918</span>
      </footer>
    </main>
  );
}
