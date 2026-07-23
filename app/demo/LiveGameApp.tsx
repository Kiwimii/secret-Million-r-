"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { CHALLENGES } from "@/lib/game/challenges";
import { PHASE_LABELS } from "@/lib/game/constants";
import { MISSIONS } from "@/lib/game/catalog";
import type { RoundNumber, RoundPhase, TeamCode } from "@/lib/game/types";
import {
  HOST_TUTORIAL,
  INTRO_SLIDES,
  PLAYER_TUTORIAL,
  getActionTransitionCue,
  getPhaseTransitionCue,
  type TransitionCue,
} from "@/lib/demo/onboarding";
import { useLiveGame } from "@/lib/live/useLiveGame";
import type { LivePlayerProgress } from "@/lib/live/types";
import { CinematicIntro, RoleTutorial, TransitionSequence } from "./CinematicExperience";
import GoldCrownCap from "./GoldCrownCap";

const SCREEN_LABELS: Record<string, string> = {
  entry: "Einstieg",
  lobby: "Gemeinsame Lobby",
  role_card: "Private Rollenkarte",
  mission: "Geheime Mission",
  challenge: "Challenge-Briefing",
  question: "Exklusive Frage",
  discussion: "Diskussion",
  voting: "Geheime Abstimmung",
  result: "Rundenergebnis",
  role_transfer: "Korkenentscheidung",
  finished: "Finale",
  offline: "Nicht verbunden",
};

const STEP_LABELS: Record<string, string> = {
  loading: "App wird geöffnet",
  profile_created: "Profil wurde erstellt",
  profile_resumed: "Profil wurde wieder geöffnet",
  viewing: "Ansicht geöffnet",
  role_available: "Rolle ist bereit",
  role_revealed: "Rolle wurde angesehen",
  mission_available: "Mission ist bereit",
  mission_opened: "Mission wurde gelesen",
  challenge_available: "Challenge ist bereit",
  challenge_opened: "Challenge-Briefing gelesen",
  vote_pending: "Stimme fehlt noch",
  vote_submitted: "Stimme wurde abgegeben",
  waiting: "Wartet auf die Spielleitung",
  noch_nicht_geöffnet: "Noch keine Aktivität",
};

function phaseScreen(phase: RoundPhase) {
  if (phase === "role_reveal") return "role_card";
  if (phase === "mission" || phase === "mission_review" || phase === "advantage") return "mission";
  if (phase === "challenge") return "challenge";
  if (phase === "question") return "question";
  if (phase === "discussion") return "discussion";
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

function formatLastSeen(value?: string) {
  if (!value) return "noch nie";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 15) return "gerade eben";
  if (seconds < 60) return `vor ${seconds} Sek.`;
  const minutes = Math.floor(seconds / 60);
  return `vor ${minutes} Min.`;
}

function teamLabel(team?: TeamCode) {
  if (team === "azur") return "Team Azur";
  if (team === "gold") return "Team Gold";
  return "noch nicht ausgelost";
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
  canvas.width = 240;
  canvas.height = 240;
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
    240,
    240,
  );
  return canvas.toDataURL("image/jpeg", 0.72);
}

