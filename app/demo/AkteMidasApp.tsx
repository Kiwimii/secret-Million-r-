"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useMetaGame } from "@/lib/meta/useMetaGame";
import {
  BONUS_CATALOG,
  CHALLENGE_CATALOG,
  MALUS_CATALOG,
  MISSION_CATALOG,
  bonusById,
  challengeById,
  malusById,
  missionById,
  randomUnused,
  type ChallengeCatalogEntry,
  type EffectCatalogEntry,
  type MissionCatalogEntry,
} from "@/lib/meta/catalogs";
import type {
  MetaEvent,
  MetaGameView,
  MetaMember,
  MetaRoundState,
  RoundPackageInput,
  TeamCode,
} from "@/lib/meta/types";
import styles from "./akte-midas.module.css";

const INTRO_STORAGE_KEY = "secret-millionaer.akte-midas.intro.v1";

const PHASE_LABELS: Record<string, string> = {
  lobby: "Akte eröffnet",
  round_setup: "Einsatz wird vorbereitet",
  role_released: "Deckungen freigegeben",
  mission: "Versiegelter Auftrag aktiv",
  challenge: "Feldoperation",
  mission_review: "Auftrag bewertet",
  voting_open: "Verdachtsprotokoll geöffnet",
  reveal_ready: "Auswertung verriegelt",
  report: "Abschlussbericht",
  role_decision: "Deckungsentscheidung",
  finished: "Archiv geschlossen",
};

const EVENT_COPY: Record<string, { title: string; body: string }> = {
  roles_released: {
    title: "Ihre Deckung ist verfügbar",
    body: "Öffnen Sie die Rollenakte diskret. Oder drehen Sie zumindest das Display weg.",
  },
  mission_published_private: {
    title: "Ihr Auftrag wurde entsiegelt",
    body: "Lesen Sie die Bedingungen, bevor Sie beginnen, verdächtig normal zu wirken.",
  },
  mission_published_public: {
    title: "Der Auftrag wurde übermittelt",
    body: "Der Millionär kennt jetzt seine Mission. Ab sofort kann selbst Smalltalk Beweismaterial sein.",
  },
  teams_published: {
    title: "Feldoperation freigegeben",
    body: "Teams und Einsatzregeln stehen bereit. Loyalität gilt bis zum ersten Fehler.",
  },
  challenge_winner: {
    title: "Feldoperation entschieden",
    body: "Das Siegerteam wurde protokolliert. Beschwerden werden atmosphärisch ignoriert.",
  },
  voting_opened: {
    title: "Verdachtsprotokoll geöffnet",
    body: "Ihre Vorahnung kann jetzt in eine offiziell dokumentierte Entscheidung umgewandelt werden.",
  },
  voting_closed: {
    title: "Stimmen verriegelt",
    body: "Die Auswertung läuft. Nervosität verbessert das Ergebnis nicht, wirkt aber angemessen.",
  },
  result_published: {
    title: "Abschlussbericht freigegeben",
    body: "Einige Annahmen waren korrekt. Andere waren mit bemerkenswertem Selbstbewusstsein falsch.",
  },
  round_started: {
    title: "Neue Einsatzphase",
    body: "Der Punktwert steigt. Die moralische Qualität der Entscheidungen erfahrungsgemäß nicht.",
  },
  game_finished: {
    title: "Archiv Midas geöffnet",
    body: "Die Operation ist beendet. Persönliche Notizen bleiben privat. Peinliche Abstimmungen nicht.",
  },
  millionaire_redrawn: {
    title: "Deckung neu vergeben",
    body: "Eine Notfall-Neuauslosung wurde durchgeführt. Die Zentrale hat den Vorgang widerwillig protokolliert.",
  },
};

function getName(view: MetaGameView, id?: string) {
  return view.members.find((member) => member.id === id)?.displayName ?? "Unbekannt";
}

function memberStatus(member?: MetaMember) {
  if (!member) return "Nicht registriert";
  if (member.attendanceStatus === "departed") return "Abgereist";
  if (member.attendanceStatus === "temporarily_absent") return "Abwesend";
  if (member.competitionStatus === "disqualified") return "Disqualifiziert";
  if (member.competitionStatus === "eliminated") return "Aus der Wertung";
  return "Aktiv";
}

function toneEvent(event: MetaEvent): MetaEvent {
  const copy = EVENT_COPY[event.eventType];
  return copy ? { ...event, ...copy } : event;
}

function MidasMark({ compact = false }: { compact?: boolean }) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg className={compact ? styles.markCompact : styles.mark} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f0d28a" />
          <stop offset=".45" stopColor="#b98d3f" />
          <stop offset="1" stopColor="#6f4d1d" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="43" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <path d="M34 77V42l26 23 26-23v35" fill="none" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="square" />
      <path d="M34 82h52M42 32h36" stroke="currentColor" strokeOpacity=".55" />
      <text x="60" y="103" textAnchor="middle" fontSize="8" letterSpacing="3" fill="currentColor">MIDAS</text>
    </svg>
  );
}

function OperativeSilhouettes() {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg className={styles.silhouettes} viewBox="0 0 760 220" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d2b16a" stopOpacity=".44" />
          <stop offset="1" stopColor="#101213" stopOpacity=".06" />
        </linearGradient>
      </defs>
      {[80, 200, 320, 440, 560, 680].map((x, index) => (
        <g key={x} opacity={index === 2 ? .85 : .48}>
          <circle cx={x} cy="62" r={index === 2 ? 29 : 25} fill={`url(#${gradientId})`} />
          <path d={`M${x - 48} 202c5-68 20-102 48-102s43 34 48 102z`} fill={`url(#${gradientId})`} />
          <path d={`M${x - 22} 105l22 25 22-25`} fill="none" stroke="#d2b16a" strokeOpacity=".35" />
        </g>
      ))}
      <path d="M0 202h760" stroke="#c4a15a" strokeOpacity=".24" />
    </svg>
  );
}

