"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamCode } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type SessionIdentity = {
  accessRole: "host" | "player";
  gameId: string;
  memberId?: string;
  joinCode: string;
};

type QuestionFlowState = {
  phase: string;
  round: number;
  winningTeam?: TeamCode;
  questionCompletedAt?: string;
  currentMemberTeam?: TeamCode;
};

type RpcRow = Record<string, unknown>;

function readIdentity(): SessionIdentity | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as Partial<SessionIdentity> | null;
    if (!parsed || (parsed.accessRole !== "host" && parsed.accessRole !== "player")) return undefined;
    if (!parsed.gameId || !parsed.joinCode) return undefined;
    return parsed as SessionIdentity;
  } catch {
    return undefined;
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function teamLabel(team?: TeamCode) {
  return team === "azur" ? "Team Azur" : team === "gold" ? "Team Gold" : "Siegerteam";
}

export default function SimplifiedQuestionFlow() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const loadingRef = useRef(false);
  const [identity, setIdentity] = useState<SessionIdentity>();
  const [flow, setFlow] = useState<QuestionFlowState>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const refresh = useCallback(async () => {
    const activeIdentity = readIdentity();
    setIdentity(activeIdentity);
    if (!activeIdentity || loadingRef.current) {
      if (!activeIdentity) setFlow(undefined);
      return;
    }

    loadingRef.current = true;
    try {
      const client = getClient();
      const session = await client.auth.getSession();
      if (session.error) throw new Error(session.error.message);
      if (!session.data.session?.user) {
        setFlow(undefined);
        return;
      }

      const lookup = await client.rpc("lookup_live_game", { raw_join_code: activeIdentity.joinCode });
      if (lookup.error) throw new Error(lookup.error.message);
      const summary = Array.isArray(lookup.data) ? lookup.data[0] as RpcRow | undefined : undefined;
      if (!summary) {
        setFlow(undefined);
        return;
      }

      const phase = String(summary.phase ?? "");
      const round = Number(summary.current_round ?? 1);
      if (phase !== "question") {
        setFlow({ phase, round });
        setError(undefined);
        return;
      }

      const publicResponse = await client.rpc("get_live_public_round_flow", {
        target_game_id: activeIdentity.gameId,
      });
      if (publicResponse.error) throw new Error(publicResponse.error.message);
      const publicFlow = (publicResponse.data ?? {}) as RpcRow;

      let currentMemberTeam: TeamCode | undefined;
      if (activeIdentity.accessRole === "player" && activeIdentity.memberId) {
        const lobbyResponse = await client.rpc("get_public_lobby_members", {
          target_game_id: activeIdentity.gameId,
        });
        if (lobbyResponse.error) throw new Error(lobbyResponse.error.message);
        const members = (lobbyResponse.data ?? []) as RpcRow[];
        const ownMember = members.find((member) => String(member.member_id ?? "") === activeIdentity.memberId);
        currentMemberTeam = optionalString(ownMember?.challenge_team) as TeamCode | undefined;
      }

      setFlow({
        phase,
        round,
        winningTeam: optionalString(publicFlow.winningTeam) as TeamCode | undefined,
        questionCompletedAt: optionalString(publicFlow.questionCompletedAt),
        currentMemberTeam,
      });
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Frageablauf konnte nicht geladen werden.");
    } finally {
      loadingRef.current = false;
    }
  }, [getClient]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
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
    const active = Boolean(identity && flow?.phase === "question");
    if (active) document.documentElement.dataset.questionFlow = "simplified-v1";
    else delete document.documentElement.dataset.questionFlow;
    return () => {
      delete document.documentElement.dataset.questionFlow;
    };
  }, [flow?.phase, identity]);

  async function confirmQuestionAsked() {
    if (!identity || !flow || identity.accessRole !== "host") return;
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await getClient().rpc("complete_live_question", {
        target_game_id: identity.gameId,
        target_round: flow.round,
      });
      if (response.error) throw new Error(response.error.message);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Frage konnte nicht bestätigt werden.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!identity || flow?.phase !== "question" || !flow.winningTeam) return null;

  if (identity.accessRole === "host") {
    return (
      <aside className="sqf-host-card" data-simplified-question-flow="host-v1" aria-live="polite">
        <p>André · Fragephase</p>
        <h2>{teamLabel(flow.winningTeam)} bestimmt den Fragesteller selbst.</h2>
        <span>Es ist keine Auswahl im Spiel nötig. Sobald die Person bei dir war und die Frage gestellt hat, bestätigst du nur diesen einen Schritt.</span>
        {error && <div className="sqf-error" role="alert">{error}</div>}
        <button type="button" disabled={submitting} onClick={() => void confirmQuestionAsked()}>
          {submitting ? "Wird bestätigt …" : "✓ Frage wurde gestellt"}
        </button>
        <small>Nach der Bestätigung startet automatisch die Diskussion.</small>
      </aside>
    );
  }

  const winner = flow.currentMemberTeam === flow.winningTeam;
  return (
    <section className={`sqf-player-stage ${winner ? "winner" : "waiting"}`} data-simplified-question-flow="player-v1">
      <div className="sqf-player-card">
        <div className="sqf-symbol" aria-hidden="true">{winner ? "★" : "…"}</div>
        <p>{winner ? "Challenge gewonnen" : "Frage des Siegerteams"}</p>
        <h2>{winner ? `${teamLabel(flow.winningTeam)} hat gewonnen.` : `${teamLabel(flow.winningTeam)} bereitet die Frage vor.`}</h2>
        <strong>{winner
          ? "Bestimmt jetzt gemeinsam einen Fragesteller aus eurem Team. Die Person geht zu André und stellt die Frage."
          : "Wartet, während das Siegerteam einen Fragesteller bestimmt und die Frage bei André stellt."}</strong>
        <span>Es muss im Spiel kein Profil ausgewählt werden. André bestätigt den Abschluss und die Partie geht automatisch weiter.</span>
        {error && <div className="sqf-error" role="alert">{error}</div>}
      </div>
    </section>
  );
}
