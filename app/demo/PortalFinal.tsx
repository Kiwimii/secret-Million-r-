"use client";

import { useState } from "react";
import type { PlayerState } from "@/lib/game/types";

export default function PortalFinal({
  players,
  round,
  roundTitle,
  phaseLabel,
  onHost,
  onPlayer,
  onReset,
}: {
  players: PlayerState[];
  round: number;
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
          <p className="section-label">Einsatzfähige Testumgebung</p>
          <h1>Spielleitung und Spieleransicht in einem Browser.</h1>
          <p>
            Öffne zwei Registerkarten: eine für die Spielleitung und eine für einen Spieler.
            Rollen, Abstimmungen und der komplette Rundenablauf werden zwischen den Tabs synchronisiert.
          </p>
          <div className="demo-state-line">
            <span>Runde {round} · {roundTitle}</span>
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
          <p>
            Die Ansicht erklärt jeden nächsten Schritt, alle Voraussetzungen und die genaue Wirkung
            des nächsten Klicks.
          </p>
          <button className="button button-primary" type="button" onClick={onHost}>
            Spielleitung öffnen
          </button>
        </article>

        <article className="demo-panel demo-choice-card">
          <span className="demo-choice-number">02</span>
          <p className="section-label">Private Spieleransicht</p>
          <h2>Als Spieler testen</h2>
          <p>
            Rolle diskret aufdecken, Mission oder Frage lesen, geheim abstimmen und den Korken
            behalten oder abgeben.
          </p>
          <label className="demo-select-label" htmlFor="demo-player-final">Testspieler auswählen</label>
          <select
            id="demo-player-final"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
          >
            {players.map((player) => (
              <option value={player.id} key={player.id}>{player.name}</option>
            ))}
          </select>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onPlayer(playerId)}
          >
            Spieleransicht öffnen
          </button>
        </article>
      </div>

      <button className="demo-reset-link" type="button" onClick={onReset}>
        Testspiel vollständig zurücksetzen
      </button>
    </section>
  );
}