function Card({ id, eyebrow, title, subtitle, children, action }: {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={styles.card} id={id}>
      <div className={styles.cardHeader}>
        <div><span>{eyebrow}</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Overlay({ classification = "VERTRAULICH", title, children, onClose, dramatic = false }: {
  classification?: string;
  title: string;
  children: React.ReactNode;
  onClose(): void;
  dramatic?: boolean;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  return (
    <div className={`${styles.overlay} ${dramatic ? styles.dramatic : ""}`} role="dialog" aria-modal="true">
      <div className={styles.overlayPanel}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Fenster schließen">×</button>
        <div className={styles.overlayTopline}><MidasMark compact /><span>{classification}</span></div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function IntroSequence({ onClose }: { onClose(): void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, 4)), 2100);
    return () => window.clearInterval(timer);
  }, []);

  const scenes = [
    { code: "VERBINDUNG", title: "Sichere Verbindung wird hergestellt", body: "Verschlüsselung aktiv. Vertrauen weiterhin deaktiviert." },
    { code: "AKTE MIDAS", title: "Zugriff vorläufig genehmigt", body: "Eine Person in diesem Raum ist der Millionär. Die übrigen besitzen immerhin Meinungen." },
    { code: "PROTOKOLL", title: "Beobachten. Täuschen. Abstimmen.", body: "Wer richtig liegt, erhält Punkte. Wer falsch liegt, erhält Erfahrung. Die Zentrale bewertet beides unterschiedlich." },
    { code: "EINSATZ", title: "Jede Runde erhöht den Preis", body: "Missionen bleiben geheim. Verdächtigungen selten. Fehlentscheidungen werden dauerhaft archiviert." },
    { code: "FREIGABE", title: "Vertrauen ist gestattet", body: "Beweise werden bevorzugt." },
  ];

  const scene = scenes[step];
  return (
    <main className={styles.intro}>
      <button className={styles.introClose} onClick={onClose} aria-label="Intro schließen">×</button>
      <div className={styles.introGrid} />
      <OperativeSilhouettes />
      <section className={styles.introContent}>
        <MidasMark />
        <div className={styles.classifiedStamp}>VERTRAULICH</div>
        <p className={styles.kicker}>{scene.code}</p>
        <h1>{scene.title}</h1>
        <p>{scene.body}</p>
        <div className={styles.introProgress}>{scenes.map((_, index) => <button key={index} onClick={() => setStep(index)} className={index <= step ? styles.activeProgress : ""} aria-label={`Introszene ${index + 1}`} />)}</div>
        <button className={styles.primaryButton} onClick={onClose}>{step === 4 ? "Akte öffnen" : "Intro überspringen"}</button>
        <small>Die Zentrale wünscht einen diskreten Abend. Erfahrungsgemäß ist es dafür bereits zu spät.</small>
      </section>
    </main>
  );
}

function OperationBriefing({ isHost, onClose }: { isHost: boolean; onClose(): void }) {
  return (
    <Overlay classification="EINSATZBEFEHL" title={isHost ? "Leitstelle übernehmen" : "Akte Midas beginnt"} onClose={onClose} dramatic>
      {isHost ? (
        <div className={styles.briefing}>
          <p>Sie führen diese Operation.</p>
          <p>Sie bestimmen Rundenzahl, Mission, Bonus, Malus und Feldoperation. Kein einzelner Teilnehmer kann den Ablauf blockieren.</p>
          <p>Alle kritischen Eingriffe werden protokolliert. Die Zentrale hat aus früheren Spielleitungen gelernt.</p>
          <button className={styles.primaryButton} onClick={onClose}>Leitstelle öffnen</button>
        </div>
      ) : (
        <div className={styles.briefing}>
          <p>Eine Person unter Ihnen übernimmt die Rolle des Millionärs. Sie erhält einen geheimen Auftrag und versucht, unentdeckt zu bleiben.</p>
          <p>Beobachten Sie Verhalten, dokumentieren Sie Auffälligkeiten und verriegeln Sie Ihre Stimme, sobald die Abstimmung geöffnet wird.</p>
          <p>Misstrauen Sie vor allem Personen, die Ihnen empfehlen, anderen zu misstrauen.</p>
          <button className={styles.primaryButton} onClick={onClose}>Lagebild anzeigen</button>
        </div>
      )}
    </Overlay>
  );
}

function NotificationBell({ events, open, onToggle, onRead }: {
  events: MetaEvent[];
  open: boolean;
  onToggle(): void;
  onRead(): void;
}) {
  const toned = events.map(toneEvent);
  const unread = toned.filter((event) => !event.read).length;
  return (
    <div className={styles.bellWrap}>
      <button className={styles.bell} onClick={() => { onToggle(); if (!open) onRead(); }} aria-label="Meldungen der Zentrale"><span>⌁</span>{unread > 0 && <b>{unread}</b>}</button>
      {open && (
        <div className={styles.notificationDrawer}>
          <div className={styles.drawerHeader}><div><small>MELDUNGEN DER ZENTRALE</small><strong>Nachrichtenarchiv</strong></div><button onClick={onToggle}>×</button></div>
          {toned.length === 0 ? <p className={styles.muted}>Noch keine Meldungen. Die Ruhe ist vermutlich vorübergehend.</p> : toned.map((event) => (
            <article key={event.id} className={`${styles.notification} ${styles[event.severity]}`}>
              <span>{event.roundNumber ? `AKTE R${event.roundNumber}` : "PARTIE"}</span><strong>{event.title}</strong><p>{event.body}</p><small>{new Date(event.createdAt).toLocaleString("de-DE")}</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryScreen({ controller }: { controller: ReturnType<typeof useMetaGame> }) {
  const [mode, setMode] = useState<"join" | "create" | "resume">("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [title, setTitle] = useState("Akte Midas");
  const [rounds, setRounds] = useState(4);
  const [finalRule, setFinalRule] = useState<"classic" | "points">("classic");
  const [notesVisibility, setNotesVisibility] = useState<"host" | "private">("host");
  const [localError, setLocalError] = useState<string>();

  async function execute(action: () => Promise<void>) {
    setLocalError(undefined);
    try { await action(); } catch (error) { setLocalError(error instanceof Error ? error.message : "Die Zentrale konnte den Vorgang nicht abschließen."); }
  }

  return (
    <main className={styles.entry}>
      <div className={styles.entryGrid} /><OperativeSilhouettes />
      <section className={styles.entryPanel}>
        <div className={styles.entryBrand}><MidasMark /><div><p className={styles.kicker}>Secret Millionär</p><h1>Akte <span>Midas</span></h1></div></div>
        <p className={styles.lead}>Ein gesellschaftlicher Geheimdiensteinsatz mit verdeckten Aufträgen, kontrollierter Paranoia und dauerhaft archivierten Fehlentscheidungen.</p>
        <div className={styles.modeTabs}>
          <button className={mode === "join" ? styles.activeTab : ""} onClick={() => setMode("join")}>Einsatz beitreten</button>
          <button className={mode === "create" ? styles.activeTab : ""} onClick={() => setMode("create")}>Akte eröffnen</button>
          <button className={mode === "resume" ? styles.activeTab : ""} onClick={() => setMode("resume")}>Leitstelle fortsetzen</button>
        </div>
        {mode === "join" && (
          <form onSubmit={(event) => { event.preventDefault(); void execute(() => controller.joinGame({ code, name, pin })); }} className={styles.formStack}>
            <label>Zugangscode<input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="000000" /></label>
            <label>Deckname<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ihr Name genügt. Vorerst." /></label>
            <label>Profil-PIN<input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} placeholder="••••" /></label>
            <button className={styles.primaryButton} disabled={controller.loading}>Identität registrieren</button>
            <small>Sie wurden nicht aufgrund Ihrer Qualifikation ausgewählt. Sie kannten den Zugangscode. Das genügt der Zentrale.</small>
          </form>
        )}
        {mode === "create" && (
          <form onSubmit={(event) => { event.preventDefault(); void execute(() => controller.createGame({ title, pin, totalRounds: rounds, finalRule, notesVisibility })); }} className={styles.formStack}>
            <label>Aktenname<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <div className={styles.twoColumns}><label>Runden<select value={rounds} onChange={(event) => setRounds(Number(event.target.value))}>{[2,3,4,5,6,7,8].map((roundCount) => <option key={roundCount}>{roundCount}</option>)}</select></label><label>Leitstellen-PIN<input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} placeholder="••••" /></label></div>
            <label>Finalprotokoll<select value={finalRule} onChange={(event) => setFinalRule(event.target.value as "classic" | "points")}><option value="classic">Klassisch: Final-Millionär kann direkt gewinnen</option><option value="points">Gesamtwertung: Punkte entscheiden</option></select></label>
            <label>Ermittlungsnotizen<select value={notesVisibility} onChange={(event) => setNotesVisibility(event.target.value as "host" | "private")}><option value="host">Spieler und Leitstelle können sie einsehen</option><option value="private">Nur der jeweilige Spieler</option></select></label>
            <button className={styles.primaryButton} disabled={controller.loading}>Operation eröffnen</button>
          </form>
        )}
        {mode === "resume" && (
          <form onSubmit={(event) => { event.preventDefault(); void execute(() => controller.resumeHost(code, pin)); }} className={styles.formStack}>
            <label>Zugangscode<input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} /></label>
            <label>Leitstellen-PIN<input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} /></label>
            <button className={styles.primaryButton} disabled={controller.loading}>Leitstelle entsperren</button>
          </form>
        )}
        {(localError || controller.error) && <div className={styles.error}>{localError ?? controller.error}</div>}
      </section>
    </main>
  );
}

function DashboardShell({ view, controller, children }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame>; children: React.ReactNode }) {
  const [bellOpen, setBellOpen] = useState(false);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const toned = view.notifications.map(toneEvent);
  const popup = toned.find((event) => !event.read && event.severity === "critical" && !dismissed.includes(event.id));
  return (
    <main className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.brandSmall}><MidasMark compact /><div><span className={styles.kicker}>Secret Millionär · Akte Midas</span><h1>{view.title}</h1></div></div>
        <div className={styles.topbarMeta}>
          <div><small>Einsatzphase</small><strong>{view.currentRound}/{view.totalRounds}</strong></div><div><small>Lage</small><strong>{PHASE_LABELS[view.phase]}</strong></div>
          <NotificationBell events={view.notifications} open={bellOpen} onToggle={() => setBellOpen(!bellOpen)} onRead={() => void controller.markNotificationsRead()} />
          <button className={styles.ghostButton} onClick={() => { if (window.confirm("Diese Akte auf diesem Gerät verlassen? Mit Zugangscode, Name und PIN kannst du dein Profil wieder öffnen.")) void controller.clearSession(); }}>Akte verlassen</button>
        </div>
      </header>
      {controller.error && <div className={styles.errorBar}><span>{controller.error}</span><button onClick={() => void controller.refresh()}>Verbindung neu prüfen</button></div>}
      <nav className={styles.anchorNav}><a href="#overview">Lagebild</a><a href="#players">Kartei</a><a href="#role">Deckung</a><a href="#mission">Auftrag</a><a href="#challenge">Feldoperation</a><a href="#vote">Verdacht</a><a href="#log">Einsatzakte</a></nav>
      {children}
      {popup && <Overlay classification="NEUE MELDUNG" title={popup.title} onClose={() => setDismissed((current) => current.includes(popup.id) ? current : [...current, popup.id])}><p>{popup.body}</p><small>Die Meldung bleibt im Nachrichtenarchiv abrufbar. Die Zentrale löscht nur selten Beweise.</small></Overlay>}
    </main>
  );
}

function MissionPreview({ mission }: { mission: MissionCatalogEntry }) {
  return <article className={styles.catalogPreview}><div className={styles.catalogHeading}><span>{mission.catalogId}</span><b>{mission.difficulty}</b></div><h3>{mission.title}</h3><p>{mission.task}</p><dl><div><dt>Erfolg</dt><dd>{mission.successCriteria}</dd></div><div><dt>Zeitfenster</dt><dd>{mission.timeWindow}</dd></div><div><dt>Voraussetzung</dt><dd>{mission.requirements}</dd></div><div><dt>Einschränkung</dt><dd>{mission.restriction}</dd></div></dl><blockquote>{mission.centralNote}</blockquote></article>;
}

function ChallengePreview({ challenge }: { challenge: ChallengeCatalogEntry }) {
  return <article className={styles.catalogPreview}><div className={styles.catalogHeading}><span>{challenge.catalogId}</span><b>{challenge.category}</b></div><h3>{challenge.title}</h3><p>{challenge.briefing}</p><dl><div><dt>Sieg</dt><dd>{challenge.winCondition}</dd></div><div><dt>Dauer</dt><dd>{challenge.duration}</dd></div><div><dt>Material</dt><dd>{challenge.material}</dd></div><div><dt>Sicherheit</dt><dd>{challenge.safety}</dd></div><div><dt>Getränkemodus</dt><dd>{challenge.drinkRule}</dd></div></dl><blockquote>{challenge.centralNote}</blockquote></article>;
}

function EffectPreview({ label, effect, tone }: { label: string; effect: EffectCatalogEntry; tone: "bonus" | "malus" }) {
  return <article className={`${styles.effectPreview} ${tone === "bonus" ? styles.bonus : styles.malus}`}><span>{label} · {effect.catalogId}</span><h4>{effect.title}</h4><p>{effect.description}</p></article>;
}

function HostDashboard({ view, controller }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame> }) {
  const round = view.currentRoundState;
  const [missionId, setMissionId] = useState("M01");
  const [challengeId, setChallengeId] = useState("C01");
  const [bonusId, setBonusId] = useState("B01");
  const [malusId, setMalusId] = useState("X03");
  const [revealOpen, setRevealOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [copiedCode, setCopiedCode] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    setMissionId(round.mission?.catalogId ?? MISSION_CATALOG.find((entry) => entry.title === round.mission?.title)?.catalogId ?? "M01");
    setChallengeId(round.challenge?.catalogId ?? CHALLENGE_CATALOG.find((entry) => entry.title === round.challenge?.title)?.catalogId ?? "C01");
    setBonusId(round.bonus?.catalogId ?? BONUS_CATALOG.find((entry) => entry.title === round.bonus?.title)?.catalogId ?? "B01");
    setMalusId(round.malus?.catalogId ?? MALUS_CATALOG.find((entry) => entry.title === round.malus?.title)?.catalogId ?? "X03");
  }, [view.currentRound, round.mission, round.challenge, round.bonus, round.malus]);
  useEffect(() => { if (view.phase === "reveal_ready" || (round.result && !round.resultPublished)) setRevealOpen(true); }, [view.phase, round.result, round.resultPublished]);
  useEffect(() => { if (view.phase === "finished") setFinalOpen(true); }, [view.phase]);

  const activeCandidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound);
  const availableParticipants = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus !== "disqualified" && member.activeFromRound <= view.currentRound);
  const activeCount = activeCandidates.length;
  const availableCount = availableParticipants.length;
  const compatibleMissions = MISSION_CATALOG.filter((entry) => entry.minPlayers <= availableCount);
  const compatibleChallenges = CHALLENGE_CATALOG.filter((entry) => entry.minPlayers <= availableCount);
  const mission = missionById(missionId);
  const challenge = challengeById(challengeId);
  const bonus = bonusById(bonusId);
  const malus = malusById(malusId);
  const packageCompatible = mission.minPlayers <= availableCount && challenge.minPlayers <= availableCount;
  const usedMissionIds = useMemo(() => Object.values(view.rounds ?? {}).map((entry) => entry.mission?.catalogId).filter((id): id is string => Boolean(id)), [view.rounds]);
  const usedChallengeIds = useMemo(() => Object.values(view.rounds ?? {}).map((entry) => entry.challenge?.catalogId).filter((id): id is string => Boolean(id)), [view.rounds]);

  async function run(name: string, action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyAction(name);
    try { await action(); }
    finally { busyRef.current = false; setBusyAction(undefined); }
  }
  async function copyJoinCode() {
    try {
      await navigator.clipboard.writeText(view.joinCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      window.prompt("Zugangscode kopieren", view.joinCode);
    }
  }
  function packageInput(): RoundPackageInput { return { mission, challenge, bonus, malus }; }

  const submitted = activeCandidates.filter((member) => member.voteSubmitted).length;
  const isBusy = Boolean(busyAction);
  const nextStep = availableCount < 4
    ? `Mindestens vier anwesende Teilnehmer werden benötigt. Aktuell: ${availableCount}.`
    : !round.mission?.catalogId || !round.challenge?.catalogId
      ? "Rundenpaket auswählen und versiegeln."
      : !round.millionaireId
        ? "Millionär auslosen."
        : !round.roleReleased
          ? "Deckungen freigeben."
          : !round.missionPublished
            ? "Geheimen Auftrag entsiegeln."
            : !round.challengePublished
              ? "Teams und Feldoperation freigeben."
              : !round.winningTeam
                ? "Siegerteam der Feldoperation bestätigen."
                : !["completed", "failed", "neutral"].includes(round.missionStatus ?? "pending")
                  ? "Mission bewerten."
                  : view.phase === "voting_open"
                    ? `Auf Stimmen warten oder Auswertung mit ${submitted}/${activeCount} Stimmen schließen.`
                    : !round.result
                      ? "Verdachtsprotokoll öffnen."
                      : !round.resultPublished
                        ? "Enthüllung prüfen und Abschlussbericht veröffentlichen."
                        : view.currentRound === view.totalRounds
                          ? "Archiv Midas öffnen."
                          : "Nächste Einsatzphase starten.";

  return (
    <DashboardShell view={view} controller={controller}>
      <div className={styles.hostHero} id="overview"><div><span>LEITSTELLE</span><h2>Einsatzphase {view.currentRound}</h2><p>Sie steuern Freigaben und Ergebnisse. Macht ist kein Ersatz für Übersicht, wird aber häufig damit verwechselt.</p></div><div className={styles.codeBox}><small>Zugangscode</small><strong>{view.joinCode}</strong><button onClick={() => void copyJoinCode()}>{copiedCode ? "Kopiert" : "Code kopieren"}</button></div></div>
      <div className={styles.hostGrid}>
        <div className={styles.mainColumn}>
          <Card eyebrow="Lagebild" title="Operativer Status" subtitle="Alle entscheidenden Zustände dieser Runde. Die Zentrale vermeidet Überraschungen, soweit Teilnehmer dies zulassen." action={<button className={styles.ghostButton} disabled={isBusy} onClick={() => void run("join", () => controller.setAcceptingPlayers(!view.acceptingPlayers))}>{view.acceptingPlayers ? "Beitritt verriegeln" : "Beitritt öffnen"}</button>}>
            <div className={styles.metrics}><div><span>Aktive Kandidaten</span><strong>{activeCandidates.length}</strong></div><div><span>Verriegelte Stimmen</span><strong>{submitted}/{activeCandidates.length}</strong></div><div><span>Millionär</span><strong>{round.millionaireId ? getName(view, round.millionaireId) : "Nicht ausgelost"}</strong></div><div><span>Aktenrevision</span><strong>{view.revision}</strong></div><div className={styles.nextStep}><span>Nächster Schritt</span><strong>{nextStep}</strong></div></div>
          </Card>
          <Card eyebrow="Versiegelte Auswahl" title="Rundenpaket" subtitle="Mission, Feldoperation, Bonus und Malus sind getrennte, feste Katalogeinträge. Freitext wurde aus guten Gründen aus dem Gebäude begleitet.">
            {!packageCompatible && <div className={styles.capacityWarning}>Auswahl nicht spielbar: Mission benötigt {mission.minPlayers}, Challenge {challenge.minPlayers}, verfügbar sind {availableCount} anwesende Teilnehmer.</div>}<div className={styles.catalogControls}>
              <label>Geheime Mission<select value={missionId} onChange={(event) => setMissionId(event.target.value)}>{MISSION_CATALOG.map((entry) => <option value={entry.catalogId} key={entry.catalogId} disabled={entry.minPlayers > availableCount}>{entry.catalogId} · {entry.title} · {entry.difficulty} · ab {entry.minPlayers}</option>)}</select></label><button disabled={isBusy || compatibleMissions.length === 0} onClick={() => setMissionId(randomUnused(compatibleMissions, usedMissionIds).catalogId)}>Passende Mission ziehen</button>
              <label>Team-Challenge<select value={challengeId} onChange={(event) => setChallengeId(event.target.value)}>{CHALLENGE_CATALOG.map((entry) => <option value={entry.catalogId} key={entry.catalogId} disabled={entry.minPlayers > availableCount}>{entry.catalogId} · {entry.title} · {entry.category} · ab {entry.minPlayers}</option>)}</select></label><button disabled={isBusy || compatibleChallenges.length === 0} onClick={() => setChallengeId(randomUnused(compatibleChallenges, usedChallengeIds).catalogId)}>Passende Challenge ziehen</button>
              <label>Bonus bei Erfolg<select value={bonusId} onChange={(event) => setBonusId(event.target.value)}>{BONUS_CATALOG.map((entry) => <option value={entry.catalogId} key={entry.catalogId}>{entry.catalogId} · {entry.title}</option>)}</select></label>
              <label>Malus bei Misserfolg<select value={malusId} onChange={(event) => setMalusId(event.target.value)}>{MALUS_CATALOG.map((entry) => <option value={entry.catalogId} key={entry.catalogId}>{entry.catalogId} · {entry.title}</option>)}</select></label>
            </div>
            <div className={styles.catalogGrid}><MissionPreview mission={mission} /><ChallengePreview challenge={challenge} /></div>
            <div className={styles.effectGrid}><EffectPreview label="Bonus bei Erfolg" effect={bonus} tone="bonus" /><EffectPreview label="Malus bei Misserfolg" effect={malus} tone="malus" /></div>
            <button className={styles.primaryButton} disabled={isBusy || !packageCompatible || !['lobby','round_setup'].includes(view.phase)} onClick={() => void run("configure", () => controller.configureRound(packageInput()))}>Rundenpaket versiegeln</button>
          </Card>
          <Card eyebrow="Befehlskette" title="Zentrale Rundensteuerung" subtitle="Der Ablauf kann jederzeit fortgesetzt werden. Fehlende Reaktionen einzelner Teilnehmer sind Warnungen, keine Geiselnahme.">
            <div className={styles.controlFlow}>
              <button onClick={() => { const redraw = Boolean(round.millionaireId); if (redraw && !window.confirm("Die bisherige Deckung wird ungültig. Millionär wirklich zufällig neu auslosen?")) return; void run("draw", () => controller.drawMillionaire(redraw)); }} disabled={isBusy || ['voting_open','reveal_ready','report','role_decision','finished'].includes(view.phase)}>{round.millionaireId ? "Notfall-Neuauslosung" : "Millionär auslosen"}</button>
              <button onClick={() => void run("roles", () => controller.releaseRoles())} disabled={isBusy || !round.millionaireId || Boolean(round.roleReleased)}>Deckungen freigeben</button><button onClick={() => void run("mission", () => controller.publishMission())} disabled={isBusy || !round.roleReleased || Boolean(round.missionPublished)}>Auftrag entsiegeln</button><button onClick={() => void run("teams", () => controller.drawTeams())} disabled={isBusy || !round.missionPublished || Boolean(round.challengePublished)}>Feldoperation freigeben</button><button onClick={() => void run("missionok", () => controller.setMissionStatus("completed"))} disabled={isBusy || !round.challengePublished || !['challenge','mission_review'].includes(view.phase)}>Auftrag erfüllt</button><button onClick={() => void run("missionfail", () => controller.setMissionStatus("failed"))} disabled={isBusy || !round.challengePublished || !['challenge','mission_review'].includes(view.phase)}>Auftrag gescheitert</button><button onClick={() => void run("neutral", () => controller.setMissionStatus("neutral"))} disabled={isBusy || !round.challengePublished || !['challenge','mission_review'].includes(view.phase)}>Neutral abschließen</button><button onClick={() => void run("voteopen", () => controller.openVoting())} disabled={isBusy || !round.winningTeam || !['completed','failed','neutral'].includes(round.missionStatus ?? "pending") || view.phase === "voting_open"}>Verdachtsprotokoll öffnen</button><button className={styles.dangerButton} onClick={() => void run("voteclose", () => controller.closeVoting())} disabled={isBusy || view.phase !== "voting_open"}>Stimmen verriegeln ({submitted}/{activeCandidates.length})</button><button onClick={() => setRevealOpen(true)} disabled={isBusy || !round.result}>Enthüllung starten</button><button onClick={() => void run("publish", () => controller.publishResult())} disabled={isBusy || !round.result || Boolean(round.resultPublished)}>Bericht veröffentlichen</button><button className={styles.primaryButton} onClick={() => void run("next", () => controller.advanceRound())} disabled={isBusy || !round.resultPublished}>{view.currentRound === view.totalRounds ? "Archiv Midas öffnen" : "Nächste Einsatzphase"}</button>
            </div><p className={styles.muted}>Fehlende Stimmen verhindern den Abschluss nicht. Sie werden als nicht abgegeben dokumentiert und erhalten keine Punkte. Demokratie kann warten; der Zeitplan nicht.</p>
          </Card>
          <Card id="challenge" eyebrow="Feldoperation" title="Teams und Ergebnis">
            {!round.challengePublished ? <p className={styles.placeholder}>Die Feldoperation ist noch versiegelt. Freundschaften ebenfalls.</p> : <><h3>{round.challenge?.title}</h3><p>{round.challenge?.briefing}</p><div className={styles.factStrip}><span><b>Sieg</b>{round.challenge?.winCondition}</span><span><b>Material</b>{round.challenge?.material}</span><span><b>Getränkeregel</b>{round.challenge?.drinkRule}</span></div><div className={styles.teamGrid}><TeamPanel team="azur" view={view} round={round} /><TeamPanel team="gold" view={view} round={round} /></div><div className={styles.inlineActions}><button disabled={isBusy || !['challenge','mission_review'].includes(view.phase)} onClick={() => void run("challenge-azur", () => controller.setChallengeWinner("azur"))}>Sektor Azur gewinnt</button><button disabled={isBusy || !['challenge','mission_review'].includes(view.phase)} onClick={() => void run("challenge-gold", () => controller.setChallengeWinner("gold"))}>Sektor Gold gewinnt</button></div></>}
          </Card>
          <Card id="vote" eyebrow="Verdachtsprotokoll" title="Live-Monitor"><div className={styles.voteMonitor}>{activeCandidates.map((member) => <div key={member.id}><span className={styles.avatar}>{member.displayName[0]}</span><div><strong>{member.displayName}</strong><small>{member.voteSubmitted ? "Stimme verriegelt" : "Entscheidung ausstehend"}</small></div><b className={member.voteSubmitted ? styles.ok : styles.wait}>{member.voteSubmitted ? "✓" : "…"}</b></div>)}</div></Card>
        </div>
        <aside className={styles.sideColumn}>
          <Card id="players" eyebrow="Verdächtigenkartei" title="Teilnehmer"><div className={styles.memberAdminList}>{view.members.map((member) => <HostMemberRow key={member.id} member={member} controller={controller} />)}</div></Card>
          {view.notesVisibility === "host" && <Card eyebrow="Interne Beobachtung" title="Spielernotizen"><div className={styles.noteFeed}>{(view.hostNotes ?? []).length === 0 ? <p className={styles.muted}>Noch keine Notizen. Entweder arbeitet niemand oder alle arbeiten sehr diskret.</p> : view.hostNotes?.map((note,index) => <article key={`${note.authorMemberId}-${note.subjectMemberId}-${index}`}><strong>{getName(view,note.authorMemberId)} → {getName(view,note.subjectMemberId)}</strong><p>{note.note}</p></article>)}</div></Card>}
          <Card id="log" eyebrow="Leitstellenarchiv" title="Ereignisprotokoll"><EventList events={view.notifications} /></Card>
        </aside>
      </div>
      {revealOpen && round.result && <RevealOverlay view={view} round={round} onClose={() => setRevealOpen(false)} onPublish={!round.resultPublished ? () => void run("publish-overlay", () => controller.publishResult()) : undefined} />}
      {finalOpen && view.finalResult && <FinalOverlay view={view} onClose={() => setFinalOpen(false)} />}
    </DashboardShell>
  );
}

