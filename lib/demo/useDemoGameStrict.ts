"use client";

import { useMemo } from "react";
import {
  countEligiblePlayers,
  countVotingPlayers,
  getPlayerStatusClass,
  getPlayerStatusLabel,
  getRoleDecisionCount,
  getRoleDecisionRequired,
  getVoteCount,
  useDemoGame as useBaseDemoGame,
  type DemoActions,
} from "./useDemoGame";

export {
  countEligiblePlayers,
  countVotingPlayers,
  getPlayerStatusClass,
  getPlayerStatusLabel,
  getRoleDecisionCount,
  getRoleDecisionRequired,
  getVoteCount,
};

export function useDemoGame() {
  const base = useBaseDemoGame();
  const { snapshot } = base;

  const actions = useMemo<DemoActions>(() => ({
    ...base.actions,

    drawReplacementMillionaire() {
      if (["lobby", "result", "role_transfer", "finished"].includes(snapshot.game.phase)) {
        throw new Error(
          "In dieser Phase darf kein Ersatzmillionär direkt ausgelost werden. Nutze die vorgesehene Rollenentscheidung.",
        );
      }
      return base.actions.drawReplacementMillionaire();
    },

    setMissionStatus(status) {
      if (status === "assigned" && snapshot.game.phase !== "mission") {
        throw new Error("Die Mission kann nur in der Missionsphase ausgegeben werden.");
      }
      if (
        (status === "completed" || status === "failed") &&
        snapshot.game.phase !== "mission_review"
      ) {
        throw new Error("Erfolg oder Scheitern wird ausschließlich in der Missionsbewertung festgelegt.");
      }
      base.actions.setMissionStatus(status);
    },

    setQuestioner(playerId) {
      if (snapshot.game.phase !== "question") {
        throw new Error("Der Fragesteller wird ausschließlich in der Fragephase festgelegt.");
      }
      base.actions.setQuestioner(playerId);
    },

    setQuestion(question, answer) {
      if (snapshot.game.phase !== "question") {
        throw new Error("Frage und Antwort dürfen nur in der Fragephase gespeichert werden.");
      }
      base.actions.setQuestion(question, answer);
    },

    setAdvantage(selection) {
      if (snapshot.game.phase !== "advantage") {
        throw new Error("Der Vorteil wird ausschließlich vor Öffnung der Abstimmung festgelegt.");
      }
      base.actions.setAdvantage(selection);
    },

    fillMissingVotes() {
      if (snapshot.game.phase !== "voting") {
        throw new Error("Stimmen können nur während einer geöffneten Abstimmung ergänzt werden.");
      }
      base.actions.fillMissingVotes();
    },

    evaluateCurrentVotes() {
      if (snapshot.game.phase !== "evaluation") {
        throw new Error("Die Auswertung ist erst nach Schließen der Abstimmung verfügbar.");
      }
      return base.actions.evaluateCurrentVotes();
    },

    startRunoff(candidatePlayerIds) {
      if (snapshot.game.phase !== "evaluation") {
        throw new Error("Eine Stichwahl kann nur aus der Auswertungsphase gestartet werden.");
      }
      base.actions.startRunoff(candidatePlayerIds);
    },

    finalizeCurrentRound() {
      if (snapshot.game.phase !== "evaluation") {
        throw new Error("Ein Rundenergebnis kann nur aus der Auswertungsphase veröffentlicht werden.");
      }
      return base.actions.finalizeCurrentRound();
    },
  }), [base.actions, snapshot.game.phase]);

  return { ...base, actions };
}
