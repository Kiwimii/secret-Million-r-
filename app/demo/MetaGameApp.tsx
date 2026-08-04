"use client";

import { useEffect, useState } from "react";
import { useMetaGame } from "@/lib/meta/useMetaGame";
import type {
  EffectDefinition,
  EffectKind,
  MetaEvent,
  MetaGameView,
  MetaMember,
  MetaRoundState,
  RoundPackageInput,
  TeamCode,
} from "@/lib/meta/types";
import styles from "./meta-game.module.css";

const PHASE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  round_setup: "Runde wird vorbereitet",
  role_released: "Rollen verfügbar",
  mission: "Geheime Mission läuft",
  challenge: "Team-Challenge",
  mission_review: "Mission bewertet",
  voting_open: "Abstimmung geöffnet",
  reveal_ready: "Auswertung bereit",
  report: "Rundenbericht",
  role_decision: "Rollenentscheidung",
  finished: "Spiel beendet",
};

const EFFECT_OPTIONS: Array<{ value: EffectKind; label: string; selectionMode: EffectDefinition["selectionMode"] }> = [
  { value: "none", label: "Kein Effekt", selectionMode: "none" },
  { value: "double_own_vote", label: "Eigene Stimme doppelt", selectionMode: "none" },
  { value: "block_voter", label: "Eine fremde Stimme blockieren", selectionMode: "voter" },
  { value: "redirect_vote", label: "Eine Stimme umleiten", selectionMode: "source_and_target" },
  { value: "add_vote", label: "Zusätzliche Schattenstimme", selectionMode: "target" },
  { value: "remove_self_vote", label: "Eine Stimme gegen sich entfernen", selectionMode: "none" },
  { value: "points_bonus", label: "Punktebonus", selectionMode: "none" },
  { value: "points_penalty", label: "Punktmalus", selectionMode: "none" },
];

const DEFAULT_PACKAGE: RoundPackageInput = {
  mission: {
    title: "Das stille Bündnis",
    task: "Bringe zwei Mitspieler dazu, unabhängig voneinander denselben Verdacht öffentlich zu äußern.",
    successCriteria: "Beide Personen nennen denselben Namen, ohne dass du die Mission offenlegst.",
    timeWindow: "Bis zum Ende der Team-Challenge",
  },
  bonus: {
    kind: "double_own_vote",
    title: "Goldenes Gewicht",
    description: "Deine eigene Stimme zählt bei Erfolg doppelt.",
    selectionMode: "none",
  },
  malus: {
    kind: "points_penalty",
    title: "Riss in der Tarnung",
    description: "Bei Misserfolg wird dir ein Punkt abgezogen.",
    amount: 1,
    selectionMode: "none",
  },
  challenge: {
    title: "Operation Gleichgewicht",
    briefing: "Beide Teams absolvieren dieselbe Aufgabe. Kommunikation und saubere Rollenverteilung entscheiden.",
    winCondition: "Das Team gewinnt, das die Aufgabe zuerst regelkonform abschließt.",
    duration: "15–25 Minuten",
    material: "Vom Spielleiter abhängig",
    safety: "Keine riskanten Aktionen oder körperlichen Kontakte erzwingen.",
  },
};

function getName(view: MetaGameView, id?: string) {
  return view.members.find((member) => member.id === id)?.displayName ?? "Unbekannt";
}

function memberStatus(member: MetaMember) {
  if (member.attendanceStatus === "departed") return "Abgereist";
  if (member.attendanceStatus === "temporarily_absent") return "Abwesend";
  if (member.competitionStatus === "disqualified") return "Disqualifiziert";
  if (member.competitionStatus === "eliminated") return "Ausgeschieden";
  return "Aktiv";
}

function effectFromKind(kind: EffectKind, previous: EffectDefinition): EffectDefinition {
  const option = EFFECT_OPTIONS.find((entry) => entry.value === kind) ?? EFFECT_OPTIONS[0];
  return { ...previous, kind, selectionMode: option.selectionMode };
}