function HostMemberRow({ member, controller }: { member: MetaMember; controller: ReturnType<typeof useMetaGame> }) {
  function changeAttendance(next: MetaMember["attendanceStatus"]) {
    if (next === member.attendanceStatus) return;
    if (next === "departed" && !window.confirm(`${member.displayName} als abgereist markieren? Das beendet die Teilnahme an der Wertung dauerhaft.`)) return;
    void controller.setMemberStatus({ memberId: member.id, attendanceStatus: next });
  }
  function changeCompetition(next: MetaMember["competitionStatus"]) {
    if (next === member.competitionStatus) return;
    const label = next === "disqualified" ? "disqualifizieren" : "aus der Wertung nehmen";
    if (!window.confirm(`${member.displayName} wirklich ${label}? Diese Entscheidung kann innerhalb der Partie nicht rückgängig gemacht werden.`)) return;
    void controller.setMemberStatus({ memberId: member.id, competitionStatus: next });
  }
  return <div className={styles.hostMemberRow}><span className={styles.avatar}>{member.displayName[0]}</span><div><strong>{member.displayName}</strong><small>{memberStatus(member)} · aktiv ab R{member.activeFromRound} · {member.points ?? 0} Punkte</small></div><label className={styles.memberStatusControl}><span>Anwesenheit</span><select value={member.attendanceStatus} onChange={(event) => changeAttendance(event.target.value as MetaMember["attendanceStatus"])}><option value="present">Anwesend</option><option value="temporarily_absent">Vorübergehend abwesend</option><option value="departed">Abgereist</option></select></label><label className={styles.memberStatusControl}><span>Wertung</span><select value={member.competitionStatus} onChange={(event) => changeCompetition(event.target.value as MetaMember["competitionStatus"])}>{member.competitionStatus === "eligible" && <option value="eligible">Aktiv</option>}{member.competitionStatus !== "disqualified" && <option value="eliminated">Aus der Wertung</option>}<option value="disqualified">Disqualifiziert</option></select></label></div>;
}

