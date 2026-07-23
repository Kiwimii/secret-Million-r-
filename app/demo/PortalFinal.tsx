"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { DemoSnapshot } from "@/lib/demo/model";
import type { RegisterProfileInput } from "@/lib/demo/useDemoGame";
import {
  configureHostPin,
  configurePlayerPin,
  hasHostPin,
  verifyHostPin,
  verifyPlayerPin,
} from "@/lib/demo/pin-auth";
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
    reader.onerror = () =>
      reject(new Error("Das Profilbild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () =>
      reject(new Error("Das Profilbild konnte nicht verarbeitet werden."));
    element.src = source;
  });

  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Das Profilbild konnte nicht verarbeitet werden.");
  }

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

function validatePin(pin: string, confirmation?: string) {
  if (!/^\d{4}$/.test(pin)) {
    return "Die PIN muss genau aus vier Ziffern bestehen.";
  }
  if (confirmation !== undefined && pin !== confirmation) {
    return "Die beiden PIN-Eingaben stimmen nicht überein.";
  }
  return undefined;
}

function readableError(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

export default function PortalFinal({
  snapshot,
  roundTitle,
  phaseLabel,
  initialSection,
  onHost,
  onPlayer,
  onRegister,
}: {
  snapshot: DemoSnapshot;
  roundTitle: string;
  phaseLabel: string;
  initialSection?: "player" | "host";
  onHost(firstSetup: boolean): void;
  onPlayer(playerId: string, firstSetup: boolean): void;
  onRegister(input: RegisterProfileInput): string;
}) {
  const registeredPlayers = useMemo(
    () =>
      snapshot.game.players.filter(
        (player) => player.registrationStatus === "registered",
      ),
    [snapshot.game.players],
  );

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [registrationPin, setRegistrationPin] = useState("");
  const [registrationPinConfirmation, setRegistrationPinConfirmation] =
    useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [playerId, setPlayerId] = useState("");
  const [playerPin, setPlayerPin] = useState("");
  const [playerLoginError, setPlayerLoginError] = useState<string>();
  const [unlockingPlayer, setUnlockingPlayer] = useState(false);

  const [hostConfigured, setHostConfigured] = useState(false);
  const [hostPin, setHostPin] = useState("");
  const [hostPinConfirmation, setHostPinConfirmation] = useState("");
  const [hostError, setHostError] = useState<string>();
  const [unlockingHost, setUnlockingHost] = useState(false);

  useEffect(() => {
    setHostConfigured(hasHostPin());
  }, []);

  useEffect(() => {
    if (!playerId && registeredPlayers[0]) {
      setPlayerId(registeredPlayers[0].id);
    }
  }, [playerId, registeredPlayers]);

  useEffect(() => {
    if (!initialSection) return;
    const target = document.getElementById(
      initialSection === "host" ? "host-access" : "player-registration",
    );
    window.setTimeout(
      () => target?.scrollIntoView({ behavior: "smooth", block: "center" }),
      120,
    );
  }, [initialSection]);

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    setFormError(undefined);
    try {
      setAvatarUrl(await resizeProfileImage(file));
    } catch (caught) {
      setFormError(
        readableError(caught, "Das Profilbild konnte nicht verarbeitet werden."),
      );
    } finally {
      setProcessingImage(false);
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const pinIssue = validatePin(
      registrationPin,
      registrationPinConfirmation,
    );
    if (pinIssue) {
      setFormError(pinIssue);
      return;
    }

    setRegistering(true);
    try {
      const newPlayerId = onRegister({ name, avatarUrl });
      await configurePlayerPin(newPlayerId, registrationPin);
      setName("");
      setAvatarUrl(undefined);
      setRegistrationPin("");
      setRegistrationPinConfirmation("");
      setPlayerId(newPlayerId);
      onPlayer(newPlayerId, true);
    } catch (caught) {
      setFormError(readableError(caught, "Das Profil konnte nicht erstellt werden."));
    } finally {
      setRegistering(false);
    }
  }

  async function unlockPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlayerLoginError(undefined);
    const pinIssue = validatePin(playerPin);
    if (pinIssue) {
      setPlayerLoginError(pinIssue);
      return;
    }
    if (!playerId) {
      setPlayerLoginError("Wähle zuerst dein Profil aus.");
      return;
    }

    setUnlockingPlayer(true);
    try {
      const verified = await verifyPlayerPin(playerId, playerPin);
      if (!verified) {
        setPlayerLoginError("Die PIN ist nicht korrekt.");
        return;
      }
      setPlayerPin("");
      onPlayer(playerId, false);
    } catch (caught) {
      setPlayerLoginError(readableError(caught, "Der Zugang konnte nicht geprüft werden."));
    } finally {
      setUnlockingPlayer(false);
    }
  }

  async function unlockHost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHostError(undefined);
    const pinIssue = validatePin(
      hostPin,
      hostConfigured ? undefined : hostPinConfirmation,
    );
    if (pinIssue) {
      setHostError(pinIssue);
      return;
    }

    setUnlockingHost(true);
    try {
      if (!hostConfigured) {
        await configureHostPin(hostPin);
        setHostConfigured(true);
        setHostPin("");
        setHostPinConfirmation("");
        onHost(true);
        return;
      }

      const verified = await verifyHostPin(hostPin);
      if (!verified) {
        setHostError("Die Spielleiter-PIN ist nicht korrekt.");
        return;
      }
      setHostPin("");
      onHost(false);
    } catch (caught) {
      setHostError(readableError(caught, "Der Spielleiterzugang konnte nicht geprüft werden."));
    } finally {
      setUnlockingHost(false);
    }
  }

  return (
    <section className="demo-portal onboarding-portal">
      <div className="demo-hero-panel onboarding-hero">
        <div className="demo-hero-copy">
          <p className="section-label">Secret Millionär · Zugangszentrale</p>
          <h1>Erstelle deine Identität. Schütze deinen Zugang.</h1>
          <p>
            Es gibt keine vorbereiteten Spielerprofile. Jede Person registriert sich
            selbst, legt eine vierstellige PIN fest und öffnet später ausschließlich
            den eigenen privaten Bereich.
          </p>
          <div className="demo-state-line">
            <span>Runde {snapshot.game.currentRound} · {roundTitle}</span>
            <strong>{phaseLabel}</strong>
          </div>
        </div>
        <div className="onboarding-security-visual" aria-hidden="true">
          <div className="security-ring"><span>4</span></div>
          <small>PIN-GESCHÜTZT</small>
        </div>
      </div>

      <div className="access-principles">
        <div><strong>01</strong><span>Neues Profil anlegen</span></div>
        <div><strong>02</strong><span>Vierstellige PIN festlegen</span></div>
        <div><strong>03</strong><span>Private Ansicht entsperren</span></div>
      </div>

      <div className="onboarding-access-grid">
        <article className="demo-panel registration-card" id="player-registration">
          <p className="section-label">Neuer Spieler</p>
          <h2>Persönliches Profil erstellen</h2>
          <p className="demo-small-copy">
            Name und Foto sind in der gemeinsamen Lobby sichtbar. Rolle, Mission,
            Vorteil, Stimme und Rollenentscheidung bleiben privat.
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
                  disabled={processingImage || registering}
                />
              </label>
              <small>Optional · Foto oder Handykamera · maximal 8 MB</small>
            </div>

            <div className="registration-fields">
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

              <div className="pin-field-grid">
                <div>
                  <label className="demo-select-label" htmlFor="registration-pin">
                    Vierstellige PIN
                  </label>
                  <input
                    id="registration-pin"
                    className="pin-input"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={registrationPin}
                    onChange={(event) =>
                      setRegistrationPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                    required
                  />
                </div>
                <div>
                  <label className="demo-select-label" htmlFor="registration-pin-repeat">
                    PIN wiederholen
                  </label>
                  <input
                    id="registration-pin-repeat"
                    className="pin-input"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={registrationPinConfirmation}
                    onChange={(event) =>
                      setRegistrationPinConfirmation(
                        event.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="••••"
                    required
                  />
                </div>
              </div>

              <div className="pin-notice">
                Die PIN wird nicht im Klartext gespeichert. Nach fünf falschen
                Versuchen wird der Zugang vorübergehend gesperrt.
              </div>

              {formError && <div className="registration-error">{formError}</div>}

              <button
                className="button button-primary full-width"
                type="submit"
                disabled={processingImage || registering}
              >
                {registering ? "Profil wird gesichert …" : "Profil erstellen und Onboarding starten"}
              </button>
            </div>
          </form>
        </article>

        <div className="access-side-column">
          <article className="demo-panel access-login-card">
            <p className="section-label">Bestehendes Spielerprofil</p>
            <h2>Persönlichen Bereich öffnen</h2>
            <p className="demo-small-copy">
              Wähle dein selbst erstelltes Profil und entsperre es mit deiner PIN.
            </p>
            <form onSubmit={unlockPlayer}>
              <label className="demo-select-label" htmlFor="registered-player">
                Dein Profil
              </label>
              <select
                id="registered-player"
                value={playerId}
                onChange={(event) => {
                  setPlayerId(event.target.value);
                  setPlayerLoginError(undefined);
                }}
                disabled={registeredPlayers.length === 0 || unlockingPlayer}
              >
                {registeredPlayers.length === 0 && (
                  <option value="">Noch kein Profil registriert</option>
                )}
                {registeredPlayers.map((player) => (
                  <option value={player.id} key={player.id}>{player.name}</option>
                ))}
              </select>

              <label className="demo-select-label" htmlFor="player-login-pin">
                Deine PIN
              </label>
              <input
                id="player-login-pin"
                className="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                value={playerPin}
                onChange={(event) =>
                  setPlayerPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="••••"
                disabled={registeredPlayers.length === 0 || unlockingPlayer}
                required
              />
              {playerLoginError && (
                <div className="registration-error">{playerLoginError}</div>
              )}
              <button
                className="button button-secondary full-width"
                type="submit"
                disabled={!playerId || registeredPlayers.length === 0 || unlockingPlayer}
              >
                {unlockingPlayer ? "PIN wird geprüft …" : "Spielerprofil entsperren"}
              </button>
            </form>
          </article>

          <article className="demo-panel access-login-card host-access-card" id="host-access">
            <p className="section-label">Spielleitung · André</p>
            <h2>{hostConfigured ? "Regiezentrale entsperren" : "Spielleiter-PIN einrichten"}</h2>
            <p className="demo-small-copy">
              {hostConfigured
                ? "Die vollständige Regieansicht ist nur nach PIN-Prüfung erreichbar."
                : "Beim ersten Start wird einmalig eine eigene vierstellige Spielleiter-PIN festgelegt."}
            </p>
            <form onSubmit={unlockHost}>
              <label className="demo-select-label" htmlFor="host-pin">
                {hostConfigured ? "Spielleiter-PIN" : "Neue Spielleiter-PIN"}
              </label>
              <input
                id="host-pin"
                className="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete={hostConfigured ? "current-password" : "new-password"}
                maxLength={4}
                value={hostPin}
                onChange={(event) =>
                  setHostPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="••••"
                required
              />
              {!hostConfigured && (
                <>
                  <label className="demo-select-label" htmlFor="host-pin-repeat">
                    PIN wiederholen
                  </label>
                  <input
                    id="host-pin-repeat"
                    className="pin-input"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={hostPinConfirmation}
                    onChange={(event) =>
                      setHostPinConfirmation(
                        event.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="••••"
                    required
                  />
                </>
              )}
              {hostError && <div className="registration-error">{hostError}</div>}
              <button
                className="button button-secondary full-width"
                type="submit"
                disabled={unlockingHost}
              >
                {unlockingHost
                  ? "Zugang wird geprüft …"
                  : hostConfigured
                    ? "Spielleitung entsperren"
                    : "PIN sichern und Regie-Onboarding starten"}
              </button>
            </form>
          </article>
        </div>
      </div>

      <LobbyOverview snapshot={snapshot} />
    </section>
  );
}