function Card({ id, eyebrow, title, children, action }: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={styles.card} id={id}>
      <div className={styles.cardHeader}>
        <div><span>{eyebrow}</span><h2>{title}</h2></div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Overlay({ title, children, onClose, dramatic = false }: {
  title: string;
  children: React.ReactNode;
  onClose(): void;
  dramatic?: boolean;
}) {
  return (
    <div className={`${styles.overlay} ${dramatic ? styles.dramatic : ""}`} role="dialog" aria-modal="true">
      <div className={styles.overlayPanel}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Fenster schließen">×</button>
        <div className={styles.seal}>SM</div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function NotificationBell({ events, open, onToggle, onRead }: {
  events: MetaEvent[];
  open: boolean;
  onToggle(): void;
  onRead(): void;
}) {
  const unread = events.filter((event) => !event.read).length;
  return (
    <div className={styles.bellWrap}>
      <button className={styles.bell} onClick={() => { onToggle(); if (!open) onRead(); }} aria-label="Benachrichtigungen">
        🔔{unread > 0 && <b>{unread}</b>}
      </button>
      {open && (
        <div className={styles.notificationDrawer}>
          <div className={styles.drawerHeader}><strong>Nachrichten</strong><button onClick={onToggle}>×</button></div>
          {events.length === 0 ? <p className={styles.muted}>Noch keine Meldungen.</p> : events.map((event) => (
            <article key={event.id} className={`${styles.notification} ${styles[event.severity]}`}>
              <span>{event.roundNumber ? `Runde ${event.roundNumber}` : "Partie"}</span>
              <strong>{event.title}</strong>
              <p>{event.body}</p>
              <small>{new Date(event.createdAt).toLocaleString("de-DE")}</small>
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
  const [title, setTitle] = useState("Secret Millionär");
  const [rounds, setRounds] = useState(4);
  const [finalRule, setFinalRule] = useState<"classic" | "points">("classic");
  const [notesVisibility, setNotesVisibility] = useState<"host" | "private">("host");
  const [localError, setLocalError] = useState<string>();

  async function execute(action: () => Promise<void>) {
    setLocalError(undefined);
    try { await action(); } catch (error) { setLocalError(error instanceof Error ? error.message : "Aktion fehlgeschlagen."); }
  }

  return (
    <main className={styles.entry}>
      <div className={styles.entryGlow} />
      <section className={styles.entryPanel}>
        <div className={styles.heroSeal}>SM</div>
        <p className={styles.kicker}>Midnight Fortune · Live Experience</p>
        <h1>Secret <span>Millionär</span></h1>
        <p className={styles.lead}>Ein dauerhaftes Dashboard, geheime Rollen, Team-Challenges und eine kontrollierte Enthüllung.</p>
        <div className={styles.modeTabs}>
          <button className={mode === "join" ? styles.activeTab : ""} onClick={() => setMode("join")}>Beitreten</button>
          <button className={mode === "create" ? styles.activeTab : ""} onClick={() => setMode("create")}>Partie erstellen</button>
          <button className={mode === "resume" ? styles.activeTab : ""} onClick={() => setMode("resume")}>Spielleitung fortsetzen</button>
        </div>

        {mode === "join" && (
          <form onSubmit={(event) => { event.preventDefault(); void execute(() => controller.joinGame({ code, name, pin })); }} className={styles.formStack}>
            <label>Zugangscode<input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" /></label>
            <label>Spielername<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" /></label>
            <label>Profil-PIN<input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" /></label>
            <button className={styles.primaryButton} disabled={controller.loading}>Session beitreten</button>
          </form>
        )}

        {mode === "create" && (
          <form onSubmit={(event) => { event.preventDefault(); void execute(() => controller.createGame({ title, pin, totalRounds: rounds, finalRule, notesVisibility })); }} className={styles.formStack}>
            <label>Spielname<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <div className={styles.twoColumns}>
              <label>Runden<select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>{[2,3,4,5,6,7,8].map((n) => <option key={n}>{n}</option>)}</select></label>
              <label>Spielleiter-PIN<input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" /></label>
            </div>
            <label>Finalregel<select value={finalRule} onChange={(e) => setFinalRule(e.target.value as "classic" | "points")}><option value="classic">Klassisch: Final-Millionär kann direkt gewinnen</option><option value="points">Reine Gesamtpunkte</option></select></label>
            <label>Notizen<select value={notesVisibility} onChange={(e) => setNotesVisibility(e.target.value as "host" | "private")}><option value="host">Nur für dich und die Spielleitung sichtbar</option><option value="private">Nur für den jeweiligen Spieler sichtbar</option></select></label>
            <button className={styles.primaryButton} disabled={controller.loading}>Partie erstellen</button>
          </form>
        )}

        {mode === "resume" && (
          <form onSubmit={(event) => { event.preventDefault(); void execute(() => controller.resumeHost(code, pin)); }} className={styles.formStack}>
            <label>Zugangscode<input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></label>
            <label>Spielleiter-PIN<input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} /></label>
            <button className={styles.primaryButton} disabled={controller.loading}>Kontrollzentrum öffnen</button>
          </form>
        )}
        {(localError || controller.error) && <div className={styles.error}>{localError ?? controller.error}</div>}
      </section>
    </main>
  );
}

function DashboardShell({ view, controller, children }: {
  view: MetaGameView;
  controller: ReturnType<typeof useMetaGame>;
  children: React.ReactNode;
}) {
  const [bellOpen, setBellOpen] = useState(false);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const popup = view.notifications.find((event) => !event.read && event.severity === "critical" && !dismissed.includes(event.id));
  return (
    <main className={styles.app}>
      <header className={styles.topbar}>
        <div><span className={styles.kicker}>Secret Millionär</span><h1>{view.title}</h1></div>
        <div className={styles.topbarMeta}>
          <div><small>Runde</small><strong>{view.currentRound}/{view.totalRounds}</strong></div>
          <div><small>Status</small><strong>{PHASE_LABELS[view.phase]}</strong></div>
          <NotificationBell events={view.notifications} open={bellOpen} onToggle={() => setBellOpen(!bellOpen)} onRead={() => void controller.markNotificationsRead()} />
          <button className={styles.ghostButton} onClick={() => void controller.clearSession()}>Verlassen</button>
        </div>
      </header>
      {controller.error && <div className={styles.errorBar}>{controller.error}<button onClick={() => void controller.refresh()}>Neu laden</button></div>}
      <nav className={styles.anchorNav}>
        <a href="#overview">Übersicht</a><a href="#players">Teilnehmer</a><a href="#role">Rolle</a><a href="#mission">Mission</a><a href="#challenge">Challenge</a><a href="#vote">Abstimmung</a><a href="#log">Protokoll</a>
      </nav>
      {children}
      {popup && (
        <Overlay title={popup.title} onClose={() => setDismissed([...dismissed, popup.id])}>
          <p>{popup.body}</p>
          <small>Die Meldung bleibt zusätzlich über die Glocke abrufbar.</small>
        </Overlay>
      )}
    </main>
  );
}

function EffectEditor({ label, value, onChange }: { label: string; value: EffectDefinition; onChange(value: EffectDefinition): void }) {
  return (
    <div className={styles.effectEditor}>
      <h4>{label}</h4>
      <label>Mechanik<select value={value.kind} onChange={(e) => onChange(effectFromKind(e.target.value as EffectKind, value))}>{EFFECT_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      <label>Titel<input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></label>
      <label>Beschreibung<textarea value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} /></label>
      {(value.kind === "points_bonus" || value.kind === "points_penalty") && <label>Punktwert<input type="number" min={1} max={8} value={value.amount ?? 1} onChange={(e) => onChange({ ...value, amount: Number(e.target.value) })} /></label>}
    </div>
  );
}

function HostDashboard({ view, controller }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame> }) {
  const round = view.currentRoundState;
  const [roundPackage, setRoundPackage] = useState<RoundPackageInput>(DEFAULT_PACKAGE);
  const [revealOpen, setRevealOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();

  useEffect(() => {
    setRoundPackage({
      mission: round.mission ?? DEFAULT_PACKAGE.mission,
      bonus: round.bonus ?? DEFAULT_PACKAGE.bonus,
      malus: round.malus ?? DEFAULT_PACKAGE.malus,
      challenge: round.challenge ?? DEFAULT_PACKAGE.challenge,
    });
  }, [view.currentRound, round.mission, round.bonus, round.malus, round.challenge]);

  useEffect(() => { if (view.phase === "reveal_ready" || (round.result && !round.resultPublished)) setRevealOpen(true); }, [view.phase, round.result, round.resultPublished]);
  useEffect(() => { if (view.phase === "finished") setFinalOpen(true); }, [view.phase]);

  async function run(name: string, action: () => Promise<void>) {
    setBusyAction(name);
    try { await action(); } finally { setBusyAction(undefined); }
  }

  const activeCandidates = view.members.filter((m) => m.attendanceStatus === "present" && m.competitionStatus === "eligible" && m.activeFromRound <= view.currentRound);
  const submitted = activeCandidates.filter((m) => m.voteSubmitted).length;
  const millionaireName = getName(view, round.millionaireId);

  return (
    <DashboardShell view={view} controller={controller}>
      <div className={styles.hostHero} id="overview">
        <div><span>Kontrollzentrum</span><h2>Runde {view.currentRound} · {view.currentRound} Punkte</h2><p>Du steuerst Freigaben und Ergebnisse. Kein einzelner Spieler kann den Ablauf blockieren.</p></div>
        <div className={styles.codeBox}><small>Zugangscode</small><strong>{view.joinCode}</strong><button onClick={() => void navigator.clipboard?.writeText(view.joinCode)}>Kopieren</button></div>
      </div>

      <div className={styles.hostGrid}>
        <div className={styles.mainColumn}>
          <Card eyebrow="Instanz" title="Spielstatus" action={<button className={styles.ghostButton} onClick={() => void run("join", () => controller.setAcceptingPlayers(!view.acceptingPlayers))}>{view.acceptingPlayers ? "Beitritt schließen" : "Beitritt öffnen"}</button>}>
            <div className={styles.metrics}>
              <div><span>Aktive Kandidaten</span><strong>{activeCandidates.length}</strong></div>
              <div><span>Stimmen</span><strong>{submitted}/{activeCandidates.length}</strong></div>
              <div><span>Millionär</span><strong>{round.millionaireId ? millionaireName : "Nicht ausgelost"}</strong></div>
              <div><span>Revision</span><strong>{view.revision}</strong></div>
            </div>
          </Card>

          <Card eyebrow="Vorbereitung" title="Rundenpaket">
            <div className={styles.packageGrid}>
              <div className={styles.formStack}>
                <h3>Geheime Mission</h3>
                <label>Titel<input value={roundPackage.mission.title} onChange={(e) => setRoundPackage({ ...roundPackage, mission: { ...roundPackage.mission, title: e.target.value } })} /></label>
                <label>Aufgabe<textarea value={roundPackage.mission.task} onChange={(e) => setRoundPackage({ ...roundPackage, mission: { ...roundPackage.mission, task: e.target.value } })} /></label>
                <label>Erfolgskriterium<textarea value={roundPackage.mission.successCriteria} onChange={(e) => setRoundPackage({ ...roundPackage, mission: { ...roundPackage.mission, successCriteria: e.target.value } })} /></label>
                <label>Zeitfenster<input value={roundPackage.mission.timeWindow} onChange={(e) => setRoundPackage({ ...roundPackage, mission: { ...roundPackage.mission, timeWindow: e.target.value } })} /></label>
              </div>
              <div className={styles.formStack}>
                <h3>Team-Challenge</h3>
                <label>Titel<input value={roundPackage.challenge.title} onChange={(e) => setRoundPackage({ ...roundPackage, challenge: { ...roundPackage.challenge, title: e.target.value } })} /></label>
                <label>Briefing<textarea value={roundPackage.challenge.briefing} onChange={(e) => setRoundPackage({ ...roundPackage, challenge: { ...roundPackage.challenge, briefing: e.target.value } })} /></label>
                <label>Siegbedingung<textarea value={roundPackage.challenge.winCondition} onChange={(e) => setRoundPackage({ ...roundPackage, challenge: { ...roundPackage.challenge, winCondition: e.target.value } })} /></label>
                <label>Dauer<input value={roundPackage.challenge.duration ?? ""} onChange={(e) => setRoundPackage({ ...roundPackage, challenge: { ...roundPackage.challenge, duration: e.target.value } })} /></label>
              </div>
            </div>
            <div className={styles.packageGrid}><EffectEditor label="Bonus bei Erfolg" value={roundPackage.bonus} onChange={(bonus) => setRoundPackage({ ...roundPackage, bonus })} /><EffectEditor label="Malus bei Misserfolg" value={roundPackage.malus} onChange={(malus) => setRoundPackage({ ...roundPackage, malus })} /></div>
            <button className={styles.primaryButton} disabled={!['lobby','round_setup'].includes(view.phase) || busyAction === "configure"} onClick={() => void run("configure", () => controller.configureRound(roundPackage))}>Rundenpaket speichern</button>
          </Card>

          <Card eyebrow="Ablauf" title="Zentrale Rundensteuerung">
            <div className={styles.controlFlow}>
              <button onClick={() => void run("draw", () => controller.drawMillionaire(Boolean(round.millionaireId)))} disabled={!['lobby','round_setup'].includes(view.phase)}>{round.millionaireId ? "Notfall: neu auslosen" : "Millionär zufällig auslosen"}</button>
              <button onClick={() => void run("roles", () => controller.releaseRoles())} disabled={!round.millionaireId || Boolean(round.roleReleased)}>Rollen freigeben</button>
              <button onClick={() => void run("mission", () => controller.publishMission())} disabled={!round.roleReleased || Boolean(round.missionPublished)}>Mission ausgeben</button>
              <button onClick={() => void run("teams", () => controller.drawTeams())} disabled={!round.missionPublished || Boolean(round.challengePublished)}>Teams & Challenge veröffentlichen</button>
              <button onClick={() => void run("missionok", () => controller.setMissionStatus("completed"))} disabled={!round.challengePublished}>Mission erfüllt</button>
              <button onClick={() => void run("missionfail", () => controller.setMissionStatus("failed"))} disabled={!round.challengePublished}>Mission gescheitert</button>
              <button onClick={() => void run("neutral", () => controller.setMissionStatus("neutral"))} disabled={!round.challengePublished}>Neutral abschließen</button>
              <button onClick={() => void run("voteopen", () => controller.openVoting())} disabled={!['completed','failed','neutral'].includes(round.missionStatus ?? "pending") || view.phase === "voting_open"}>Abstimmung öffnen</button>
              <button className={styles.dangerButton} onClick={() => void run("voteclose", () => controller.closeVoting())} disabled={view.phase !== "voting_open"}>Abstimmung schließen ({submitted}/{activeCandidates.length})</button>
              <button onClick={() => setRevealOpen(true)} disabled={!round.result}>Auszählung starten</button>
              <button onClick={() => void run("publish", () => controller.publishResult())} disabled={!round.result || Boolean(round.resultPublished)}>Ergebnis veröffentlichen</button>
              <button className={styles.primaryButton} onClick={() => void run("next", () => controller.advanceRound())} disabled={!round.resultPublished}>{view.currentRound === view.totalRounds ? "Großes Finale abschließen" : "Nächste Runde starten"}</button>
            </div>
            <p className={styles.muted}>Fehlende Stimmen verhindern den Abschluss nicht. Sie werden als nicht abgegeben dokumentiert und erhalten keine Punkte.</p>
          </Card>

          <Card id="challenge" eyebrow="Challenge" title="Teams und Ergebnis">
            {!round.challengePublished ? <p className={styles.placeholder}>Challenge und Teams sind noch nicht öffentlich.</p> : (
              <><h3>{round.challenge?.title}</h3><p>{round.challenge?.briefing}</p><div className={styles.teamGrid}><TeamPanel team="azur" view={view} round={round} /><TeamPanel team="gold" view={view} round={round} /></div><div className={styles.inlineActions}><button onClick={() => void controller.setChallengeWinner("azur")}>Team Azur gewinnt</button><button onClick={() => void controller.setChallengeWinner("gold")}>Team Gold gewinnt</button></div></>
            )}
          </Card>

          <Card id="vote" eyebrow="Abstimmung" title="Live-Monitor">
            <div className={styles.voteMonitor}>{activeCandidates.map((member) => <div key={member.id}><span className={styles.avatar}>{member.displayName[0]}</span><div><strong>{member.displayName}</strong><small>{member.voteSubmitted ? "Stimme eingeloggt" : "Noch offen"}</small></div><b className={member.voteSubmitted ? styles.ok : styles.wait}>{member.voteSubmitted ? "✓" : "…"}</b></div>)}</div>
          </Card>
        </div>

        <aside className={styles.sideColumn}>
          <Card id="players" eyebrow="Verwaltung" title="Teilnehmer">
            <div className={styles.memberAdminList}>{view.members.map((member) => <HostMemberRow key={member.id} member={member} controller={controller} />)}</div>
          </Card>
          {view.notesVisibility === "host" && <Card eyebrow="Moderationsmodus" title="Spielernotizen"><div className={styles.noteFeed}>{(view.hostNotes ?? []).length === 0 ? <p className={styles.muted}>Noch keine Notizen.</p> : view.hostNotes?.map((note, index) => <article key={`${note.authorMemberId}-${note.subjectMemberId}-${index}`}><strong>{getName(view, note.authorMemberId)} → {getName(view, note.subjectMemberId)}</strong><p>{note.note}</p></article>)}</div></Card>}
          <Card id="log" eyebrow="Ereignisse" title="Spielleiterprotokoll"><EventList events={view.notifications} /></Card>
        </aside>
      </div>

      {revealOpen && round.result && <RevealOverlay view={view} round={round} onClose={() => setRevealOpen(false)} onPublish={!round.resultPublished ? () => void controller.publishResult() : undefined} />}
      {finalOpen && view.finalResult && <FinalOverlay view={view} onClose={() => setFinalOpen(false)} />}
    </DashboardShell>
  );
}

function HostMemberRow({ member, controller }: { member: MetaMember; controller: ReturnType<typeof useMetaGame> }) {
  return (
    <div className={styles.hostMemberRow}>
      <span className={styles.avatar}>{member.displayName[0]}</span>
      <div><strong>{member.displayName}</strong><small>{memberStatus(member)} · ab Runde {member.activeFromRound}</small></div>
      <select value={member.attendanceStatus} onChange={(e) => void controller.setMemberStatus({ memberId: member.id, attendanceStatus: e.target.value as MetaMember["attendanceStatus"] })}><option value="present">Anwesend</option><option value="temporarily_absent">Abwesend</option><option value="departed">Abgereist</option></select>
      <select value={member.competitionStatus} onChange={(e) => void controller.setMemberStatus({ memberId: member.id, competitionStatus: e.target.value as MetaMember["competitionStatus"] })}><option value="eligible">Aktiv</option><option value="eliminated">Ausgeschieden</option><option value="disqualified">Disqualifiziert</option></select>
    </div>
  );
}

function TeamPanel({ team, view, round }: { team: TeamCode; view: MetaGameView; round: MetaRoundState }) {
  const members = view.members.filter((member) => round.teams?.[member.id] === team);
  return <div className={`${styles.teamPanel} ${team === "azur" ? styles.azur : styles.gold}`}><h4>Team {team === "azur" ? "Azur" : "Gold"}{round.winningTeam === team ? " · Sieger" : ""}</h4>{members.map((member) => <span key={member.id}>{member.displayName}{member.competitionStatus !== "eligible" ? " (außer Wertung)" : ""}</span>)}</div>;
}

function EventList({ events }: { events: MetaEvent[] }) {
  return <div className={styles.eventList}>{events.length === 0 ? <p className={styles.muted}>Noch keine Ereignisse.</p> : events.map((event) => <article key={event.id}><span>{event.roundNumber ? `R${event.roundNumber}` : "•"}</span><div><strong>{event.title}</strong><p>{event.body}</p><small>{new Date(event.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</small></div></article>)}</div>;
}

function ParticipantNotes({ view, controller }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame> }) {
  const ownNotes = new Map((view.ownNotes ?? []).map((note) => [note.subjectMemberId, note.note]));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return <div className={styles.participantGrid}>{view.members.filter((member) => member.id !== view.memberId).map((member) => {
    const value = drafts[member.id] ?? ownNotes.get(member.id) ?? "";
    return <article key={member.id} className={styles.participantCard}><div className={styles.participantHead}><span className={styles.avatar}>{member.displayName[0]}</span><div><strong>{member.displayName}</strong><small>{memberStatus(member)} · Einstieg R{member.joinedRound}</small></div></div><textarea value={value} onChange={(e) => setDrafts({ ...drafts, [member.id]: e.target.value })} placeholder="Private Beobachtung notieren …" /><button onClick={() => void controller.saveNote(member.id, value)}>Notiz speichern</button></article>;
  })}</div>;
}

function EffectSelection({ view, round, controller }: { view: MetaGameView; round: MetaRoundState; controller: ReturnType<typeof useMetaGame> }) {
  const effect = round.missionStatus === "completed" ? round.bonus : round.missionStatus === "failed" ? round.malus : undefined;
  const [voterId, setVoterId] = useState(round.effectSelection?.voterId ?? "");
  const [targetId, setTargetId] = useState(round.effectSelection?.targetId ?? "");
  if (!effect || effect.kind === "none" || effect.selectionMode === "none") return null;
  const voters = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.id !== view.memberId);
  return <div className={styles.effectSelection}><h4>Effekt konfigurieren: {effect.title}</h4>{["voter","source_and_target"].includes(effect.selectionMode ?? "") && <label>Betroffener Wähler<select value={voterId} onChange={(e) => setVoterId(e.target.value)}><option value="">Auswählen</option>{voters.map((m) => <option value={m.id} key={m.id}>{m.displayName}</option>)}</select></label>}{["target","source_and_target"].includes(effect.selectionMode ?? "") && <label>Neues Ziel<select value={targetId} onChange={(e) => setTargetId(e.target.value)}><option value="">Auswählen</option>{voters.map((m) => <option value={m.id} key={m.id}>{m.displayName}</option>)}</select></label>}<button onClick={() => void controller.setEffectSelection({ voterId, targetId })}>Auswahl speichern</button></div>;
}

function PlayerDashboard({ view, controller }: { view: MetaGameView; controller: ReturnType<typeof useMetaGame> }) {
  const round = view.currentRoundState;
  const currentMember = view.members.find((member) => member.id === view.memberId);
  const candidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound && member.id !== view.memberId);
  const [voteTarget, setVoteTarget] = useState(view.ownVoteDraft ?? "");
  const [revealOpen, setRevealOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  useEffect(() => { setVoteTarget(view.ownVoteDraft ?? ""); }, [view.ownVoteDraft, view.currentRound]);
  useEffect(() => { if (round.resultPublished) setRevealOpen(true); }, [round.resultPublished, view.currentRound]);
  useEffect(() => { if (view.phase === "finished") setFinalOpen(true); }, [view.phase]);
  const canVote = currentMember?.attendanceStatus === "present" && currentMember.competitionStatus === "eligible" && currentMember.activeFromRound <= view.currentRound;
  const ownTeam = round.teams?.[view.memberId ?? ""];

  return (
    <DashboardShell view={view} controller={controller}>
      <div className={styles.playerHero} id="overview">
        <div><span>Dein Dashboard</span><h2>Runde {view.currentRound} · {view.currentRound} Punkte</h2><p>Alle Bereiche bleiben jederzeit erreichbar. Neue Freigaben erscheinen automatisch.</p></div>
        <div className={styles.personalScore}><small>Geheime Punkte</small><strong>{view.ownPoints ?? 0}</strong><span>{memberStatus(currentMember ?? view.members[0])}</span></div>
      </div>

      <div className={styles.playerGrid}>
        <Card eyebrow="Spiel" title="Allgemeine Übersicht"><div className={styles.rules}><p><strong>Ziel:</strong> Enttarne den geheimen Millionär oder überlebe selbst als Millionär.</p><p><strong>Punkte:</strong> Runde {view.currentRound} bringt {view.currentRound} Punkte. Fehlende Stimmen erhalten keine Punkte.</p><p><strong>Ausscheiden:</strong> Ausgeschiedene dürfen Challenges spielen, aber nicht mehr abstimmen, punkten oder Millionär werden.</p><p><strong>Aktueller Schritt:</strong> {PHASE_LABELS[view.phase]}</p></div></Card>

        <Card id="players" eyebrow="Ermittlung" title="Teilnehmer und Notizen" action={<span className={styles.privacyTag}>{view.notesVisibility === "host" ? "Für dich + Spielleitung" : "Nur für dich"}</span>}><ParticipantNotes view={view} controller={controller} /></Card>

        <Card id="role" eyebrow="Geheim" title="Eigene Rolle">
          {!round.roleReleased ? <p className={styles.placeholder}>Deine Rolle wurde noch nicht freigegeben.</p> : view.ownRole === "millionaire" ? <div className={styles.secretRole}><div className={styles.goldCrown}>♛</div><h3>Du bist der Millionär</h3><p>Bleibe unentdeckt, erfülle deine Mission und nutze den Effekt taktisch.</p></div> : view.ownRole === "investigator" ? <div className={styles.secretRole}><div className={styles.investigator}>⌕</div><h3>Du bist Ermittler</h3><p>Beobachte die Gruppe, dokumentiere Auffälligkeiten und stimme gezielt ab.</p></div> : <p className={styles.placeholder}>Du bist in dieser Runde nicht wettbewerbsberechtigt.</p>}
        </Card>

        <Card id="mission" eyebrow="Geheime Mission" title={view.ownRole === "millionaire" ? (round.mission?.title ?? "Wird vorbereitet") : "Nur für den Millionär"}>
          {view.ownRole !== "millionaire" ? <p className={styles.placeholder}>Nur der aktuelle Millionär kann Mission, Bonus und Malus sehen.</p> : !round.missionPublished ? <p className={styles.placeholder}>Die Spielleitung bereitet deine Mission vor.</p> : <div className={styles.missionPanel}><p>{round.mission?.task}</p><dl><div><dt>Erfolg</dt><dd>{round.mission?.successCriteria}</dd></div><div><dt>Zeitfenster</dt><dd>{round.mission?.timeWindow}</dd></div><div><dt>Bonus</dt><dd><strong>{round.bonus?.title}</strong> – {round.bonus?.description}</dd></div><div><dt>Malus</dt><dd><strong>{round.malus?.title}</strong> – {round.malus?.description}</dd></div><div><dt>Status</dt><dd>{round.missionStatus === "completed" ? "Erfüllt" : round.missionStatus === "failed" ? "Gescheitert" : round.missionStatus === "neutral" ? "Neutral" : "Läuft"}</dd></div></dl><EffectSelection view={view} round={round} controller={controller} /></div>}
        </Card>

        <Card id="challenge" eyebrow="Team-Challenge" title={round.challengePublished ? (round.challenge?.title ?? "Challenge") : "Wird vorbereitet"}>
          {!round.challengePublished ? <p className={styles.placeholder}>Challenge und Teams wurden noch nicht veröffentlicht.</p> : <><p>{round.challenge?.briefing}</p><div className={styles.challengeFacts}><span><b>Dein Team</b> {ownTeam ? `Team ${ownTeam === "azur" ? "Azur" : "Gold"}` : "Noch kein Team"}</span><span><b>Siegbedingung</b> {round.challenge?.winCondition}</span><span><b>Ergebnis</b> {round.winningTeam ? `Team ${round.winningTeam === "azur" ? "Azur" : "Gold"} gewinnt` : "Noch offen"}</span></div><div className={styles.teamGrid}><TeamPanel team="azur" view={view} round={round} /><TeamPanel team="gold" view={view} round={round} /></div></>}
        </Card>

        <Card id="vote" eyebrow="Dein Verdacht" title="Abstimmung">
          {!canVote ? <p className={styles.placeholder}>Du bist in dieser Runde nicht abstimmungsberechtigt.</p> : <div className={styles.voteCard}><label>Wen hältst du für den Millionär?<select value={voteTarget} disabled={Boolean(view.ownVote)} onChange={(e) => { setVoteTarget(e.target.value); if (e.target.value) void controller.saveVoteDraft(e.target.value); }}><option value="">Verdacht auswählen</option>{candidates.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label><p>{view.phase === "voting_open" ? "Die Abstimmung ist geöffnet. Dein Entwurf zählt erst nach dem verbindlichen Absenden." : "Du kannst deinen privaten Verdacht jederzeit vorbereiten. Eingeloggt wird er erst während der offenen Abstimmung."}</p>{view.ownVote ? <div className={styles.lockedVote}>✓ Stimme verbindlich eingeloggt: {getName(view, view.ownVote)}</div> : <button className={styles.primaryButton} disabled={view.phase !== "voting_open" || !voteTarget} onClick={() => void controller.submitVote(voteTarget)}>Stimme verbindlich abgeben</button>}</div>}
        </Card>

        {view.ownRole === "millionaire" && round.resultPublished && round.result?.millionaireSurvived && view.currentRound < view.totalRounds && <Card eyebrow="Nächste Runde" title="Willst du Millionär bleiben?"><div className={styles.roleDecision}><button onClick={() => void controller.submitRoleDecision("keep")}>Rolle behalten</button><button onClick={() => void controller.submitRoleDecision("transfer")}>Rolle zufällig weitergeben</button></div></Card>}

        <Card id="log" eyebrow="Persönliche Historie" title="Dein Spielprotokoll"><EventList events={view.notifications} />{(view.personalHistory ?? []).length > 0 && <div className={styles.historyTable}>{view.personalHistory?.map((entry) => <div key={entry.roundNumber}><b>Runde {entry.roundNumber}</b><span>{entry.role === "millionaire" ? "Millionär" : "Ermittler"}</span><span>{entry.voteTargetId ? `Stimme: ${getName(view, entry.voteTargetId)}` : "Keine Stimme"}</span><strong>{entry.pointsAwarded >= 0 ? "+" : ""}{entry.pointsAwarded} Punkte</strong></div>)}</div>}</Card>
      </div>

      {revealOpen && round.result && <RevealOverlay view={view} round={round} onClose={() => setRevealOpen(false)} />}
      {finalOpen && view.finalResult && <FinalOverlay view={view} onClose={() => setFinalOpen(false)} />}
    </DashboardShell>
  );
}

function RevealOverlay({ view, round, onClose, onPublish }: { view: MetaGameView; round: MetaRoundState; onClose(): void; onPublish?: () => void }) {
  const result = round.result!;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => Math.min(4, current + 1)), 1200);
    return () => window.clearInterval(timer);
  }, []);
  return <Overlay title={`Auszählung · Runde ${view.currentRound}`} onClose={onClose} dramatic><div className={styles.revealSequence}><div className={step >= 0 ? styles.revealed : ""}><span>01</span><p>Die Stimmen sind versiegelt.</p></div><div className={step >= 1 ? styles.revealed : ""}><span>02</span><p>{result.effect?.kind && result.effect.kind !== "none" ? `Effekt aktiv: ${result.effect.title}` : "Kein Stimmen-Effekt verändert die Auszählung."}</p></div><div className={step >= 2 ? styles.revealed : ""}><span>03</span><p>{result.tieResolvedBy === "lot" ? "Gleichstand – das Los hat entschieden." : "Das Ergebnis ist eindeutig."}</p></div><div className={step >= 3 ? styles.revealed : ""}><span>04</span><p><strong>{getName(view, result.eliminatedId)}</strong> erhält die meisten wirksamen Stimmen.</p></div><div className={step >= 4 ? styles.revealed : ""}><span>05</span><p>{result.millionaireSurvived ? `Der Millionär ${getName(view, result.millionaireId)} bleibt unenttarnt.` : `${getName(view, result.millionaireId)} war der Millionär und wurde enttarnt.`}</p></div></div><div className={styles.tally}>{result.effectiveTally.map((entry) => <div key={entry.memberId}><span>{getName(view, entry.memberId)}</span><b>{entry.effectiveVotes}</b></div>)}</div>{onPublish && <button className={styles.primaryButton} onClick={onPublish}>Ergebnis für alle veröffentlichen</button>}</Overlay>;
}

function FinalOverlay({ view, onClose }: { view: MetaGameView; onClose(): void }) {
  const final = view.finalResult!;
  return <Overlay title="Das große Finale" onClose={onClose} dramatic>
    <div className={styles.finalWinner}><span>Gewinner</span><h3>{getName(view, final.winnerId)}</h3><p>{final.reason === "final_millionaire_survived" ? "Der Millionär hat die Finalrunde überlebt." : "Die Gesamtwertung entscheidet."}</p></div>
    <div className={styles.leaderboard}>{final.leaderboard.map((entry, index) => <div key={entry.memberId}><b>#{index + 1}</b><span>{getName(view, entry.memberId)}</span><strong>{entry.points} Punkte</strong><small>{entry.correctGuesses} richtige Tipps</small></div>)}</div>
    <div className={styles.finalTimeline}>
      {final.timeline.map((entry) => <article key={entry.roundNumber}>
        <div><span>Runde {entry.roundNumber}</span><strong>{entry.roundNumber} Punkte</strong></div>
        <h4>Millionär: {getName(view, entry.millionaireId)}</h4>
        <p><b>Mission:</b> {entry.mission?.title ?? "Keine Mission"} · {entry.missionStatus === "completed" ? "erfüllt" : entry.missionStatus === "failed" ? "gescheitert" : "neutral"}</p>
        <p><b>Ausgeschieden:</b> {getName(view, entry.eliminatedId)}{entry.winningTeam ? ` · Challenge: Team ${entry.winningTeam === "azur" ? "Azur" : "Gold"}` : ""}</p>
        <div className={styles.finalVotes}>{entry.votes.length === 0 ? <small>Keine Stimmen abgegeben.</small> : entry.votes.map((vote) => <span key={`${entry.roundNumber}-${vote.voterId}`}>{getName(view, vote.voterId)} → {getName(view, vote.targetId)}</span>)}</div>
        <div className={styles.finalScores}>{entry.scores.map((score) => <span key={`${entry.roundNumber}-${score.memberId}`}>{getName(view, score.memberId)}: {score.pointsAwarded >= 0 ? "+" : ""}{score.pointsAwarded}{score.correctGuess ? " ✓" : ""}</span>)}</div>
      </article>)}
    </div>
    <p className={styles.muted}>Persönliche Ermittlungsnotizen bleiben auch im Finale privat.</p>
  </Overlay>;
}

export default function MetaGameApp() {
  const controller = useMetaGame();
  if (!controller.ready || (controller.loading && !controller.identity)) return <main className={styles.loading}><div className={styles.heroSeal}>SM</div><p>Spiel wird verbunden …</p></main>;
  if (!controller.identity || !controller.view) return <EntryScreen controller={controller} />;
  return controller.view.isHost ? <HostDashboard view={controller.view} controller={controller} /> : <PlayerDashboard view={controller.view} controller={controller} />;
}