function TeamPanel({ team, view, round }: { team: TeamCode; view: MetaGameView; round: MetaRoundState }) {
  const members = view.members.filter((member) => round.teams?.[member.id] === team);
  return <div className={`${styles.teamPanel} ${team === "azur" ? styles.azur : styles.gold}`}><h4>Sektor {team === "azur" ? "Azur" : "Gold"}{round.winningTeam === team ? " · Sieger" : ""}</h4>{members.map((member) => <span key={member.id}>{member.displayName}{member.competitionStatus !== "eligible" ? " · außer Wertung" : ""}</span>)}</div>;
}

function EventList({ events }: { events: MetaEvent[] }) {
  const toned = events.map(toneEvent);
  return <div className={styles.eventList}>{toned.length === 0 ? <p className={styles.muted}>Noch keine Ereignisse. Die Stille ist nicht belastbar.</p> : toned.map((event) => <article key={event.id}><span>{event.roundNumber ? `R${event.roundNumber}` : "•"}</span><div><strong>{event.title}</strong><p>{event.body}</p><small>{new Date(event.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</small></div></article>)}</div>;
}

function ParticipantNotes({ view, controller }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame> }) {
  const ownNotes = new Map((view.ownNotes ?? []).map((note) => [note.subjectMemberId, note.note]));
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  return <div className={styles.participantGrid}>{view.members.filter((member) => member.id !== view.memberId).map((member) => { const value = drafts[member.id] ?? ownNotes.get(member.id) ?? ""; return <article key={member.id} className={styles.participantCard}><div className={styles.participantHead}><span className={styles.avatar}>{member.displayName[0]}</span><div><strong>{member.displayName}</strong><small>{memberStatus(member)} · Einstieg R{member.joinedRound}</small></div></div><textarea value={value} onChange={(event) => setDrafts({ ...drafts, [member.id]: event.target.value })} placeholder="Auffälligkeit dokumentieren …" /><button onClick={() => void controller.saveNote(member.id, value)}>Aktenvermerk speichern</button></article>; })}</div>;
}

function EffectSelection({ view, round, controller }: { view: MetaGameView; round: MetaRoundState; controller: ReturnType<typeof useMetaGame> }) {
  const effect = round.missionStatus === "completed" ? round.bonus : round.missionStatus === "failed" ? round.malus : undefined;
  const selectable = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound && member.id !== view.memberId);
  const selectableKey = selectable.map((member) => member.id).join("|");
  const [voterId, setVoterId] = useState(round.effectSelection?.voterId ?? "");
  const [targetId, setTargetId] = useState(round.effectSelection?.targetId ?? "");
  useEffect(() => {
    const savedVoter = round.effectSelection?.voterId ?? "";
    const savedTarget = round.effectSelection?.targetId ?? "";
    setVoterId(savedVoter && selectable.some((member) => member.id === savedVoter) ? savedVoter : "");
    setTargetId(savedTarget && selectable.some((member) => member.id === savedTarget) ? savedTarget : "");
  }, [round.number, round.effectSelection?.voterId, round.effectSelection?.targetId, selectableKey]);
  if (!effect || effect.kind === "none" || effect.selectionMode === "none") return null;
  const requiresVoter = ["voter", "source_and_target"].includes(effect.selectionMode ?? "");
  const requiresTarget = ["target", "source_and_target"].includes(effect.selectionMode ?? "");
  const validVoter = !requiresVoter || selectable.some((member) => member.id === voterId);
  const validTarget = !requiresTarget || selectable.some((member) => member.id === targetId);
  const selectionComplete = validVoter && validTarget;
  return <div className={styles.effectSelection}><h4>Effektziel festlegen: {effect.title}</h4>{requiresVoter && <label>Betroffener Wähler<select value={voterId} onChange={(event) => setVoterId(event.target.value)}><option value="">Auswählen</option>{selectable.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></label>}{requiresTarget && <label>Zielperson<select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Auswählen</option>{selectable.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></label>}<button disabled={!selectionComplete} onClick={() => void controller.setEffectSelection({ voterId, targetId })}>Auswahl verriegeln</button>{!selectionComplete && <small className={styles.invalidHint}>Der Effekt verfällt ohne vollständige und weiterhin gültige Auswahl.</small>}</div>;
}

function PlayerDashboard({ view, controller }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame> }) {
  const round = view.currentRoundState;
  const currentMember = view.members.find((member) => member.id === view.memberId);
  const candidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound && member.id !== view.memberId);
  const candidateKey = candidates.map((member) => member.id).join("|");
  const [voteTarget,setVoteTarget] = useState(view.ownVoteDraft ?? "");
  const [revealOpen,setRevealOpen] = useState(false);
  const [finalOpen,setFinalOpen] = useState(false);
  useEffect(() => {
    const draft = view.ownVoteDraft ?? "";
    setVoteTarget(draft && candidates.some((member) => member.id === draft) ? draft : "");
  }, [view.ownVoteDraft, view.currentRound, candidateKey]);
  useEffect(() => { if (round.resultPublished) setRevealOpen(true); }, [round.resultPublished, view.currentRound]);
  useEffect(() => { if (view.phase === "finished") setFinalOpen(true); }, [view.phase]);
  const canVote = currentMember?.attendanceStatus === "present" && currentMember.competitionStatus === "eligible" && currentMember.activeFromRound <= view.currentRound;
  const ownTeam = round.teams?.[view.memberId ?? ""];
  const validVoteTarget = candidates.some((member) => member.id === voteTarget);

  return <DashboardShell view={view} controller={controller}>
    <div className={styles.playerHero} id="overview"><div><span>PERSÖNLICHE AKTE</span><h2>Einsatzphase {view.currentRound}</h2><p>Alle freigegebenen Informationen bleiben erreichbar. Vergesslichkeit ist damit keine belastbare Verteidigung mehr.</p></div><div className={styles.personalScore}><small>Geheime Punkte</small><strong>{view.ownPoints ?? 0}</strong><span>{memberStatus(currentMember)}</span></div></div>
    <div className={styles.playerGrid}>
      <Card eyebrow="Lagebild" title="Allgemeine Übersicht"><div className={styles.rules}><p><strong>Ziel:</strong> Enttarnen Sie den Millionär oder überleben Sie selbst in dieser Rolle.</p><p><strong>Punktwert:</strong> Runde {view.currentRound} bringt {view.currentRound} Punkte. Keine verbindliche Stimme bedeutet keine positiven Rundenpunkte.</p><p><strong>Ausscheiden:</strong> Ausgeschiedene bleiben bei Feldoperationen willkommen, dürfen aber nicht abstimmen, punkten oder Millionär werden.</p><p><strong>Aktuelle Lage:</strong> {PHASE_LABELS[view.phase]}.</p><blockquote>Misstrauen Sie schnellen Allianzen. Vor allem den langsamen.</blockquote></div></Card>
      <Card id="players" eyebrow="Verdächtigenkartei" title="Teilnehmer und Aktenvermerke" action={<span className={styles.privacyTag}>{view.notesVisibility === "host" ? "Sie + Leitstelle" : "Nur Sie"}</span>}><ParticipantNotes view={view} controller={controller} /></Card>
      <Card id="role" eyebrow="Ihre Deckung" title="Eigene Rolle">{!round.roleReleased ? <p className={styles.placeholder}>Ihre Akte ist noch versiegelt. Die Leitstelle sortiert derzeit Verantwortung, Schuld und Zufall.</p> : view.ownRole === "millionaire" ? <div className={`${styles.secretRole} ${styles.millionaireRole}`}><MidasMark /><h3>Sie sind der Millionär</h3><p>Sie besitzen die Rolle, nicht die Immunität. Erfüllen Sie den Auftrag und vermeiden Sie es, bei der Abstimmung die beliebteste Person im Raum zu werden.</p></div> : view.ownRole === "investigator" ? <div className={styles.secretRole}><div className={styles.scopeGraphic}><span /><span /><span /></div><h3>Sie sind Ermittler</h3><p>Beobachten Sie Verhalten, Widersprüche und auffällige Versuche, unauffällig zu wirken. Selbstbewusstsein ist kein Beweis für Vermögen.</p></div> : <p className={styles.placeholder}>Sie sind in dieser Runde nicht wettbewerbsberechtigt. Gesellschaftlich bleiben Sie leider vollständig verfügbar.</p>}</Card>
      <Card id="mission" eyebrow="Versiegelter Auftrag" title={view.ownRole === "millionaire" ? (round.mission?.title ?? "Wird vorbereitet") : "Nur für den Millionär"}>{view.ownRole !== "millionaire" ? <p className={styles.placeholder}>Der Millionär hat einen geheimen Auftrag. Sie erhalten keine weiteren Informationen. Das unangenehme Gefühl, etwas zu übersehen, ist Bestandteil des Spiels.</p> : !round.missionPublished ? <p className={styles.placeholder}>Ihr Auftrag wird vorbereitet. Versuchen Sie bis dahin, nicht vorsorglich verdächtig zu werden.</p> : <div className={styles.missionPanel}><div className={styles.classificationLine}><span>{round.mission?.catalogId ?? "MISSION"}</span><b>{round.mission?.difficulty ?? "klassifiziert"}</b></div><p>{round.mission?.task}</p><dl><div><dt>Erfolgskriterium</dt><dd>{round.mission?.successCriteria}</dd></div><div><dt>Zeitfenster</dt><dd>{round.mission?.timeWindow}</dd></div><div><dt>Voraussetzung</dt><dd>{round.mission?.requirements}</dd></div><div><dt>Einschränkung</dt><dd>{round.mission?.restriction}</dd></div></dl>{round.mission?.centralNote && <blockquote>{round.mission.centralNote}</blockquote>}<div className={styles.effectGrid}>{round.bonus && <EffectPreview label="Bonus bei Erfolg" effect={round.bonus as EffectCatalogEntry} tone="bonus" />}{round.malus && <EffectPreview label="Malus bei Misserfolg" effect={round.malus as EffectCatalogEntry} tone="malus" />}</div><div className={styles.statusLine}>Status: <strong>{round.missionStatus === "completed" ? "Auftrag erfüllt" : round.missionStatus === "failed" ? "Auftrag gescheitert" : round.missionStatus === "neutral" ? "Neutral beendet" : "Aktiv"}</strong></div><EffectSelection view={view} round={round} controller={controller} /></div>}</Card>
      <Card id="challenge" eyebrow="Feldoperation" title={round.challengePublished ? (round.challenge?.title ?? "Challenge") : "Wird vorbereitet"}>{!round.challengePublished ? <p className={styles.placeholder}>Die Feldoperation wird vorbereitet. Teams sind noch nicht endgültig. Freundschaften ebenfalls nicht.</p> : <><p>{round.challenge?.briefing}</p><div className={styles.factStrip}><span><b>Ihr Sektor</b>{ownTeam ? `Sektor ${ownTeam === "azur" ? "Azur" : "Gold"}` : "Noch nicht zugewiesen"}</span><span><b>Siegbedingung</b>{round.challenge?.winCondition}</span><span><b>Dauer</b>{round.challenge?.duration}</span><span><b>Material</b>{round.challenge?.material}</span><span><b>Sicherheit</b>{round.challenge?.safety}</span><span><b>Getränkeregel</b>{round.challenge?.drinkRule}</span></div>{round.challenge?.centralNote && <blockquote>{round.challenge.centralNote}</blockquote>}<div className={styles.teamGrid}><TeamPanel team="azur" view={view} round={round} /><TeamPanel team="gold" view={view} round={round} /></div>{round.winningTeam && <div className={styles.winnerStrip}>Sektor {round.winningTeam === "azur" ? "Azur" : "Gold"} gewinnt. Die Zentrale ist beeindruckt. Dieser Zustand ist vorübergehend.</div>}</>}</Card>
      <Card id="vote" eyebrow="Verdachtsprotokoll" title="Abstimmung">{!canVote ? <p className={styles.placeholder}>Sie sind in dieser Runde nicht abstimmungsberechtigt. Eine Meinung dürfen Sie selbstverständlich weiterhin besitzen.</p> : <div className={styles.voteCard}><label>Wen halten Sie für den Millionär?<select value={voteTarget} disabled={Boolean(view.ownVote)} onChange={(event) => { setVoteTarget(event.target.value); if (event.target.value) void controller.saveVoteDraft(event.target.value); }}><option value="">Verdacht vormerken</option>{candidates.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label><p>{view.phase === "voting_open" ? "Das Verdachtsprotokoll ist geöffnet. Prüfen Sie Ihren Entwurf und verriegeln Sie die Stimme." : "Diese Auswahl ist ein privater Entwurf und kann geändert werden. Sie entspricht damit dem normalen Zustand einer starken Meinung."}</p>{voteTarget && !validVoteTarget && <div className={styles.invalidHint}>Dieses Profil ist nicht mehr abstimmungsberechtigt. Bitte wähle neu.</div>}{view.ownVote ? <div className={styles.lockedVote}>STIMME VERRIEGELT · {getName(view,view.ownVote)}<small>Reue bleibt verfügbar. Änderungen nicht.</small></div> : <button className={styles.primaryButton} disabled={view.phase !== "voting_open" || !validVoteTarget} onClick={() => void controller.submitVote(voteTarget)}>Stimme verriegeln</button>}</div>}</Card>
      {view.ownRole === "millionaire" && round.resultPublished && round.result?.millionaireSurvived && view.currentRound < view.totalRounds && <Card eyebrow="Nächste Deckung" title="Rolle behalten?"><p>Sie wurden nicht enttarnt. Das kann Kompetenz gewesen sein. Die Zentrale vermeidet vorschnelle Schlussfolgerungen.</p><div className={styles.roleDecision}><button onClick={() => void controller.submitRoleDecision("keep")}>Deckung behalten</button><button onClick={() => void controller.submitRoleDecision("transfer")}>Zufällig weitergeben</button></div></Card>}
      <Card id="log" eyebrow="Einsatzakte" title="Persönliches Protokoll"><EventList events={view.notifications} />{(view.personalHistory ?? []).length > 0 && <div className={styles.historyTable}>{view.personalHistory?.map((entry) => <div key={entry.roundNumber}><b>Runde {entry.roundNumber}</b><span>{entry.role === "millionaire" ? "Millionär" : entry.role === "investigator" ? "Ermittler" : "Außer Wertung"}</span><span>{entry.voteTargetId ? `Stimme: ${getName(view,entry.voteTargetId)}` : "Keine Stimme"}</span><strong>{entry.pointsAwarded >= 0 ? "+" : ""}{entry.pointsAwarded} Punkte</strong></div>)}</div>}</Card>
    </div>
    {revealOpen && round.result && <RevealOverlay view={view} round={round} onClose={() => setRevealOpen(false)} />}{finalOpen && view.finalResult && <FinalOverlay view={view} onClose={() => setFinalOpen(false)} />}
  </DashboardShell>;
}

function RevealOverlay({ view, round, onClose, onPublish }: { view: MetaGameView; round: MetaRoundState; onClose(): void; onPublish?: () => void }) {
  const result = round.result!;
  const [step, setStep] = useState(0);
  const lines = ["Die Stimmen sind verriegelt.",result.effect?.kind && result.effect.kind !== "none" ? `Missionsfolge aktiv: ${result.effect.title}` : "Keine Missionsfolge verändert die Stimmen.",result.tieResolvedBy === "lot" ? "Gleichstand. Das Los übernimmt die Verantwortung." : "Das Ergebnis ist eindeutig. Unangenehm, aber eindeutig.",`${getName(view,result.eliminatedId)} erhält die meisten wirksamen Stimmen.`,result.millionaireSurvived ? "Der Millionär überlebt die Runde." : "Der Millionär wurde enttarnt.",result.millionaireSurvived ? `${getName(view,result.millionaireId)} bleibt als Millionär im Spiel.` : `${getName(view,result.millionaireId)} war der Millionär.`];
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(lines.length - 1);
      return;
    }
    if (step >= lines.length - 1) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(lines.length - 1, current + 1)), 1750);
    return () => window.clearTimeout(timer);
  }, [step, lines.length]);
  const sortedTally = [...result.effectiveTally].sort((left, right) => right.effectiveVotes - left.effectiveVotes || getName(view,left.memberId).localeCompare(getName(view,right.memberId), "de"));
  return <Overlay classification={`AUSWERTUNG · RUNDE ${view.currentRound}`} title="Die Stimmen werden geöffnet" onClose={onClose} dramatic><div className={styles.revealSequence}>{lines.map((line,index) => <div key={line} className={step >= index ? styles.revealed : ""}><span>0{index+1}</span><p>{line}</p></div>)}</div>{step < lines.length - 1 && <button className={styles.ghostButton} onClick={() => setStep(lines.length - 1)}>Auswertung sofort anzeigen</button>}<div className={styles.tally}>{sortedTally.map((entry) => <div key={entry.memberId}><span>{getName(view,entry.memberId)}{entry.adjustment !== 0 && <small className={styles.tallyAdjustment}>{entry.adjustment > 0 ? ` +${entry.adjustment}` : ` ${entry.adjustment}`} Effekt</small>}</span><i style={{ "--votes": Math.max(0,entry.effectiveVotes) } as React.CSSProperties} /><b>{entry.effectiveVotes}</b></div>)}</div><p className={styles.darkJoke}>Die Zentrale gratuliert allen korrekten Entscheidungen. Die übrigen wurden ebenfalls gespeichert.</p>{onPublish && <button className={styles.primaryButton} onClick={onPublish}>Abschlussbericht freigeben</button>}</Overlay>;
}

