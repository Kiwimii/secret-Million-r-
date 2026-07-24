"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { CHALLENGES } from "@/lib/game/challenges";
import { MISSIONS } from "@/lib/game/catalog";
import { PHASE_LABELS } from "@/lib/game/constants";
import type { RoundNumber, RoundPhase, TeamCode } from "@/lib/game/types";
import {
  HOST_TUTORIAL,
  PLAYER_TUTORIAL,
  getActionTransitionCue,
  getPhaseTransitionCue,
  type TransitionCue,
} from "@/lib/demo/onboarding";
import { useLiveGame } from "@/lib/live/useLiveGame";
import type { LiveLobbyMember, LivePlayerProgress } from "@/lib/live/types";
import { RoleTutorial, TransitionSequence } from "./CinematicExperience";
import GoldCrownCap from "./GoldCrownCap";

const PHASE_STEPS: Array<{
  label: string;
  phases: RoundPhase[];
}> = [
  { label: "Lobby", phases: ["lobby"] },
  { label: "Rolle", phases: ["role_reveal"] },
  {
    label: "Mission",
    phases: ["mission", "challenge", "question", "discussion", "mission_review", "advantage"],
  },
  { label: "Voting", phases: ["voting", "evaluation", "result", "role_transfer"] },
  { label: "Finale", phases: ["finished"] },
];

const SCREEN_LABELS: Record<string, string> = {
  entry: "Einstieg",
  lobby: "Lobby",
  role_card: "Rollenkarte",
  mission: "Mission",
  challenge: "Challenge",
  question: "Frage",
  discussion: "Diskussion",
  voting: "Abstimmung",
  result: "Ergebnis",
  role_transfer: "Korkenwechsel",
  finished: "Finale",
  offline: "Offline",
};

function phaseScreen(phase: RoundPhase) {
  if (phase === "role_reveal") return "role_card";
  if (["mission", "mission_review", "advantage"].includes(phase)) return "mission";
  if (phase === "challenge") return "challenge";
  if (phase === "voting" || phase === "evaluation") return "voting";
  if (phase === "result") return "result";
  if (phase === "role_transfer") return "role_transfer";
  return phase;
}

function defaultStep(phase: RoundPhase) {
  if (phase === "role_reveal") return "role_available";
  if (phase === "mission") return "mission_available";
  if (phase === "challenge") return "challenge_available";
  if (phase === "voting") return "vote_pending";
  return "viewing";
}

function teamLabel(team?: TeamCode) {
  if (team === "azur") return "Team Azur";
  if (team === "gold") return "Team Gold";
  return "Noch kein Team";
}

function formatLastSeen(value?: string) {
  if (!value) return "noch nie";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 15) return "gerade eben";
  if (seconds < 60) return `vor ${seconds} Sek.`;
  return `vor ${Math.floor(seconds / 60)} Min.`;
}

async function resizeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei aus.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Das Ausgangsbild darf höchstens 8 MB groß sein.");

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
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Profilbild konnte nicht verarbeitet werden.");
  const crop = Math.min(image.naturalWidth, image.naturalHeight);
  context.drawImage(
    image,
    (image.naturalWidth - crop) / 2,
    (image.naturalHeight - crop) / 2,
    crop,
    crop,
    0,
    0,
    320,
    320,
  );
  return canvas.toDataURL("image/jpeg", 0.76);
}

function Avatar({
  name,
  avatar,
  size = "medium",
  status,
}: {
  name: string;
  avatar?: string;
  size?: "small" | "medium" | "large";
  status?: "online" | "offline" | "current";
}) {
  return (
    <span className={`mf2-avatar mf2-avatar-${size} ${status ? `is-${status}` : ""}`}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function FortuneEmblem({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`mf2-emblem ${compact ? "is-compact" : ""}`} aria-hidden="true">
      <i className="mf2-emblem-ring ring-one" />
      <i className="mf2-emblem-ring ring-two" />
      <i className="mf2-emblem-ring ring-three" />
      <b>M</b>
      <span>SECRET</span>
    </span>
  );
}

function ParticleField() {
  return (
    <div className="mf2-particles" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <i key={index} style={{ "--particle-index": index } as CSSProperties} />
      ))}
    </div>
  );
}

function PhaseRail({ phase, round }: { phase: RoundPhase; round: RoundNumber }) {
  const activeIndex = Math.max(
    0,
    PHASE_STEPS.findIndex((step) => step.phases.includes(phase)),
  );
  return (
    <div className="mf2-phase-rail" aria-label={`Runde ${round}, ${PHASE_LABELS[phase]}`}>
      {PHASE_STEPS.map((step, index) => (
        <div
          className={`${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-complete" : ""}`}
          key={step.label}
        >
          <span>{index < activeIndex ? "✓" : index + 1}</span>
          <b>{step.label}</b>
        </div>
      ))}
      <i style={{ "--phase-index": activeIndex } as CSSProperties} />
    </div>
  );
}

