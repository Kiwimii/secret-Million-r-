"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_STORAGE_KEY = "secret-millionaer.live-session.v1";

type Identity = {
  accessRole: "host" | "player";
  gameId: string;
  joinCode: string;
};

type Player = {
  memberId: string;
  displayName: string;
  attendanceStatus: string;
  winnerPoolStatus: string;
  currentRole: string;
  screenKey?: string;
  stepKey?: string;
  roleRevealed?: boolean;
  missionOpened?: boolean;
  advantageOpened?: boolean;
  challengeBriefingOpened?: boolean;
  voteSubmitted?: boolean;
  roleDecisionSubmitted?: boolean;
};

type Overview = {
  game: {
    currentRound: number;
    phase: string;
    currentMillionaireMemberId?: string;
  };
  players: Player[];
};

type ActionKey = "role" | "mission" | "challenge" | "advantage" | "vote" | "role_decision";

const ACTION_LABELS: Record<ActionKey, string> = {
  role: "Rolle als geöffnet markieren",
  mission: "Mission als geöffnet markieren",
  challenge: "Challenge-Briefing als geöffnet markieren",
  advantage: "Vorteil als geöffnet markieren",
  vote: "Ersatzstimme abgeben",
  role_decision: "Korkenentscheidung ersetzen",
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

export default function HostPlayerRecoveryPanel() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [identity, setIdentity] = useState<Identity>();
  const [overview, setOverview] = useState<Overview>();
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [action, setAction] = useState<ActionKey>("role");
  const [targetId, setTargetId] = useState("");
  const [decision, setDecision] = useState<"keep" | "release">("keep");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }, []);

  const refresh = useCallback(async () => {
    const currentIdentity = readIdentity();
    setIdentity(currentIdentity);
    if (!currentIdentity || !isSupabaseConfigured()) {
      setOverview(undefined);
      return;
    }
    const result = await getClient().rpc("get_live_host_game_overview", {
      target_game_id: currentIdentity.gameId,
    });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    const next = result.data as Overview;
    setOverview(next);
    setPlayerId((current) => current || next.players[0]?.memberId || "");
  }, [getClient]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const selectedPlayer = useMemo(
    () => overview?.players.find((player) => player.memberId === playerId),
    [overview, playerId],
  );

  const eligibleTargets = useMemo(
    () => overview?.players.filter((player) => player.attendanceStatus === "present" && player.winnerPoolStatus === "eligible") ?? [],
    [overview],
  );

  useEffect(() => {
    if (action === "vote" && !targetId) {
      setTargetId(eligibleTargets[0]?.memberId ?? "");
    }
  }, [action, eligibleTargets, targetId]);

  async function rescue() {
    if (!identity || !selectedPlayer) return;
    if (action === "vote" && !targetId) {
      setError("Bitte ein Abstimmungsziel auswählen.");
      return;
    }
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await getClient().rpc("host_rescue_player_action", {
        target_game_id: identity.gameId,
        target_member_id: selectedPlayer.memberId,
        requested_action: action,
        requested_target_member_id: action === "vote" ? targetId : null,
        requested_decision: action === "role_decision" ? decision : null,
      });
      if (result.error) throw new Error(result.error.message);
      setMessage(`${selectedPlayer.displayName}: ${ACTION_LABELS[action]} wurde durchgeführt.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Notfallaktion ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (!identity || !overview) return null;

  return (
    <div className="hpr-root" data-host-player-recovery="v1">
      {!open && (
        <button className="hpr-trigger" type="button" onClick={() => setOpen(true)}>
          Spieler manuell weiterführen
        </button>
      )}

      {open && (
        <div className="hpr-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="hpr-dialog" role="dialog" aria-modal="true" aria-labelledby="hpr-title">
            <button className="hpr-close" type="button" aria-label="Schließen" onClick={() => setOpen(false)}>×</button>
            <p>André · Notfallsteuerung</p>
            <h2 id="hpr-title">Spieler manuell weiterführen</h2>
            <span>Nur verwenden, wenn ein Spieler technisch festhängt. Jede Aktion wird im Spielprotokoll gespeichert.</span>

            <label>
              <b>Spieler</b>
              <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
                {overview.players.map((player) => (
                  <option value={player.memberId} key={player.memberId}>{player.displayName}</option>
                ))}
              </select>
            </label>

            {selectedPlayer && (
              <div className="hpr-status">
                <strong>{selectedPlayer.displayName}</strong>
                <small>{selectedPlayer.screenKey ?? "unbekannte Ansicht"} · {selectedPlayer.stepKey ?? "kein Schritt"}</small>
              </div>
            )}

            <label>
              <b>Manuelle Aktion</b>
              <select value={action} onChange={(event) => setAction(event.target.value as ActionKey)}>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>

            {action === "vote" && (
              <label>
                <b>Abstimmungsziel</b>
                <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                  {eligibleTargets.map((player) => (
                    <option value={player.memberId} key={player.memberId}>{player.displayName}</option>
                  ))}
                </select>
              </label>
            )}

            {action === "role_decision" && (
              <label>
                <b>Korkenentscheidung</b>
                <select value={decision} onChange={(event) => setDecision(event.target.value as "keep" | "release")}>
                  <option value="keep">Millionär bleiben</option>
                  <option value="release">Zufällig weitergeben</option>
                </select>
              </label>
            )}

            <div className="hpr-warning">
              {action === "vote"
                ? "Die ausgewählte Stimme wird verbindlich im Namen des Spielers gespeichert."
                : action === "role_decision"
                  ? "Diese Entscheidung ersetzt die Eingabe des aktuellen Millionärs."
                  : "Der gewählte Pflichtschritt wird als erledigt markiert und der Spieler synchronisiert."}
            </div>

            {message && <div className="hpr-success">{message}</div>}
            {error && <div className="hpr-error">{error}</div>}

            <button className="hpr-submit" type="button" disabled={busy || !selectedPlayer} onClick={() => void rescue()}>
              {busy ? "Aktion wird ausgeführt …" : "Aktion manuell durchführen"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