function FinalOverlay({ view, onClose }: { view: MetaGameView; onClose(): void }) {
  const final = view.finalResult!;
  const ranked = [...final.leaderboard].sort((left, right) => {
    const leftEligible = view.members.find((member) => member.id === left.memberId)?.competitionStatus === "eligible" ? 1 : 0;
    const rightEligible = view.members.find((member) => member.id === right.memberId)?.competitionStatus === "eligible" ? 1 : 0;
    return rightEligible - leftEligible || right.points - left.points || right.correctGuesses - left.correctGuesses;
  });
  return <Overlay classification="ARCHIV MIDAS" title="Die Operation ist beendet" onClose={onClose} dramatic><div className={styles.finalWinner}><MidasMark /><span>Gewinnerakte</span><h3>{getName(view,final.winnerId)}</h3><p>{final.reason === "final_millionaire_survived" ? "Der Millionär hat die letzte Einsatzphase überlebt." : "Die Gesamtwertung der verbliebenen Spieler entscheidet."}</p></div><div className={styles.leaderboard}>{ranked.map((entry,index) => { const member = view.members.find((candidate) => candidate.id === entry.memberId); const eligible = member?.competitionStatus === "eligible"; return <div key={entry.memberId} className={!eligible ? styles.ineligibleRank : ""}><b>#{index+1}</b><span>{getName(view,entry.memberId)}</span><strong>{entry.points} Punkte</strong><small>{entry.correctGuesses} richtige Verdächtigungen{!eligible ? " · außer Wertung" : ""}</small></div>; })}</div><div className={styles.finalTimeline}>{final.timeline.map((entry) => <article key={entry.roundNumber}><div><span>AKTE R{entry.roundNumber}</span><strong>{entry.roundNumber} Punkte</strong></div><h4>Millionär: {getName(view,entry.millionaireId)}</h4><p><b>Auftrag:</b> {entry.mission?.title ?? "Kein Auftrag"} · {entry.missionStatus === "completed" ? "erfüllt" : entry.missionStatus === "failed" ? "gescheitert" : "neutral"}</p><p><b>Aus der Wertung:</b> {getName(view,entry.eliminatedId)}{entry.winningTeam ? ` · Feldoperation: Sektor ${entry.winningTeam === "azur" ? "Azur" : "Gold"}` : ""}</p><div className={styles.finalVotes}>{entry.votes.length === 0 ? <small>Keine Stimmen abgegeben.</small> : entry.votes.map((vote) => <span key={`${entry.roundNumber}-${vote.voterId}`}>{getName(view,vote.voterId)} → {getName(view,vote.targetId)}</span>)}</div><div className={styles.finalScores}>{entry.scores.map((score) => <span key={`${entry.roundNumber}-${score.memberId}`}>{getName(view,score.memberId)}: {score.pointsAwarded >= 0 ? "+" : ""}{score.pointsAwarded}{score.correctGuess ? " ✓" : ""}</span>)}</div></article>)}</div><p className={styles.finalLine}>Das Vermögen wurde gefunden. Die Würde bleibt vermisst.</p><small>Persönliche Ermittlungsnotizen bleiben privat. Selbst die Zentrale hat Grenzen. Einige davon sind rechtlich bedingt.</small></Overlay>;
}

export default function AkteMidasApp() {
  const controller = useMetaGame();
  const [introSeen,setIntroSeen] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(INTRO_STORAGE_KEY) === "seen");
  const briefingKey = controller.identity ? `secret-millionaer.akte-midas.briefing.${controller.identity.gameId}.${controller.identity.accessRole}` : "";
  const [briefingSeen,setBriefingSeen] = useState(false);
  const [briefingReady,setBriefingReady] = useState(false);
  useEffect(() => {
    if (!briefingKey || typeof window === "undefined") { setBriefingReady(false); return; }
    setBriefingSeen(window.localStorage.getItem(briefingKey) === "seen");
    setBriefingReady(true);
  },[briefingKey]);
  function closeIntro() { window.localStorage.setItem(INTRO_STORAGE_KEY,"seen"); setIntroSeen(true); }
  function closeBriefing() { if (briefingKey) window.localStorage.setItem(briefingKey,"seen"); setBriefingSeen(true); }
  if (!controller.ready || (controller.loading && !controller.identity)) return <main className={styles.loading}><MidasMark /><p>Sichere Verbindung wird hergestellt …</p><small>Vertrauen weiterhin deaktiviert.</small></main>;
  if (!controller.identity || !controller.view) return introSeen ? <EntryScreen controller={controller} /> : <IntroSequence onClose={closeIntro} />;
  const dashboard = controller.view.isHost ? <HostDashboard view={controller.view} controller={controller} /> : <PlayerDashboard view={controller.view} controller={controller} />;
  return <>{dashboard}{briefingReady && !briefingSeen && <OperationBriefing isHost={controller.view.isHost} onClose={closeBriefing} />}</>;
}
