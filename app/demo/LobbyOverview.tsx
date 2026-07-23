"use client";

import { getChallengeById } from "@/lib/game/challenges";
import { getTeamForPlayer } from "@/lib/game/teams";
import type { DemoSnapshot } from "@/lib/demo/model";
import {
  getPlayerStatusClass,
  getPlayerStatusLabel,
} from "@/lib/demo/useDemoGame";

function teamLabel(team?: "azur" | "gold") {
  if (team === "azur") return "Team Azur";
  if (team === "gold") return "Team Gold";
  return "Noch nicht ausgelost";
}

export default function LobbyOverview({
  snapshot,
  currentPlayerId,
  compact = false,
}: {
  snapshot: DemoSnapshot;
  currentPlayerId?: string;
  compact?: boolean;
}) {
  const round = snapshot.game.currentRound;
  const challenge = getChallengeById(snapshot.challengeIdByRound[round]);
  const assignments = snapshot.teamsByRound[round] ?? [];
  const winner = snapshot.challengeWinnerByRound[round];

  return (
    <section className={`demo-panel lobby-overview ${compact ? "compact" : ""}`}>
      <div className="demo-panel-heading lobby-heading">
        <div>
          <p className="section-label">Gemeinsame Lobby</p>
          <h2>Teilnehmer und Challenge-Teams</h2>
        </div>
        <div className="lobby-challenge-summary">
          <small>Aktuelle Challenge</small>
          <strong>{challenge?.title ?? "Noch nicht ausgewählt"}</strong>
          {challenge && <span>{challenge.publicName}</span>}
        </div>
      </div>

      <div className="lobby-player-grid">
        {snapshot.game.players.length === 0 && (
          <div className="lobby-empty-state">
            Noch niemand ist registriert. Das erste persönliche Profil erscheint
            hier unmittelbar nach der PIN-geschützten Anmeldung.
          </div>
        )}
        {snapshot.game.players.map((player) => {
          const team = getTeamForPlayer(assignments, player.id);
          const isCurrent = player.id === currentPlayerId;
          return (
            <article
              className={`lobby-player-card ${isCurrent ? "current" : ""}`}
              key={player.id}
            >
              <div className="lobby-avatar-wrap">
                {player.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.avatarUrl} alt={`Profilbild von ${player.name}`} />
                ) : (
                  <span>{player.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="lobby-player-meta">
                <strong>{player.name}</strong>
                <span className={`demo-status ${getPlayerStatusClass(player)}`}>
                  {getPlayerStatusLabel(player)}
                </span>
              </div>
              <div className={`lobby-team team-${team ?? "none"}`}>
                <span>{teamLabel(team)}</span>
                {winner && team === winner && <strong>Challenge-Sieger</strong>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="lobby-legend">
        <span><i className="team-dot azur" /> Team Azur</span>
        <span><i className="team-dot gold" /> Team Gold</span>
        <span>Teams werden für jede Runde neu und zufällig ausgelost.</span>
      </div>
    </section>
  );
}