function Intro({
  onPlayer,
  onHost,
}: {
  onPlayer(): void;
  onHost(): void;
}) {
  return (
    <section className="mf2-intro">
      <ParticleField />
      <div className="mf2-intro-beam beam-left" />
      <div className="mf2-intro-beam beam-right" />
      <div className="mf2-intro-stage">
        <FortuneEmblem />
        <p>Midnight Fortune Experience</p>
        <h1>
          Secret
          <span>Millionär</span>
        </h1>
        <div className="mf2-intro-divider"><i /></div>
        <strong>Einer von euch spielt ein anderes Spiel.</strong>
        <small>Geheime Rollen. Missionen. Täuschung. Eine letzte Entscheidung.</small>
        <div className="mf2-intro-actions">
          <button className="mf2-button mf2-button-primary" type="button" onClick={onPlayer}>
            Spiel beitreten
          </button>
          <button className="mf2-button mf2-button-ghost" type="button" onClick={onHost}>
            Spiel leiten
          </button>
        </div>
        <div className="mf2-intro-signals">
          <span>Live synchronisiert</span>
          <span>Mehrere Geräte</span>
          <span>Private Rollen</span>
        </div>
      </div>
    </section>
  );
}

function LobbyGrid({
  members,
  currentMemberId,
  compact = false,
}: {
  members: LiveLobbyMember[];
  currentMemberId?: string;
  compact?: boolean;
}) {
  return (
    <section className={`mf2-panel mf2-lobby ${compact ? "is-compact" : ""}`}>
      <header className="mf2-section-head">
        <div>
          <p>Teilnehmer</p>
          <h2>{members.length} Spieler in der Partie</h2>
        </div>
        <span>Live auf allen Geräten</span>
      </header>
      <div className="mf2-lobby-grid">
        {members.map((member, index) => (
          <article
            className={`${member.memberId === currentMemberId ? "is-current" : ""} ${
              member.winnerPoolStatus !== "eligible" ? "is-eliminated" : ""
            }`}
            style={{ "--card-index": index } as CSSProperties}
            key={member.memberId}
          >
            <Avatar
              name={member.displayName}
              avatar={member.avatarPath}
              status={member.memberId === currentMemberId ? "current" : undefined}
            />
            <div>
              <strong>{member.displayName}</strong>
              <span>{member.attendanceStatus === "present" ? "Anwesend" : member.attendanceStatus}</span>
            </div>
            <b className={`mf2-team-badge team-${member.challengeTeam ?? "none"}`}>
              {teamLabel(member.challengeTeam)}
            </b>
          </article>
        ))}
        {members.length === 0 && (
          <div className="mf2-empty-state">Noch niemand ist beigetreten.</div>
        )}
      </div>
    </section>
  );
}

function ProgressCard({ progress, index }: { progress: LivePlayerProgress; index: number }) {
  const readiness = [
    progress.roleRevealed,
    progress.missionOpened,
    progress.challengeBriefingOpened,
    progress.voteSubmitted,
  ].filter(Boolean).length;
  return (
    <article
      className={`mf2-progress-card ${progress.currentRole === "millionaire" ? "is-millionaire" : ""}`}
      style={{ "--card-index": index, "--readiness": readiness } as CSSProperties}
    >
      <div className="mf2-progress-head">
        <Avatar
          name={progress.displayName}
          avatar={progress.avatarPath}
          size="small"
          status={progress.online ? "online" : "offline"}
        />
        <div>
          <strong>{progress.displayName}</strong>
          <span>{progress.online ? "Online" : `Offline · ${formatLastSeen(progress.lastSeenAt)}`}</span>
        </div>
        {progress.currentRole === "millionaire" && <GoldCrownCap size="small" label="Millionär" />}
      </div>
      <div className="mf2-readiness">
        <i />
        <span>{readiness}/4 bereit</span>
      </div>
      <dl>
        <div><dt>Ansicht</dt><dd>{SCREEN_LABELS[progress.screenKey] ?? progress.screenKey}</dd></div>
        <div><dt>Team</dt><dd>{teamLabel(progress.challengeTeam)}</dd></div>
      </dl>
      <div className="mf2-checks">
        <span className={progress.roleRevealed ? "done" : ""}>Rolle</span>
        <span className={progress.missionOpened ? "done" : ""}>Mission</span>
        <span className={progress.challengeBriefingOpened ? "done" : ""}>Challenge</span>
        <span className={progress.voteSubmitted ? "done" : ""}>Vote</span>
      </div>
    </article>
  );
}

