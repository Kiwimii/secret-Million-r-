"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { DemoSnapshot } from "@/lib/demo/model";
import type { RegisterProfileInput } from "@/lib/demo/useDemoGame";
import LobbyOverview from "./LobbyOverview";

async function resizeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Bitte wähle eine Bilddatei aus.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Das Ausgangsbild darf höchstens 8 MB groß sein.");
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Das Profilbild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Das Profilbild konnte nicht verarbeitet werden."));
    element.src = source;
  });

  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Profilbild konnte nicht verarbeitet werden.");

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL("image/jpeg", 0.78);
}

export default function PortalFinal({
  snapshot,
  roundTitle,
  phaseLabel,
  onHost,
  onPlayer,
  onRegister,
  onReset,
}: {
  snapshot: DemoSnapshot;
  roundTitle: string;
  phaseLabel: string;
  onHost(): void;
  onPlayer(playerId: string): void;
  onRegister(input: RegisterProfileInput): string;
  onReset(): void;
}) {
  const invitedPlayers = useMemo(
    () =>
      snapshot.game.players.filter(
        (player) => player.registrationStatus === "invited",
      ),
    [snapshot.game.players],
  );
  const registeredPlayers = useMemo(
    () =>
      snapshot.game.players.filter(
        (player) => player.registrationStatus === "registered",
      ),
    [snapshot.game.players],
  );
  const [invitedPlayerId, setInvitedPlayerId] = useState(
    invitedPlayers[0]?.id ?? "new",
  );
  const [name, setName] = useState(invitedPlayers[0]?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [processingImage, setProcessingImage] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [playerId, setPlayerId] = useState(registeredPlayers[0]?.id ?? "");

  function selectInvitation(value: string) {
    setInvitedPlayerId(value);
    const invited = snapshot.game.players.find((player) => player.id === value);
    setName(invited?.name ?? "");
    setAvatarUrl(invited?.avatarUrl);
    setFormError(undefined);
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    setFormError(undefined);
    try {
      setAvatarUrl(await resizeProfileImage(file));
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Das Profilbild konnte nicht verarbeitet werden.",
      );
    } finally {
      setProcessingImage(false);
    }
  }

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    try {
      const newPlayerId = onRegister({
        invitedPlayerId:
          invitedPlayerId === "new" ? undefined : invitedPlayerId,
        name,
        avatarUrl,
      });
      setPlayerId(newPlayerId);
      onPlayer(newPlayerId);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Das Profil konnte nicht erstellt werden.",
      );
    }
  }

  return (
    <section className="demo-portal">
      <div className="demo-hero-panel">
        <div className="demo-hero-copy">
          <p className="section-label">Secret Millionär · Blaue Adria</p>
          <h1>Registrieren, Lobby betreten und gemeinsam starten.</h1>
          <p>
            Jeder Spieler erstellt sein persönliches Profil. Danach sehen alle dieselbe
            Lobby mit Teilnehmern, Status, Profilbildern und den zufällig ausgelosten
            Challenge-Teams.
          </p>
          <div className="demo-state-line">
            <span>Runde {snapshot.game.currentRound} · {roundTitle}</span>
            <strong>{phaseLabel}</strong>
          </div>
        </div>
        <div className="demo-coin-stage" aria-hidden="true">
          <div className="demo-coin"><span>€</span></div>
          <div className="demo-coin-ring" />
        </div>
      </div>

      <div className="demo-role-grid registration-grid">
        <article className="demo-panel registration-card">
          <p className="section-label">Persönliche Anmeldung</p>
          <h2>Dein Profil erstellen</h2>
          <p className="demo-small-copy">
            Wähle deinen eingeladenen Namen oder lege ein zusätzliches Profil an.
            Das Foto wird quadratisch zugeschnitten und nur in dieser Testversion im Browser gespeichert.
          </p>

          <form className="registration-form" onSubmit={submitRegistration}>
            <div className="registration-avatar-column">
              <div className="registration-avatar-preview">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Vorschau des Profilbilds" />
                ) : (
                  <span>{name.trim().slice(0, 1).toUpperCase() || "?"}</span>
                )}
              </div>
              <label className="profile-upload-button">
                {processingImage ? "Bild wird vorbereitet …" : "Profilbild auswählen"}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleImage}
                  disabled={processingImage}
                />
              </label>
              <small>Foto oder Handy-Kamera · maximal 8 MB</small>
            </div>

            <div className="registration-fields">
              <label className="demo-select-label" htmlFor="invitation-select">
                Einladung
              </label>
              <select
                id="invitation-select"
                value={invitedPlayerId}
                onChange={(event) => selectInvitation(event.target.value)}
              >
                {invitedPlayers.map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
                <option value="new">Zusätzliches Profil anlegen</option>
              </select>

              <label className="demo-select-label" htmlFor="registration-name">
                Anzeigename
              </label>
              <input
                id="registration-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="nickname"
                maxLength={28}
                placeholder="Dein Name"
                required
              />

              {formError && <div className="registration-error">{formError}</div>}

              <button
                className="button button-primary full-width"
                type="submit"
                disabled={processingImage}
              >
                Profil erstellen und Lobby betreten
              </button>
            </div>
          </form>
        </article>

        <article className="demo-panel demo-choice-card portal-access-card">
          <span className="demo-choice-number">SM</span>
          <p className="section-label">Bereits registriert</p>
          <h2>Zurück in dein Spiel</h2>
          <p>
            Öffne dein bestehendes Profil oder wechsle in die geführte Ansicht der
            Spielleitung.
          </p>
          <label className="demo-select-label" htmlFor="registered-player">
            Registriertes Profil
          </label>
          <select
            id="registered-player"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
            disabled={registeredPlayers.length === 0}
          >
            {registeredPlayers.length === 0 && (
              <option value="">Noch kein Profil registriert</option>
            )}
            {registeredPlayers.map((player) => (
              <option value={player.id} key={player.id}>
                {player.name}
              </option>
            ))}
          </select>
          <div className="portal-access-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={!playerId}
              onClick={() => onPlayer(playerId)}
            >
              Spielerprofil öffnen
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={onHost}
            >
              Spielleitung öffnen
            </button>
          </div>
        </article>
      </div>

      <LobbyOverview snapshot={snapshot} />

      <button className="demo-reset-link" type="button" onClick={onReset}>
        Testspiel vollständig zurücksetzen
      </button>
    </section>
  );
}