function PlayerAvatar({ name, avatar, small = false }: { name: string; avatar?: string; small?: boolean }) {
  return (
    <span className={`live-avatar ${small ? "live-avatar-small" : ""}`}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function ProgressCard({ progress }: { progress: LivePlayerProgress }) {
  const isMillionaire = progress.currentRole === "millionaire";
  return (
    <article className={`progress-player-card ${isMillionaire ? "is-millionaire" : ""}`}>
      <div className="progress-player-head">
        <PlayerAvatar name={progress.displayName} avatar={progress.avatarPath} small />
        <div>
          <strong>{progress.displayName}</strong>
          <span className={progress.online ? "online" : "offline"}>
            {progress.online ? "online" : `offline · ${formatLastSeen(progress.lastSeenAt)}`}
          </span>
        </div>
        {isMillionaire && <GoldCrownCap size="small" label="Aktueller Millionär" />}
      </div>
      <dl className="progress-player-facts">
        <div><dt>Ansicht</dt><dd>{SCREEN_LABELS[progress.screenKey] ?? progress.screenKey}</dd></div>
        <div><dt>Schritt</dt><dd>{STEP_LABELS[progress.stepKey] ?? progress.stepKey}</dd></div>
        <div><dt>Phase gesehen</dt><dd>{PHASE_LABELS[progress.phaseSeen]}</dd></div>
        <div><dt>Team</dt><dd>{teamLabel(progress.challengeTeam)}</dd></div>
      </dl>
      <div className="progress-checks">
        <span className={progress.roleRevealed ? "done" : ""}>Rolle</span>
        <span className={progress.missionOpened ? "done" : ""}>Mission</span>
        <span className={progress.challengeBriefingOpened ? "done" : ""}>Challenge</span>
        <span className={progress.voteSubmitted ? "done" : ""}>Stimme</span>
      </div>
    </article>
  );
}

function SharedLobby({
  members,
  currentMemberId,
}: {
  members: ReturnType<typeof useLiveGame>["lobby"];
  currentMemberId?: string;
}) {
  return (
    <section className="live-card live-lobby-card">
      <div className="live-section-heading">
        <div>
          <p>Gemeinsame Lobby</p>
          <h2>{members.length} angemeldete Spieler</h2>
        </div>
        <span>Alle Geräte sehen dieselbe Instanz</span>
      </div>
      <div className="live-lobby-grid">
        {members.map((member) => (
          <article className={member.memberId === currentMemberId ? "current" : ""} key={member.memberId}>
            <PlayerAvatar name={member.displayName} avatar={member.avatarPath} />
            <strong>{member.displayName}</strong>
            <span>{member.attendanceStatus === "present" ? "anwesend" : member.attendanceStatus}</span>
            <b className={`team-pill team-${member.challengeTeam ?? "none"}`}>
              {teamLabel(member.challengeTeam)}
            </b>
          </article>
        ))}
        {members.length === 0 && (
          <div className="live-empty-state">
            Noch niemand ist beigetreten. Der Einladungscode hat offenbar denselben sozialen Radius wie Oli nach einer Nebenkostenfrage.
          </div>
        )}
      </div>
    </section>
  );
}

export default function LiveGameApp() {
  const live = useLiveGame();
  const [introVisible, setIntroVisible] = useState(true);
  const [tutorial, setTutorial] = useState<"host" | "player">();
  const [entryMode, setEntryMode] = useState<"join" | "create" | "resumeHost">("join");
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

  const summary = live.summary;
  const identity = live.identity;
  const currentMember = live.lobby.find((member) => member.memberId === identity?.memberId);
  const selectedMission = MISSIONS.find((mission) => mission.id === missionId) ?? MISSIONS[0];
  const selectedChallenge = CHALLENGES.find((challenge) => challenge.id === challengeId) ?? CHALLENGES[0];
  const millionaireProgress = live.playerProgress.find((player) => player.currentRole === "millionaire");

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
  }, [identity?.accessRole, live.challenge, live.lobby.length, live.missionSelections, live.playerProgress, millionaireProgress, summary]);

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
        .catch((caught) => setLocalError(caught instanceof Error ? caught.message : "Aktion fehlgeschlagen."))
        .finally(() => window.setTimeout(() => setTransitionVisible(false), 850));
    }, 620);
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
      setLocalError("Die PIN braucht genau vier Ziffern. Kryptografie ist manchmal erstaunlich kleinlich.");
      return;
    }
    if ((entryMode === "join" || entryMode === "create") && pin !== confirmPin) {
      setLocalError("Die beiden PINs unterscheiden sich. Das ist bei Geheimnissen eher ungünstig.");
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
      <main className="live-loading-screen">
        <GoldCrownCap size="large" />
        <h1>Die Partie wird aus dem digitalen Sumpf gezogen.</h1>
        <p>Das dauert gewöhnlich kürzer als eine Beschwerde bei Gundula.</p>
      </main>
    );
  }

  return (
    <main className="live-game-app">
      {introVisible && !identity && (
        <CinematicIntro
          slides={INTRO_SLIDES}
          onPlayer={() => {
            setEntryMode("join");
            setIntroVisible(false);
          }}
          onHost={() => {
            setEntryMode("create");
            setIntroVisible(false);
          }}
          onSkip={() => setIntroVisible(false)}
        />
      )}
      {tutorial && (
        <RoleTutorial
          role={tutorial}
          slides={tutorial === "host" ? HOST_TUTORIAL : PLAYER_TUTORIAL}
          onComplete={() => setTutorial(undefined)}
        />
      )}
      <TransitionSequence cue={transitionCue} visible={transitionVisible} />

      <header className="live-header">
        <div className="live-brand">
          <GoldCrownCap size="small" />
          <div><strong>Secret Millionär</strong><span>Blaue Adria · Live-Partie</span></div>
        </div>
        {identity && summary ? (
          <div className="live-header-session">
            <span className="live-pulse" />
            <b>{summary.joinCode}</b>
            <small>{identity.accessRole === "host" ? "Spielleitung" : currentMember?.displayName}</small>
          </div>
        ) : (
          <span className="live-header-state">echte Mehrgeräte-Synchronisation</span>
        )}
      </header>

      {!identity && (
        <section className="live-entry-shell">
          <div className="live-entry-intro">
            <p className="live-eyebrow">Gemeinsame Spielinstanz</p>
            <h1>Ein Code. Eine Partie. Mehrere Geräte. Endlich sehen alle dieselbe Katastrophe.</h1>
            <p>
              Die Spielleitung erstellt eine Partie und teilt den sechsstelligen Code. Jeder Spieler tritt mit eigenem Profil und eigener PIN genau dieser Instanz bei.
            </p>
          </div>

          <div className="live-entry-tabs">
            <button className={entryMode === "join" ? "active" : ""} onClick={() => setEntryMode("join")} type="button">Spiel beitreten</button>
            <button className={entryMode === "create" ? "active" : ""} onClick={() => setEntryMode("create")} type="button">Spiel erstellen</button>
            <button className={entryMode === "resumeHost" ? "active" : ""} onClick={() => setEntryMode("resumeHost")} type="button">Spielleitung öffnen</button>
          </div>

          <form className="live-entry-form" onSubmit={handleEntry}>
            {entryMode !== "create" && (
              <label>
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
              <label>
                <span>Name der Partie</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} required />
              </label>
            )}

            {entryMode === "join" && (
              <>
                <div className="live-profile-builder">
                  <div className="live-profile-preview">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Profilvorschau" />
                    ) : (
                      name.slice(0, 1).toUpperCase() || "?"
                    )}
                  </div>
                  <label className="live-upload-button">
                    Profilbild wählen
                    <input type="file" accept="image/*" capture="user" onChange={handleAvatar} />
                  </label>
                </div>
                <label>
                  <span>Dein Name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={28} required />
                </label>
              </>
            )}

            <label>
              <span>{entryMode === "join" ? "Deine Profil-PIN" : "Spielleiter-PIN"}</span>
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
              <label>
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

            {(localError || live.error) && <div className="live-error">{localError ?? live.error}</div>}
            <button className="live-primary-button" type="submit" disabled={busy || !live.configured}>
              {busy
                ? "Zugang wird geprüft …"
                : entryMode === "create"
                  ? "Partie erstellen und Code erzeugen"
                  : entryMode === "resumeHost"
                    ? "Spielleitung entsperren"
                    : "Profil erstellen und beitreten"}
            </button>
          </form>
        </section>
      )}

      {identity && summary && identity.accessRole === "host" && (
        <section className="live-workspace host-live-workspace">
          <section className="host-command-deck">
            <div className="host-command-main">
              <p className="live-eyebrow">Runde {summary.currentRound} · wichtigste Steuerung</p>
              <h1>{PHASE_LABELS[summary.phase]}</h1>
              <p>
                Oben bleibt nur das, was den Ablauf tatsächlich blockiert. Missionen und Detailverwaltung wohnen weiter unten, wo sie keinen versehentlichen Staatsstreich auslösen.
              </p>
              <div className="host-command-actions">
                {!millionaireProgress && summary.phase === "lobby" && (
                  <button
                    className="live-primary-button"
                    type="button"
                    onClick={() =>
                      runTransition(getActionTransitionCue("draw"), async () => {
                        await live.drawMillionaire();
                        setNotice("Der goldene Kronkorken wurde zufällig und geheim vergeben.");
                      })
                    }
                  >
                    Goldenen Kronkorken auslosen
                  </button>
                )}
                <button
                  className="live-primary-button"
                  type="button"
                  disabled={blockers.length > 0 || summary.phase === "finished"}
                  onClick={() =>
                    runTransition(getPhaseTransitionCue(summary.phase, summary.currentRound), async () => {
                      await live.advancePhase();
                      setNotice("Die nächste Phase wurde für alle Geräte freigegeben.");
                    })
                  }
                >
                  Nächsten Abschnitt für alle starten
                </button>
                <button className="live-secondary-button" type="button" onClick={() => void live.refresh()}>
                  Live-Stand neu laden
                </button>
              </div>
            </div>
            <aside className="host-code-panel">
              <GoldCrownCap size="medium" />
              <small>Einladungscode</small>
              <strong>{summary.joinCode}</strong>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(summary.joinCode);
                  setNotice("Code kopiert. Seine weitere Verbreitung liegt nun außerhalb jeder vernünftigen Kontrolle.");
                }}
              >
                Code kopieren
              </button>
              <span>{live.playerProgress.filter((player) => player.online).length}/{live.lobby.length} Spieler online</span>
            </aside>
          </section>

          {blockers.length > 0 && (
            <section className="host-blocker-panel">
              <strong>Noch nicht weiterschalten</strong>
              <ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
            </section>
          )}

          <section className="live-card host-progress-monitor">
            <div className="live-section-heading">
              <div><p>Live-Fortschrittsmonitor</p><h2>Was jeder Spieler gerade sieht</h2></div>
              <span>Online-Status über Presence · Schritte dauerhaft gespeichert</span>
            </div>
            <div className="progress-grid">
              {live.playerProgress.map((progress) => <ProgressCard progress={progress} key={progress.memberId} />)}
            </div>
          </section>

          <SharedLobby members={live.lobby} />

          <section className="live-two-column">
            <article className="live-card live-control-card">
              <p className="live-eyebrow">Challenge und Teams</p>
              <h2>{live.challenge?.title ?? "Noch keine Challenge ausgewählt"}</h2>
              <select value={challengeId} onChange={(event) => setChallengeId(event.target.value)}>
                {CHALLENGES.map((challenge) => (
                  <option value={challenge.id} key={challenge.id}>{challenge.title} · {challenge.publicName}</option>
                ))}
              </select>
              {selectedChallenge && (
                <div className="live-detail-box">
                  <strong>Spieler-Briefing</strong><p>{selectedChallenge.playerBriefing}</p>
                  <strong>Spielleitung</strong><p>{selectedChallenge.hostInstructions}</p>
                  <strong>Sieg</strong><p>{selectedChallenge.winCondition}</p>
                </div>
              )}
              <div className="live-button-row">
                <button className="live-secondary-button" type="button" onClick={() => void live.selectChallenge(summary.currentRound, challengeId)}>Für Runde speichern</button>
                <button className="live-primary-button" type="button" onClick={() => void live.drawTeams(summary.currentRound)}>Teams zufällig auslosen</button>
              </div>
              <div className="live-button-row">
                <button type="button" className="team-win-button team-azur" onClick={() => void live.confirmChallengeWinner(summary.currentRound, "azur")}>Team Azur gewinnt</button>
                <button type="button" className="team-win-button team-gold" onClick={() => void live.confirmChallengeWinner(summary.currentRound, "gold")}>Team Gold gewinnt</button>
              </div>
            </article>

            <article className="live-card live-control-card mission-selector-card">
              <p className="live-eyebrow">Geheime Mission · bewusst weiter unten</p>
              <h2>Eine von 20 Missionen vorab wählen</h2>
              <div className="round-selector">
                {([1, 2, 3, 4] as const).map((round) => (
                  <button className={missionRound === round ? "active" : ""} type="button" onClick={() => setMissionRound(round)} key={round}>Runde {round}</button>
                ))}
              </div>
              <select value={missionId} onChange={(event) => setMissionId(event.target.value)}>
                {MISSIONS.map((mission) => (
                  <option value={mission.id} key={mission.id}>{mission.title} · {mission.difficulty}</option>
                ))}
              </select>
              {selectedMission && (
                <div className="live-detail-box mission-detail-box">
                  <span className={`mission-difficulty difficulty-${selectedMission.difficulty}`}>{selectedMission.difficulty}</span>
                  <strong>Auftrag für den Millionär</strong><p>{selectedMission.task}</p>
                  <strong>Erfolgskriterium</strong><p>{selectedMission.successCriteria}</p>
                  <strong>Zeitfenster</strong><p>{selectedMission.timeWindow}</p>
                  <strong>Hinweis für André</strong><p>{selectedMission.hostInstructions}</p>
                  <strong>Geeignet für</strong><p>{selectedMission.suitablePhases}</p>
                </div>
              )}
              <button
                className="live-primary-button"
                type="button"
                onClick={async () => {
                  await live.selectMission(missionRound, missionId);
                  setNotice(`${selectedMission?.title ?? "Mission"} wurde für Runde ${missionRound} versiegelt.`);
                }}
              >
                Mission für Runde {missionRound} speichern
              </button>
              <div className="mission-round-overview">
                {([1, 2, 3, 4] as const).map((round) => (
                  <div key={round}><span>Runde {round}</span><strong>{live.missionSelections[round]?.title ?? "noch offen"}</strong></div>
                ))}
              </div>
            </article>
          </section>
        </section>
      )}

      {identity && summary && identity.accessRole === "player" && (
        <section className="live-workspace player-live-workspace">
          <section className="player-live-hero">
            <div>
              <p className="live-eyebrow">Runde {summary.currentRound} · {summary.joinCode}</p>
              <h1>{PHASE_LABELS[summary.phase]}</h1>
              <p>
                Du bist in derselben Partie wie alle anderen. Das klingt selbstverständlich, war technisch aber bislang eher eine gemeinsame Hoffnung.
              </p>
            </div>
            <div className="player-identity-chip">
              <PlayerAvatar name={currentMember?.displayName ?? "?"} avatar={currentMember?.avatarPath} />
              <div><strong>{currentMember?.displayName}</strong><span>{teamLabel(currentMember?.challengeTeam)}</span></div>
            </div>
          </section>

          <SharedLobby members={live.lobby} currentMemberId={identity.memberId} />

          <section className="player-action-grid">
            {summary.phase === "role_reveal" && (
              <article className="live-card private-player-card">
                <p className="live-eyebrow">Nur für dich</p>
                {!roleCardOpen ? (
                  <>
                    <GoldCrownCap size="medium" label="Versiegelte Rollenkarte" />
                    <h2>Deine Rolle ist versiegelt.</h2>
                    <p>Öffne sie ohne Publikum. Dein Gesicht übernimmt danach ohnehin den unfreiwilligen Pressetermin.</p>
                    <button
                      className="live-primary-button"
                      type="button"
                      onClick={() =>
                        runTransition(getActionTransitionCue("revealRole"), async () => {
                          await live.revealRole();
                          setRoleCardOpen(true);
                          await live.updateProgress({ screenKey: "role_card", stepKey: "role_revealed", phaseSeen: summary.phase, roleRevealed: true });
                        })
                      }
                    >
                      Rolle privat öffnen
                    </button>
                  </>
                ) : (
                  <div className="revealed-role-card">
                    {live.privateState?.role === "millionaire" && <GoldCrownCap size="large" />}
                    <h2>{live.privateState?.role === "millionaire" ? "Du trägst den goldenen Kronkorken." : "Du bist Ermittler."}</h2>
                    <p>{live.privateState?.role === "millionaire" ? "Bleib unauffällig. Menschen halten Selbstbewusstsein gern für Beweis, besonders wenn es nicht ihr eigenes ist." : "Beobachte, diskutiere und entscheide. Überzeugung ist erlaubt; Gewissheit bleibt ein Luxusprodukt."}</p>
                  </div>
                )}
              </article>
            )}

            {live.privateState?.mission && ["mission", "challenge", "question", "mission_review", "discussion", "advantage", "voting", "evaluation", "result"].includes(summary.phase) && (
              <article className="live-card private-player-card mission-player-card">
                <p className="live-eyebrow">Geheime Mission · nur für den Kronkorkenträger</p>
                {!missionCardOpen ? (
                  <>
                    <h2>Eine Mission wartet.</h2>
                    <p>André sieht im Fortschrittsmonitor, ob du sie geöffnet hast. Nicht den Inhalt deines Gesichts, aber dafür gibt es leider Augen.</p>
                    <button
                      className="live-primary-button"
                      type="button"
                      onClick={async () => {
                        setMissionCardOpen(true);
                        await live.updateProgress({ screenKey: "mission", stepKey: "mission_opened", phaseSeen: summary.phase, missionOpened: true });
                      }}
                    >
                      Mission öffnen
                    </button>
                  </>
                ) : (
                  <>
                    <h2>{live.privateState.mission.title_snapshot}</h2>
                    <p>{live.privateState.mission.task_snapshot}</p>
                    <div className="live-detail-box">
                      <strong>Erfolg</strong><p>{live.privateState.mission.success_criteria_snapshot}</p>
                      <strong>Zeitfenster</strong><p>{live.privateState.mission.time_window_snapshot}</p>
                    </div>
                  </>
                )}
              </article>
            )}

            {summary.phase === "challenge" && live.challenge && (
              <article className="live-card player-challenge-card">
                <p className="live-eyebrow">{teamLabel(currentMember?.challengeTeam)}</p>
                <h2>{live.challenge.title}</h2>
                <span>{live.challenge.publicName} · {live.challenge.duration}</span>
                <p>{live.challenge.playerBriefing}</p>
                <div className="live-detail-box"><strong>Siegbedingung</strong><p>{live.challenge.winCondition}</p><strong>Sicherheit</strong><p>{live.challenge.safetyNote}</p></div>
                <button className="live-secondary-button" type="button" onClick={() => void live.updateProgress({ screenKey: "challenge", stepKey: "challenge_opened", phaseSeen: summary.phase, challengeBriefingOpened: true })}>Briefing gelesen</button>
              </article>
            )}

            {summary.phase === "voting" && (
              <article className="live-card live-vote-card">
                <p className="live-eyebrow">Geheime Abstimmung</p>
                <h2>Wer trägt den goldenen Kronkorken?</h2>
                {live.privateState?.ownVote ? (
                  <div className="vote-confirmation">Stimme gespeichert. Die spätere Umdeutung deiner Motive bleibt selbstverständlich möglich.</div>
                ) : (
                  <>
                    <div className="vote-target-grid">
                      {live.lobby
                        .filter((member) => member.winnerPoolStatus === "eligible" && member.attendanceStatus === "present")
                        .map((member) => (
                          <button className={voteTarget === member.memberId ? "selected" : ""} type="button" onClick={() => setVoteTarget(member.memberId)} key={member.memberId}>
                            <PlayerAvatar name={member.displayName} avatar={member.avatarPath} small />
                            <strong>{member.displayName}</strong>
                          </button>
                        ))}
                    </div>
                    <button
                      className="live-primary-button"
                      type="button"
                      disabled={!voteTarget}
                      onClick={() =>
                        runTransition(getActionTransitionCue("vote"), async () => {
                          await live.submitVote(voteTarget);
                          await live.updateProgress({ screenKey: "voting", stepKey: "vote_submitted", phaseSeen: summary.phase, voteSubmitted: true });
                        })
                      }
                    >
                      Stimme verbindlich versiegeln
                    </button>
                  </>
                )}
              </article>
            )}

            {!['role_reveal', 'challenge', 'voting'].includes(summary.phase) && !live.privateState?.mission && (
              <article className="live-card player-waiting-card">
                <GoldCrownCap size="medium" />
                <p className="live-eyebrow">Aktueller Auftrag</p>
                <h2>{PHASE_LABELS[summary.phase]}</h2>
                <p>Bleib auf dieser Ansicht. Die Spielleitung sieht, dass du angekommen bist, und muss nicht durch die Runde rufen wie ein schlecht finanziertes Bodenpersonal.</p>
              </article>
            )}
          </section>
        </section>
      )}

      {identity && (
        <footer className="live-footer">
          <span>{live.error ? "Verbindung gestört" : "Live-Synchronisation aktiv"}</span>
          <button type="button" onClick={() => void live.clearSession()}>Zugang auf diesem Gerät schließen</button>
        </footer>
      )}

      {(localError || notice || live.error) && identity && !transitionVisible && (
        <div className={`live-toast ${localError || live.error ? "error" : ""}`}>
          <span>{localError ?? live.error ?? notice}</span>
          <button type="button" onClick={() => { setLocalError(undefined); setNotice(undefined); }}>×</button>
        </div>
      )}
    </main>
  );
}