export default function LiveGameAppV2() {
  const live = useLiveGame();
  const [introVisible, setIntroVisible] = useState(true);
  const [tutorial, setTutorial] = useState<"host" | "player">();
  const [entryMode, setEntryMode] = useState<"join" | "create" | "resumeHost">("join");
  const [hostPanel, setHostPanel] = useState<"overview" | "setup">("overview");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [title, setTitle] = useState("Secret Millionär – Blaue Adria");
  const [avatar, setAvatar] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [transitionCue, setTransitionCue] = useState<TransitionCue>();
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [roleCardOpen, setRoleCardOpen] = useState(false);
  const [missionCardOpen, setMissionCardOpen] = useState(false);
  const [voteTarget, setVoteTarget] = useState("");
  const [missionRound, setMissionRound] = useState<RoundNumber>(1);
  const [missionId, setMissionId] = useState(MISSIONS[0]?.id ?? "");
  const [challengeId, setChallengeId] = useState(CHALLENGES[0]?.id ?? "");
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  const summary = live.summary;
  const identity = live.identity;
  const currentMember = live.lobby.find((member) => member.memberId === identity?.memberId);
  const selectedMission = MISSIONS.find((mission) => mission.id === missionId) ?? MISSIONS[0];
  const selectedChallenge = CHALLENGES.find((challenge) => challenge.id === challengeId) ?? CHALLENGES[0];
  const millionaireProgress = live.playerProgress.find((player) => player.currentRole === "millionaire");
  const onlineCount = live.playerProgress.filter((player) => player.online).length;

  const blockers = useMemo(() => {
    if (!summary || identity?.accessRole !== "host") return [];
    const messages: string[] = [];
    if (live.lobby.length < 2) messages.push("Mindestens zwei Spieler müssen beigetreten sein.");
    if (summary.phase === "lobby" && !millionaireProgress) messages.push("Der goldene Kronkorken wurde noch nicht ausgelost.");
    if (summary.phase === "lobby" && !live.challenge) messages.push("Für Runde 1 fehlt noch eine Challenge.");
    if (summary.phase === "lobby" && !live.missionSelections[1]) messages.push("Für Runde 1 fehlt noch die geheime Mission.");
    if (summary.phase === "role_reveal") {
      const missing = live.playerProgress.filter(
        (player) => player.winnerPoolStatus === "eligible" && !player.roleRevealed,
      );
      if (missing.length) messages.push(`${missing.length} Spieler haben ihre Rolle noch nicht geöffnet.`);
    }
    if (summary.phase === "mission" && millionaireProgress && !millionaireProgress.missionOpened) {
      messages.push("Der Millionär hat seine Mission noch nicht geöffnet.");
    }
    if (summary.phase === "voting") {
      const missing = live.playerProgress.filter(
        (player) => player.attendanceStatus === "present" && !player.voteSubmitted,
      );
      if (missing.length) messages.push(`${missing.length} Stimmen fehlen noch.`);
    }
    return messages;
  }, [
    identity?.accessRole,
    live.challenge,
    live.lobby.length,
    live.missionSelections,
    live.playerProgress,
    millionaireProgress,
    summary,
  ]);

  useEffect(() => {
    if (!identity || identity.accessRole !== "player" || !summary) return;
    setRoleCardOpen(false);
    setMissionCardOpen(false);
    setVoteTarget("");
    void live.updateProgress({
      screenKey: phaseScreen(summary.phase),
      stepKey: defaultStep(summary.phase),
      phaseSeen: summary.phase,
    });
    // Absichtlich nur bei echtem Phasenwechsel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.gameId, identity?.memberId, summary?.currentRound, summary?.phase]);

  function runTransition(cue: TransitionCue, action: () => Promise<void> | void) {
    setTransitionCue(cue);
    setTransitionVisible(true);
    window.setTimeout(() => {
      void Promise.resolve(action())
        .catch((caught) =>
          setLocalError(caught instanceof Error ? caught.message : "Aktion fehlgeschlagen."),
        )
        .finally(() => window.setTimeout(() => setTransitionVisible(false), 1050));
    }, 760);
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setAvatar(await resizeProfileImage(file));
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Profilbild fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(undefined);
    setNotice(undefined);
    if (pin.length !== 4) {
      setLocalError("Die PIN braucht genau vier Ziffern.");
      return;
    }
    if ((entryMode === "join" || entryMode === "create") && pin !== confirmPin) {
      setLocalError("Die beiden PINs unterscheiden sich.");
      return;
    }
    setBusy(true);
    try {
      if (entryMode === "create") {
        const created = await live.createGame(title, pin);
        setCode(created.joinCode);
        setTutorial("host");
      } else if (entryMode === "resumeHost") {
        await live.resumeHost(code, pin);
      } else {
        await live.joinGame(code, name, pin, avatar);
        setTutorial("player");
      }
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Zugang fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (!live.ready || (live.loading && !identity)) {
    return (
      <main className="mf2-loading">
        <ParticleField />
        <FortuneEmblem />
        <div className="mf2-loading-line"><i /></div>
        <h1>Die geheime Partie wird vorbereitet.</h1>
        <p>Live-Verbindung, Rollen und Spielstand werden synchronisiert.</p>
      </main>
    );
  }

  if (introVisible && !identity) {
    return (
      <Intro
        onPlayer={() => {
          setEntryMode("join");
          setIntroVisible(false);
        }}
        onHost={() => {
          setEntryMode("create");
          setIntroVisible(false);
        }}
      />
    );
  }

  const phaseClass = summary?.phase ?? "entry";

  return (
    <main className={`mf2-app phase-${phaseClass} ${effectsEnabled ? "effects-on" : "effects-off"}`}>
      <ParticleField />
      <div className="mf2-aurora aurora-one" aria-hidden="true" />
      <div className="mf2-aurora aurora-two" aria-hidden="true" />
      {tutorial && (
        <RoleTutorial
          role={tutorial}
          slides={tutorial === "host" ? HOST_TUTORIAL : PLAYER_TUTORIAL}
          onComplete={() => setTutorial(undefined)}
        />
      )}
      <TransitionSequence cue={transitionCue} visible={transitionVisible} />

      <header className="mf2-header">
        <div className="mf2-brand">
          <FortuneEmblem compact />
          <div>
            <strong>Secret Millionär</strong>
            <span>Midnight Fortune · Live Experience V2</span>
          </div>
        </div>
        {identity && summary ? (
          <div className="mf2-header-center">
            <PhaseRail phase={summary.phase} round={summary.currentRound} />
          </div>
        ) : (
          <span className="mf2-header-tag">Geheime Mehrgeräte-Partie</span>
        )}
        <div className="mf2-header-actions">
          {identity && summary && (
            <div className="mf2-session-pill">
              <i />
              <b>{summary.joinCode}</b>
              <span>{identity.accessRole === "host" ? "Regie" : currentMember?.displayName}</span>
            </div>
          )}
          <button
            className="mf2-effects-toggle"
            type="button"
            onClick={() => setEffectsEnabled((current) => !current)}
            aria-pressed={effectsEnabled}
          >
            {effectsEnabled ? "Effekte an" : "Effekte aus"}
          </button>
        </div>
      </header>

      {!identity && (
        <section className="mf2-entry">
          <div className="mf2-entry-story">
            <p className="mf2-kicker">Die Einladung</p>
            <h1>
              Betritt eine Partie,
              <span>in der Vertrauen zur Währung wird.</span>
            </h1>
            <p>
              Ein Code verbindet alle Geräte. Rollen bleiben privat. Die Spielleitung steuert jeden
              Moment zentral.
            </p>
            <div className="mf2-feature-grid">
              <article><b>01</b><span>Geheime Rollen</span><small>Nur auf dem eigenen Gerät sichtbar</small></article>
              <article><b>02</b><span>Live-Regie</span><small>Phasenwechsel für alle gleichzeitig</small></article>
              <article><b>03</b><span>Missionen</span><small>Diskrete Aufträge mit Zeitfenster</small></article>
            </div>
          </div>

          <div className="mf2-entry-terminal">
            <div className="mf2-entry-tabs">
              <button className={entryMode === "join" ? "active" : ""} onClick={() => setEntryMode("join")} type="button">Beitreten</button>
              <button className={entryMode === "create" ? "active" : ""} onClick={() => setEntryMode("create")} type="button">Erstellen</button>
              <button className={entryMode === "resumeHost" ? "active" : ""} onClick={() => setEntryMode("resumeHost")} type="button">Regie öffnen</button>
            </div>

            <form className="mf2-entry-form" onSubmit={handleEntry}>
              <header>
                <FortuneEmblem compact />
                <div>
                  <p>{entryMode === "join" ? "Private Anmeldung" : entryMode === "create" ? "Neue Spielinstanz" : "Regiezugang"}</p>
                  <h2>{entryMode === "join" ? "Dein Profil" : entryMode === "create" ? "Partie eröffnen" : "Spielleitung entsperren"}</h2>
                </div>
              </header>

              {entryMode !== "create" && (
                <label className="mf2-field mf2-code-field">
                  <span>Einladungscode</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                  />
                </label>
              )}

              {entryMode === "create" && (
                <label className="mf2-field">
                  <span>Name der Partie</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} required />
                </label>
              )}

              {entryMode === "join" && (
                <div className="mf2-profile-row">
                  <div className="mf2-profile-upload">
                    <Avatar name={name || "?"} avatar={avatar} size="large" />
                    <label>
                      Profilbild
                      <input type="file" accept="image/*" capture="user" onChange={handleAvatar} />
                    </label>
                  </div>
                  <label className="mf2-field">
                    <span>Dein Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={28} required />
                  </label>
                </div>
              )}

              <div className="mf2-pin-grid">
                <label className="mf2-field">
                  <span>{entryMode === "join" ? "Profil-PIN" : "Spielleiter-PIN"}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    required
                  />
                </label>
                {entryMode !== "resumeHost" && (
                  <label className="mf2-field">
                    <span>PIN wiederholen</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      required
                    />
                  </label>
                )}
              </div>

              {(localError || live.error) && <div className="mf2-error">{localError ?? live.error}</div>}
              <button className="mf2-button mf2-button-primary mf2-submit" type="submit" disabled={busy || !live.configured}>
                <span>
                  {busy
                    ? "Zugang wird geprüft …"
                    : entryMode === "create"
                      ? "Partie erstellen"
                      : entryMode === "resumeHost"
                        ? "Regie entsperren"
                        : "Profil erstellen"}
                </span>
                <b>→</b>
              </button>
            </form>
          </div>
        </section>
      )}

      {identity && summary && identity.accessRole === "host" && (
        <section className="mf2-workspace mf2-host">
          <section className="mf2-host-stage">
            <div className="mf2-host-copy">
              <p className="mf2-kicker">Regie · Runde {summary.currentRound}</p>
              <h1>{PHASE_LABELS[summary.phase]}</h1>
              <p>Steuere den nächsten Moment. Jede Freigabe erscheint gleichzeitig auf allen Geräten.</p>
              <div className="mf2-host-actions">
                {!millionaireProgress && summary.phase === "lobby" && (
                  <button
                    className="mf2-button mf2-button-primary"
                    type="button"
                    onClick={() =>
                      runTransition(getActionTransitionCue("draw"), async () => {
                        await live.drawMillionaire();
                        setNotice("Der goldene Kronkorken wurde geheim vergeben.");
                      })
                    }
                  >
                    Kronkorken auslosen
                  </button>
                )}
                <button
                  className="mf2-button mf2-button-primary"
                  type="button"
                  disabled={blockers.length > 0 || summary.phase === "finished"}
                  onClick={() =>
                    runTransition(getPhaseTransitionCue(summary.phase, summary.currentRound), async () => {
                      await live.advancePhase();
                      setNotice("Die nächste Phase wurde freigegeben.");
                    })
                  }
                >
                  Nächste Phase starten
                </button>
                <button className="mf2-button mf2-button-ghost" type="button" onClick={() => void live.refresh()}>
                  Live-Stand laden
                </button>
              </div>
            </div>

            <aside className="mf2-code-vault">
              <div className="mf2-vault-scan" />
              <GoldCrownCap size="medium" />
              <small>Einladungscode</small>
              <strong>{summary.joinCode}</strong>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(summary.joinCode);
                  setNotice("Einladungscode kopiert.");
                }}
              >
                Code kopieren
              </button>
              <div className="mf2-online-signal">
                <i />
                <span>{onlineCount}/{live.lobby.length} online</span>
              </div>
            </aside>
          </section>

          <nav className="mf2-host-nav" aria-label="Regiebereiche">
            <button className={hostPanel === "overview" ? "active" : ""} type="button" onClick={() => setHostPanel("overview")}>
              Übersicht
            </button>
            <button className={hostPanel === "setup" ? "active" : ""} type="button" onClick={() => setHostPanel("setup")}>
              Mission & Challenge
            </button>
          </nav>

          {blockers.length > 0 && (
            <section className="mf2-blockers">
              <div><b>!</b><strong>Noch nicht weiterschalten</strong></div>
              <ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
            </section>
          )}

          {hostPanel === "overview" && (
            <>
              <section className="mf2-panel">
                <header className="mf2-section-head">
                  <div><p>Live-Monitor</p><h2>Fortschritt der Spieler</h2></div>
                  <span>Presence + gespeicherte Schritte</span>
                </header>
                <div className="mf2-progress-grid">
                  {live.playerProgress.map((progress, index) => (
                    <ProgressCard progress={progress} index={index} key={progress.memberId} />
                  ))}
                </div>
              </section>
              <LobbyGrid members={live.lobby} />
            </>
          )}

          {hostPanel === "setup" && (
            <section className="mf2-setup-grid">
              <article className="mf2-panel mf2-setup-card mf2-challenge-setup">
                <div className="mf2-card-symbol">⚡</div>
                <p className="mf2-kicker">Öffentliche Challenge</p>
                <h2>{live.challenge?.title ?? "Challenge auswählen"}</h2>
                <select value={challengeId} onChange={(event) => setChallengeId(event.target.value)}>
                  {CHALLENGES.map((challenge) => (
                    <option value={challenge.id} key={challenge.id}>{challenge.title} · {challenge.publicName}</option>
                  ))}
                </select>
                {selectedChallenge && (
                  <div className="mf2-briefing">
                    <div><strong>Spieler-Briefing</strong><p>{selectedChallenge.playerBriefing}</p></div>
                    <div><strong>Siegbedingung</strong><p>{selectedChallenge.winCondition}</p></div>
                    <div><strong>Dauer</strong><p>{selectedChallenge.duration}</p></div>
                  </div>
                )}
                <div className="mf2-action-row">
                  <button className="mf2-button mf2-button-ghost" type="button" onClick={() => void live.selectChallenge(summary.currentRound, challengeId)}>
                    Für Runde speichern
                  </button>
                  <button className="mf2-button mf2-button-primary" type="button" onClick={() => void live.drawTeams(summary.currentRound)}>
                    Teams auslosen
                  </button>
                </div>
                <div className="mf2-team-winner-row">
                  <button type="button" className="team-azur" onClick={() => void live.confirmChallengeWinner(summary.currentRound, "azur")}>Azur gewinnt</button>
                  <button type="button" className="team-gold" onClick={() => void live.confirmChallengeWinner(summary.currentRound, "gold")}>Gold gewinnt</button>
                </div>
              </article>

              <article className="mf2-panel mf2-setup-card mf2-mission-setup">
                <div className="mf2-card-symbol">✦</div>
                <p className="mf2-kicker">Geheime Mission</p>
                <h2>Auftrag versiegeln</h2>
                <div className="mf2-round-selector">
                  {([1, 2, 3, 4] as const).map((round) => (
                    <button className={missionRound === round ? "active" : ""} type="button" onClick={() => setMissionRound(round)} key={round}>
                      R{round}
                    </button>
                  ))}
                </div>
                <select value={missionId} onChange={(event) => setMissionId(event.target.value)}>
                  {MISSIONS.map((mission) => (
                    <option value={mission.id} key={mission.id}>{mission.title} · {mission.difficulty}</option>
                  ))}
                </select>
                {selectedMission && (
                  <div className="mf2-mission-preview">
                    <span>{selectedMission.difficulty}</span>
                    <h3>{selectedMission.title}</h3>
                    <p>{selectedMission.task}</p>
                    <dl>
                      <div><dt>Erfolg</dt><dd>{selectedMission.successCriteria}</dd></div>
                      <div><dt>Zeit</dt><dd>{selectedMission.timeWindow}</dd></div>
                    </dl>
                  </div>
                )}
                <button
                  className="mf2-button mf2-button-primary mf2-full"
                  type="button"
                  onClick={async () => {
                    await live.selectMission(missionRound, missionId);
                    setNotice(`${selectedMission?.title ?? "Mission"} wurde für Runde ${missionRound} versiegelt.`);
                  }}
                >
                  Mission für Runde {missionRound} speichern
                </button>
                <div className="mf2-round-overview">
                  {([1, 2, 3, 4] as const).map((round) => (
                    <div key={round}><span>Runde {round}</span><strong>{live.missionSelections[round]?.title ?? "Offen"}</strong></div>
                  ))}
                </div>
              </article>
            </section>
          )}
        </section>
      )}

      {identity && summary && identity.accessRole === "player" && (
        <section className="mf2-workspace mf2-player">
          <section className="mf2-player-stage">
            <div className="mf2-player-phase">
              <p className="mf2-kicker">Runde {summary.currentRound} · {summary.joinCode}</p>
              <h1>{PHASE_LABELS[summary.phase]}</h1>
              <p>Deine Ansicht ist privat. Die Regie sieht nur, ob du den aktuellen Schritt abgeschlossen hast.</p>
            </div>
            <div className="mf2-player-identity">
              <Avatar name={currentMember?.displayName ?? "?"} avatar={currentMember?.avatarPath} size="large" status="current" />
              <div><strong>{currentMember?.displayName}</strong><span>{teamLabel(currentMember?.challengeTeam)}</span></div>
              <i />
            </div>
          </section>

          {summary.phase === "lobby" && <LobbyGrid members={live.lobby} currentMemberId={identity.memberId} />}

          <section className="mf2-player-action">
            {summary.phase === "role_reveal" && (
              <article className={`mf2-role-stage ${roleCardOpen ? "is-open" : ""}`}>
                <div className="mf2-role-aura" />
                <div className="mf2-role-card">
                  <div className="mf2-role-front">
                    <FortuneEmblem />
                    <p>Nur für deine Augen</p>
                    <h2>Deine Rolle ist versiegelt</h2>
                    <button
                      className="mf2-button mf2-button-primary"
                      type="button"
                      onClick={() =>
                        runTransition(getActionTransitionCue("revealRole"), async () => {
                          await live.revealRole();
                          setRoleCardOpen(true);
                          await live.updateProgress({
                            screenKey: "role_card",
                            stepKey: "role_revealed",
                            phaseSeen: summary.phase,
                            roleRevealed: true,
                          });
                        })
                      }
                    >
                      Siegel brechen
                    </button>
                  </div>
                  <div className={`mf2-role-back role-${live.privateState?.role ?? "none"}`}>
                    <div className="mf2-role-icon">
                      {live.privateState?.role === "millionaire" ? "♛" : "⌕"}
                    </div>
                    <p>Deine Rolle</p>
                    <h2>{live.privateState?.role === "millionaire" ? "Millionär" : "Ermittler"}</h2>
                    <div className="mf2-role-divider"><i /></div>
                    <span>
                      {live.privateState?.role === "millionaire"
                        ? "Bleib unauffällig. Erfülle deine Mission und lenke den Verdacht."
                        : "Beobachte die Gruppe. Finde Widersprüche und entlarve den Kronkorkenträger."}
                    </span>
                    {live.privateState?.role === "millionaire" && <GoldCrownCap size="medium" />}
                  </div>
                </div>
              </article>
            )}

            {live.privateState?.mission && ["mission", "challenge", "question", "mission_review", "discussion", "advantage", "voting", "evaluation", "result"].includes(summary.phase) && (
              <article className={`mf2-secret-mission ${missionCardOpen ? "is-open" : ""}`}>
                {!missionCardOpen ? (
                  <div className="mf2-mission-envelope">
                    <div className="mf2-envelope-flap" />
                    <FortuneEmblem compact />
                    <p>Geheime Übertragung</p>
                    <h2>Eine Mission wartet.</h2>
                    <button
                      className="mf2-button mf2-button-primary"
                      type="button"
                      onClick={async () => {
                        setMissionCardOpen(true);
                        await live.updateProgress({
                          screenKey: "mission",
                          stepKey: "mission_opened",
                          phaseSeen: summary.phase,
                          missionOpened: true,
                        });
                      }}
                    >
                      Mission entschlüsseln
                    </button>
                  </div>
                ) : (
                  <div className="mf2-mission-document">
                    <header><span>Codename</span><b>Operation Gold</b></header>
                    <p className="mf2-kicker">Deine Mission</p>
                    <h2>{live.privateState.mission.title_snapshot}</h2>
                    <p className="mf2-mission-task">{live.privateState.mission.task_snapshot}</p>
                    <div className="mf2-mission-data">
                      <div><span>Erfolgskriterium</span><strong>{live.privateState.mission.success_criteria_snapshot}</strong></div>
                      <div><span>Zeitfenster</span><strong>{live.privateState.mission.time_window_snapshot}</strong></div>
                    </div>
                    <small>Beobachte. Täusche. Überlebe.</small>
                  </div>
                )}
              </article>
            )}

            {summary.phase === "challenge" && live.challenge && (
              <article className={`mf2-challenge-stage team-${currentMember?.challengeTeam ?? "none"}`}>
                <div className="mf2-challenge-energy" />
                <p className="mf2-kicker">{teamLabel(currentMember?.challengeTeam)}</p>
                <h2>{live.challenge.title}</h2>
                <span>{live.challenge.publicName} · {live.challenge.duration}</span>
                <p>{live.challenge.playerBriefing}</p>
                <div className="mf2-challenge-facts">
                  <div><b>🏁</b><span>Siegbedingung</span><strong>{live.challenge.winCondition}</strong></div>
                  <div><b>⚠</b><span>Sicherheit</span><strong>{live.challenge.safetyNote}</strong></div>
                </div>
                <button
                  className="mf2-button mf2-button-ghost"
                  type="button"
                  onClick={() =>
                    void live.updateProgress({
                      screenKey: "challenge",
                      stepKey: "challenge_opened",
                      phaseSeen: summary.phase,
                      challengeBriefingOpened: true,
                    })
                  }
                >
                  Briefing verstanden
                </button>
              </article>
            )}

            {summary.phase === "voting" && (
              <article className="mf2-vote-stage">
                <div className="mf2-vote-beam" />
                <p className="mf2-kicker">Geheime Abstimmung</p>
                <h2>Wen verdächtigst du?</h2>
                <p>Wähle die Person, die deiner Meinung nach den goldenen Kronkorken trägt.</p>
                {live.privateState?.ownVote ? (
                  <div className="mf2-vote-confirmed">
                    <span>✓</span>
                    <strong>Stimme versiegelt</strong>
                    <small>Deine Auswahl bleibt geheim.</small>
                  </div>
                ) : (
                  <>
                    <div className="mf2-candidate-grid">
                      {live.lobby
                        .filter(
                          (member) =>
                            member.winnerPoolStatus === "eligible" &&
                            member.attendanceStatus === "present",
                        )
                        .map((member, index) => (
                          <button
                            className={voteTarget === member.memberId ? "selected" : ""}
                            style={{ "--card-index": index } as CSSProperties}
                            type="button"
                            onClick={() => setVoteTarget(member.memberId)}
                            key={member.memberId}
                          >
                            <Avatar name={member.displayName} avatar={member.avatarPath} size="large" />
                            <strong>{member.displayName}</strong>
                            <span>{voteTarget === member.memberId ? "Ausgewählt" : "Verdächtigen"}</span>
                            <i />
                          </button>
                        ))}
                    </div>
                    <button
                      className="mf2-button mf2-button-danger mf2-vote-submit"
                      type="button"
                      disabled={!voteTarget}
                      onClick={() =>
                        runTransition(getActionTransitionCue("vote"), async () => {
                          await live.submitVote(voteTarget);
                          await live.updateProgress({
                            screenKey: "voting",
                            stepKey: "vote_submitted",
                            phaseSeen: summary.phase,
                            voteSubmitted: true,
                          });
                        })
                      }
                    >
                      Stimme endgültig versiegeln
                    </button>
                  </>
                )}
              </article>
            )}

            {summary.phase === "finished" && (
              <article className="mf2-finale">
                <div className="mf2-finale-rays">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
                <div className="mf2-confetti">{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ "--confetti-index": index } as CSSProperties} />)}</div>
                <p className="mf2-kicker">Finale</p>
                <GoldCrownCap size="large" />
                <h2>Die letzte Maske fällt.</h2>
                {millionaireProgress ? (
                  <>
                    <div className="mf2-finale-person">
                      <Avatar name={millionaireProgress.displayName} avatar={millionaireProgress.avatarPath} size="large" />
                      <span>Letzter Kronkorkenträger</span>
                      <strong>{millionaireProgress.displayName}</strong>
                    </div>
                  </>
                ) : (
                  <p>Die Spielleitung beendet die Partie und verkündet das Ergebnis.</p>
                )}
                <div className="mf2-final-status">
                  {live.lobby.map((member, index) => (
                    <div style={{ "--card-index": index } as CSSProperties} key={member.memberId}>
                      <Avatar name={member.displayName} avatar={member.avatarPath} size="small" />
                      <span>{member.displayName}</span>
                      <b>{member.winnerPoolStatus === "eligible" ? "Im Gewinnerpool" : "Ausgeschieden"}</b>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {!["role_reveal", "challenge", "voting", "finished"].includes(summary.phase) &&
              !live.privateState?.mission && (
                <article className="mf2-waiting-stage">
                  <div className="mf2-waiting-orbit"><FortuneEmblem /></div>
                  <p className="mf2-kicker">Aktueller Abschnitt</p>
                  <h2>{PHASE_LABELS[summary.phase]}</h2>
                  <p>Bleib auf dieser Ansicht. Die Regie gibt den nächsten Moment zentral frei.</p>
                  <div className="mf2-waiting-signal"><i /><span>Live verbunden</span></div>
                </article>
              )}
          </section>

          {summary.phase !== "lobby" && (
            <LobbyGrid members={live.lobby} currentMemberId={identity.memberId} compact />
          )}
        </section>
      )}

      {identity && (
        <footer className="mf2-footer">
          <span><i />{live.error ? "Verbindung gestört" : "Live-Synchronisation aktiv"}</span>
          <button type="button" onClick={() => void live.clearSession()}>Zugang schließen</button>
        </footer>
      )}

      {(localError || notice || live.error) && identity && !transitionVisible && (
        <div className={`mf2-toast ${localError || live.error ? "error" : ""}`}>
          <span>{localError ?? live.error ?? notice}</span>
          <button type="button" onClick={() => { setLocalError(undefined); setNotice(undefined); }}>×</button>
        </div>
      )}
    </main>
  );
}
