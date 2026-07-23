"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PHASE_LABELS, ROUNDS } from "@/lib/game/constants";
import { getHostGuide } from "@/lib/game/host-guide";
import type { PlayerLifecycleAction, VoteEvaluation } from "@/lib/game/types";
import {
  countEligiblePlayers,
  countVotingPlayers,
  getRoleDecisionCount,
  getRoleDecisionRequired,
  getVoteCount,
  useDemoGame,
} from "@/lib/demo/useDemoGame";
import HostFinal from "./HostFinal";
import PlayerFinal from "./PlayerFinal";
import PortalFinal from "./PortalFinal";

type ViewMode = "portal" | "host" | "player";

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "gerade eben";
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DemoAppFinal() {
  const { snapshot, actions, connected } = useDemoGame();
  const [mode, setMode] = useState<ViewMode>("portal");
  const [selectedPlayerId, setSelectedPlayerId] = useState("player-1");
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [voteTargetId, setVoteTargetId] = useState("");
  const [pendingActions, setPendingActions] = useState<Record<string, PlayerLifecycleAction>>({});
  const [evaluation, setEvaluation] = useState<VoteEvaluation>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const savedMode = window.sessionStorage.getItem("sm-final-view") as ViewMode | null;
    const savedPlayer = window.sessionStorage.getItem("sm-final-player");
    if (savedMode && ["portal", "host", "player"].includes(savedMode)) setMode(savedMode);
    if (savedPlayer) setSelectedPlayerId(savedPlayer);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("sm-final-view", mode);
    window.sessionStorage.setItem("sm-final-player", selectedPlayerId);
  }, [mode, selectedPlayerId]);

  useEffect(() => {
    setRoleRevealed(false);
    setVoteTargetId("");
    setEvaluation(undefined);
  }, [selectedPlayerId, snapshot.game.currentRound, snapshot.voteStageByRound]);

  const round = snapshot.game.currentRound;
  const roundDefinition = ROUNDS.find((entry) => entry.number === round) ?? ROUNDS[0];
  const selectedPlayer =
    snapshot.game.players.find((player) => player.id === selectedPlayerId) ??
    snapshot.game.players[0];
  const voteStage = snapshot.voteStageByRound[round] ?? "main";
  const voteCount = getVoteCount(snapshot);
  const votingCount = countVotingPlayers(snapshot);
  const eligibleCount = countEligiblePlayers(snapshot);
  const roleDecisionCount = getRoleDecisionCount(snapshot);
  const roleDecisionRequired = getRoleDecisionRequired(snapshot);
  const guide = useMemo(
    () =>
      getHostGuide({
        round,
        phase: snapshot.game.phase,
        hasMillionaire: Boolean(snapshot.game.millionairePlayerId),
        missionStatus: snapshot.missionStatusByRound[round] ?? "unassigned",
        voteStage,
        submittedVotes: voteCount,
        requiredVotes: votingCount,
        roleDecisionsSubmitted: roleDecisionCount,
        roleDecisionsRequired: roleDecisionRequired,
        roleTransferResolved: Boolean(snapshot.roleTransferResolvedByRound[round]),
        hasQuestioner: Boolean(snapshot.questionerByRound[round]),
        hasQuestion: Boolean(snapshot.questionTextByRound[round]),
      }),
    [
      round,
      snapshot.game.phase,
      snapshot.game.millionairePlayerId,
      snapshot.missionStatusByRound,
      snapshot.questionTextByRound,
      snapshot.questionerByRound,
      snapshot.roleTransferResolvedByRound,
      roleDecisionCount,
      roleDecisionRequired,
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
      setMessage(undefined);
      setError(
        caught instanceof Error
          ? caught.message
          : "Die Aktion konnte nicht ausgeführt werden.",
      );
    }
  }

  function selectMode(nextMode: ViewMode) {
    setMode(nextMode);
    setMessage(undefined);
    setError(undefined);
  }

  function handlePrimary() {
    if (snapshot.game.phase === "lobby" && !snapshot.game.millionairePlayerId) {
      run(() => {
        actions.drawInitialMillionaire();
      }, "Der Startmillionär wurde zufällig und geheim ausgelost.");
      return;
    }
    run(actions.advance, `${guide.clickLabel} wurde ausgeführt.`);
  }

  function handleRandomDraw() {
    run(() => {
      if (snapshot.game.phase === "lobby") actions.drawInitialMillionaire();
      else actions.drawReplacementMillionaire();
    }, "Die Millionärsrolle wurde zufällig und geheim ausgelost.");
  }

  function previewEvaluation() {
    run(() => {
      const nextEvaluation = actions.evaluateCurrentVotes();
      setEvaluation(nextEvaluation);
      const names = nextEvaluation.topPlayerIds
        .map((playerId) =>
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
    run(() => {
      actions.startRunoff(evaluation.topPlayerIds);
      setEvaluation(undefined);
    }, "Die geheime Stichwahl wurde geöffnet.");
  }

  function publishResult() {
    run(() => {
      actions.finalizeCurrentRound();
      setEvaluation(undefined);
    }, "Das Rundenergebnis wurde verbindlich veröffentlicht.");
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
            <small>Blaue Adria · Einsatztest</small>
          </span>
        </Link>
        <div className="demo-connection">
          <span className="live-dot" />
          Browser-Sync aktiv
        </div>
      </header>

      {mode === "portal" && (
        <PortalFinal
          players={snapshot.game.players}
          round={round}
          roundTitle={roundDefinition.title}
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
          onBack={() => selectMode("portal")}
          onReset={() => run(actions.reset, "Die Testpartie wurde zurückgesetzt.")}
          onPrimary={handlePrimary}
          onDrawRandom={handleRandomDraw}
          onPendingAction={(playerId, action) =>
            setPendingActions((current) => ({ ...current, [playerId]: action }))
          }
          onPlayerAction={(playerId) =>
            run(() => {
              const player = snapshot.game.players.find((entry) => entry.id === playerId);
              const action = pendingActions[playerId] ?? "eliminate";
              const confirmed = window.confirm(
                `${player?.name ?? "Spieler"}: „${action}“ wirklich anwenden?`,
              );
              if (!confirmed) return;
              actions.changePlayer(playerId, action);
              setEvaluation(undefined);
            })
          }
          onMissionStatus={(status) => run(() => actions.setMissionStatus(status))}
          onAdvantage={(selection) => run(() => actions.setAdvantage(selection))}
          onQuestioner={(playerId) => run(() => actions.setQuestioner(playerId))}
          onQuestion={(question, answer) => run(() => actions.setQuestion(question, answer))}
          onFillVotes={() => run(actions.fillMissingVotes, "Fehlende Stimmen wurden für den Test ergänzt.")}
          onPreviewEvaluation={previewEvaluation}
          onStartRunoff={startRunoff}
          onPublishResult={publishResult}
          onFillRoleDecisions={() =>
            run(actions.fillMissingRoleDecisions, "Fehlende Rollenentscheidungen wurden für den Test ergänzt.")
          }
          onResolveRoleTransfer={() =>
            run(() => {
              actions.resolveRoleTransfer();
            }, "Die Rollenentscheidung wurde geheim aufgelöst.")
          }
        />
      )}

      {mode === "player" && (
        <PlayerFinal
          snapshot={snapshot}
          player={selectedPlayer}
          roleRevealed={roleRevealed}
          voteTargetId={voteTargetId}
          onBack={() => selectMode("portal")}
          onRevealRole={() => setRoleRevealed(true)}
          onVoteTarget={setVoteTargetId}
          onSubmitVote={() => {
            if (!voteTargetId) {
              setError("Wähle zuerst einen Verdächtigen aus.");
              return;
            }
            run(
              () => actions.submitVote(selectedPlayer.id, voteTargetId),
              "Deine Stimme wurde geheim gespeichert.",
            );
          }}
          onRoleDecision={(decision) =>
            run(
              () => actions.submitRoleDecision(selectedPlayer.id, decision),
              "Deine geheime Rollenentscheidung wurde gespeichert.",
            )
          }
        />
      )}

      {(message || error) && (
        <div className={`demo-toast ${error ? "demo-toast-error" : ""}`} role="status">
          <span>{error ?? message}</span>
          <button
            type="button"
            onClick={() => {
              setMessage(undefined);
              setError(undefined);
            }}
          >
            ×
          </button>
        </div>
      )}

      <footer className="demo-footer">
        <span>Stand {formatUpdatedAt(snapshot.updatedAt)}</span>
        <span>Demo-Code 472918</span>
      </footer>
    </main>
  );
}
