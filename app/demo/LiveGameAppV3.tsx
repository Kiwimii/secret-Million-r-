"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { ADVANTAGES, MISSIONS } from "@/lib/game/catalog";
import { CHALLENGES } from "@/lib/game/challenges";
import { PHASE_LABELS } from "@/lib/game/constants";
import { evaluateVotes } from "@/lib/game/voting";
import type {
  AdvantageEffect,
  AdvantageUse,
  GameState,
  RoundNumber,
  RoundPhase,
  TeamCode,
  Vote,
} from "@/lib/game/types";
import { useLiveGame } from "@/lib/live/useLiveGame";
import {
  useLiveRoundControl,
  type AdvantageConfiguration,
} from "@/lib/live/useLiveRoundControl";
import type { LiveLobbyMember, LivePrivateState } from "@/lib/live/types";
import GoldCrownCap from "./GoldCrownCap";

const ALL_PHASES: RoundPhase[] = [
  "lobby", "role_reveal", "mission", "challenge", "question", "discussion",
  "mission_review", "advantage", "voting", "evaluation", "result",
  "role_transfer", "finished",
];

const PHASE_STEPS = [
  { label: "Lobby", phases: ["lobby"] as RoundPhase[] },
  { label: "Rolle", phases: ["role_reveal"] as RoundPhase[] },
  { label: "Mission", phases: ["mission"] as RoundPhase[] },
  { label: "Challenge", phases: ["challenge"] as RoundPhase[] },
  { label: "Frage", phases: ["question"] as RoundPhase[] },
  { label: "Voting", phases: ["discussion", "mission_review", "advantage", "voting", "evaluation", "result", "role_transfer"] as RoundPhase[] },
  { label: "Finale", phases: ["finished"] as RoundPhase[] },
];

type ExtendedPrivateState = LivePrivateState & {
  challengeBriefingOpened?: boolean;
  advantageOpened?: boolean;
  advantage?: {
    catalog_id?: string;
    effect?: string;
    title_snapshot?: string;
    description_snapshot?: string;
    player_instructions_snapshot?: string;
    host_instructions_snapshot?: string;
    limit_snapshot?: string;
    selection_mode?: string;
    used_at?: string;
    expired_at?: string;
  };
};

function teamLabel(team?: TeamCode) {
  return team === "azur" ? "Team Azur" : team === "gold" ? "Team Gold" : "Noch kein Team";
}

function currentOverrideStep(phase: RoundPhase) {
  if (phase === "role_reveal") return "role";
  if (["mission", "mission_review"].includes(phase)) return "mission";
  if (phase === "advantage") return "advantage";
  if (phase === "challenge") return "challenge";
  if (phase === "voting") return "vote";
  if (phase === "role_transfer") return "role_decision";
  return "mission";
}

function Avatar({ member, large = false }: { member?: Pick<LiveLobbyMember, "displayName" | "avatarPath">; large?: boolean }) {
  const name = member?.displayName ?? "?";
  return (
    <span className={`mf3-avatar ${large ? "is-large" : ""}`}>
      {member?.avatarPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarPath} alt="" />
      ) : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ParticleField() {
  return (
    <div className="mf3-particles" aria-hidden="true">
      {Array.from({ length: 34 }, (_, index) => (
        <i key={index} style={{ "--particle-index": index } as CSSProperties} />
      ))}
    </div>
  );
}

function PhaseRail({ phase, round }: { phase: RoundPhase; round: RoundNumber }) {
  const active = Math.max(0, PHASE_STEPS.findIndex((step) => step.phases.includes(phase)));
  return (
    <div className="mf3-phase-rail" aria-label={`Runde ${round}, ${PHASE_LABELS[phase]}`}>
      {PHASE_STEPS.map((step, index) => (
        <div className={index === active ? "active" : index < active ? "done" : ""} key={step.label}>
          <span>{index < active ? "✓" : index + 1}</span><b>{step.label}</b>
        </div>
      ))}
    </div>
  );
}

async function resizeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei aus.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Das Bild darf höchstens 8 MB groß sein.");
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
  canvas.width = 320; canvas.height = 320;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Profilbild konnte nicht verarbeitet werden.");
  const crop = Math.min(image.naturalWidth, image.naturalHeight);
  context.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, 320, 320);
  return canvas.toDataURL("image/jpeg", 0.76);
}

function Intro({ onJoin, onCreate }: { onJoin(): void; onCreate(): void }) {
  return (
    <main className="mf3-intro">
      <ParticleField />
      <div className="mf3-intro-rays" aria-hidden="true"><i /><i /><i /></div>
      <div className="mf3-intro-content">
        <div className="mf3-seal"><span>SM</span><i /><i /></div>
        <p>Midnight Fortune · Live Experience</p>
        <h1>Secret <span>Millionär</span></h1>
        <strong>Einer von euch spielt ein anderes Spiel.</strong>
        <small>Geheime Rollen, parallele Mission, Team-Challenge und eine manipulierte Abstimmung.</small>
        <div>
          <button className="mf2-button mf2-button-primary" onClick={onJoin} type="button">Spiel beitreten</button>
          <button className="mf2-button mf2-button-ghost" onClick={onCreate} type="button">Partie als André leiten</button>
        </div>
      </div>
    </main>
  );
}

function AdvantageConfigPanel({
  selectionMode,
  members,
  value,
  onChange,
}: {
  selectionMode: string;
  members: LiveLobbyMember[];
  value: AdvantageConfiguration;
  onChange(next: AdvantageConfiguration): void;
}) {
  const eligible = members.filter((member) => member.attendanceStatus === "present" && member.winnerPoolStatus === "eligible");
  const voters = members.filter((member) => member.attendanceStatus === "present" && member.winnerPoolStatus !== "disqualified");
  const select = (label: string, key: keyof AdvantageConfiguration, options = eligible) => (
    <label className="mf3-field" key={key}>
      <span>{label}</span>
      <select value={value[key] ?? ""} onChange={(event) => onChange({ ...value, [key]: event.target.value || undefined })}>
        <option value="">Bitte auswählen</option>
        {options.map((member) => <option value={member.memberId} key={member.memberId}>{member.displayName}</option>)}
      </select>
    </label>
  );
  return (
    <div className="mf3-advantage-config">
      {["target", "target_and_voter", "two_targets", "source_and_target"].includes(selectionMode) && select(selectionMode === "source_and_target" ? "Endziel" : "Zielspieler", "targetMemberId")}
      {selectionMode === "two_targets" && select("Zweites Ziel", "secondaryTargetMemberId")}
      {selectionMode === "source_and_target" && select("Ausgangsziel", "sourceTargetMemberId")}
      {["voter", "target_and_voter"].includes(selectionMode) && select("Betroffener Wähler", "voterMemberId", voters)}
      {selectionMode === "tie_opponent" && select("Gleichstandsgegner", "tieOpponentMemberId")}
      {selectionMode === "none" && <p>Dieser Vorteil benötigt keine zusätzliche Zielauswahl.</p>}
    </div>
  );
}

export default function LiveGameAppV3() {
  const live = useLiveGame();
  const control = useLiveRoundControl(live.identity, live.summary, live.refresh);
  const [introVisible, setIntroVisible] = useState(true);
  const [entryMode, setEntryMode] = useState<"join" | "create" | "resumeHost">("join");
  const [hostPanel, setHostPanel] = useState<"overview" | "round" | "emergency">("overview");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [title, setTitle] = useState("Secret Millionär – Blaue Adria");
  const [avatar, setAvatar] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [roleOpen, setRoleOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [challengeAcknowledged, setChallengeAcknowledged] = useState(false);
  const [voteTarget, setVoteTarget] = useState("");
  const [missionRound, setMissionRound] = useState<RoundNumber>(1);
  const [missionId, setMissionId] = useState(MISSIONS[0]?.id ?? "");
  const [advantageId, setAdvantageId] = useState(ADVANTAGES[0]?.id ?? "");
  const [challengeId, setChallengeId] = useState(CHALLENGES[0]?.id ?? "");
  const [advantageConfig, setAdvantageConfig] = useState<AdvantageConfiguration>({});
  const [manualRound, setManualRound] = useState<RoundNumber>(1);
  const [manualPhase, setManualPhase] = useState<RoundPhase>("lobby");

  const summary = live.summary;
  const identity = live.identity;
  const privateState = live.privateState as ExtendedPrivateState | undefined;
  const currentMember = live.lobby.find((member) => member.memberId === identity?.memberId);
  const millionaire = live.playerProgress.find((player) => player.currentRole === "millionaire");
  const selectedMission = MISSIONS.find((entry) => entry.id === missionId) ?? MISSIONS[0];
  const selectedAdvantage = ADVANTAGES.find((entry) => entry.id === advantageId) ?? ADVANTAGES[0];
  const selectedChallenge = CHALLENGES.find((entry) => entry.id === challengeId) ?? CHALLENGES[0];
  const questioner = live.lobby.find((member) => member.memberId === control.publicFlow?.questionerMemberId);
  const winningMembers = live.lobby.filter((member) => member.challengeTeam === control.publicFlow?.winningTeam);

  useEffect(() => {
    setRoleOpen(false); setSecretOpen(false); setVoteTarget("");
    setChallengeAcknowledged(Boolean(privateState?.challengeBriefingOpened));
  }, [summary?.phase, summary?.currentRound, privateState?.challengeBriefingOpened]);

  useEffect(() => {
    const advantage = control.hostControl?.advantage;
    if (!advantage) return;
    setAdvantageConfig({
      targetMemberId: advantage.targetMemberId,
      secondaryTargetMemberId: advantage.secondaryTargetMemberId,
      sourceTargetMemberId: advantage.sourceTargetMemberId,
      voterMemberId: advantage.voterMemberId,
      tieOpponentMemberId: advantage.tieOpponentMemberId,
    });
  }, [control.hostControl?.advantage]);

  const blockers = useMemo(() => {
    if (!summary || identity?.accessRole !== "host") return [];
    const messages: string[] = [];
    if (live.lobby.length < 2) messages.push("Mindestens zwei Spieler müssen beigetreten sein.");
    if (summary.phase === "lobby" && !millionaire) messages.push("Der goldene Kronkorken wurde noch nicht ausgelost.");
    if (summary.phase === "lobby" && !live.missionSelections[summary.currentRound]) messages.push("Mission der aktuellen Runde fehlt.");
    if (summary.phase === "lobby" && !control.hostControl?.advantage) messages.push("Geheimer Vorteil der aktuellen Runde fehlt.");
    if (summary.phase === "role_reveal") {
      const missing = live.playerProgress.filter((player) => player.winnerPoolStatus === "eligible" && !player.roleRevealed);
      if (missing.length) messages.push(`${missing.length} Spieler haben ihre Rolle noch nicht geöffnet.`);
    }
    if (summary.phase === "mission" && !control.publicFlow?.teamsDrawn) messages.push("Vor dem Challenge-Start müssen die Teams ausgelost sein.");
    if (summary.phase === "challenge" && !control.publicFlow?.winningTeam) messages.push("André muss zuerst das Siegerteam bestätigen.");
    if (summary.phase === "question" && !control.publicFlow?.questionerMemberId) messages.push("Das Siegerteam muss einen Fragesteller bestimmen.");
    if (summary.phase === "question" && !control.publicFlow?.questionCompletedAt) messages.push("André muss Frage und Antwort abhaken.");
    if (summary.phase === "voting") {
      const missing = live.playerProgress.filter((player) => player.attendanceStatus === "present" && !player.voteSubmitted);
      if (missing.length) messages.push(`${missing.length} Stimmen fehlen noch.`);
    }
    return messages;
  }, [control.hostControl?.advantage, control.publicFlow, identity?.accessRole, live.lobby.length, live.missionSelections, live.playerProgress, millionaire, summary]);

  const voteEvaluation = useMemo(() => {
    if (!summary || identity?.accessRole !== "host" || !control.hostControl) return undefined;
    try {
      const players = live.playerProgress.map((player) => ({
        id: player.memberId,
        name: player.displayName,
        avatarUrl: player.avatarPath,
        registrationStatus: "registered" as const,
        attendanceStatus: player.attendanceStatus,
        winnerPoolStatus: player.winnerPoolStatus,
        role: player.currentRole,
        points: 0,
        correctGuesses: 0,
      }));
      const state = {
        id: summary.gameId,
        currentRound: summary.currentRound,
        phase: summary.phase,
        players,
        millionairePlayerId: millionaire?.memberId,
        revision: summary.revision,
        roundOutcomes: [],
      } as GameState;
      const votes = control.hostControl.votes.map((vote) => ({
        voterPlayerId: vote.voterMemberId,
        accusedPlayerId: vote.accusedMemberId,
        stage: vote.stage,
      })) as Vote[];
      const advantage = control.hostControl.advantage;
      const advantageUse: AdvantageUse | undefined = advantage?.usedAt && !advantage.expiredAt
        ? {
            advantageId: advantage.catalogId,
            effect: advantage.effect as AdvantageEffect,
            actorPlayerId: advantage.actorMemberId,
            targetPlayerId: advantage.targetMemberId,
            secondaryTargetPlayerId: advantage.secondaryTargetMemberId,
            sourceTargetPlayerId: advantage.sourceTargetMemberId,
            voterPlayerId: advantage.voterMemberId,
            tieOpponentPlayerId: advantage.tieOpponentMemberId,
          }
        : undefined;
      return { result: evaluateVotes(state, votes, { advantageUse, requireAllVotes: false }), error: undefined };
    } catch (caught) {
      return { result: undefined, error: caught instanceof Error ? caught.message : "Auswertung nicht möglich." };
    }
  }, [control.hostControl, identity?.accessRole, live.playerProgress, millionaire?.memberId, summary]);

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true);
    try { setAvatar(await resizeProfileImage(file)); }
    catch (caught) { setLocalError(caught instanceof Error ? caught.message : "Profilbild fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  async function handleEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLocalError(undefined); setNotice(undefined);
    if (pin.length !== 4) return setLocalError("Die PIN braucht genau vier Ziffern.");
    if (entryMode !== "resumeHost" && pin !== confirmPin) return setLocalError("Die beiden PINs unterscheiden sich.");
    setBusy(true);
    try {
      if (entryMode === "create") await live.createGame(title, pin);
      else if (entryMode === "resumeHost") await live.resumeHost(code, pin);
      else await live.joinGame(code, name, pin, avatar);
    } catch (caught) { setLocalError(caught instanceof Error ? caught.message : "Zugang fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  async function emergencyHome() {
    await live.clearSession();
    setIntroVisible(true); setEntryMode("join"); setLocalError(undefined); setNotice(undefined);
  }

  if (!live.ready || (live.loading && !identity)) {
    return <main className="mf3-loading"><ParticleField /><div className="mf3-seal"><span>SM</span><i /><i /></div><h1>Live-Partie wird synchronisiert.</h1><p>Rollen, Teams und Rundensteuerung werden geladen.</p></main>;
  }
  if (introVisible && !identity) return <Intro onJoin={() => { setEntryMode("join"); setIntroVisible(false); }} onCreate={() => { setEntryMode("create"); setIntroVisible(false); }} />;

  return (
    <main className={`mf2-app mf3-app phase-${summary?.phase ?? "entry"}`}>
      <ParticleField />
      <header className="mf3-header">
        <div className="mf3-brand"><div className="mf3-seal compact"><span>SM</span><i /><i /></div><div><strong>Secret Millionär</strong><span>Live-Ablauf · André steuert</span></div></div>
        {summary && <PhaseRail phase={summary.phase} round={summary.currentRound} />}
        <div className="mf3-header-actions">
          {summary && <b>{summary.joinCode}</b>}
          {identity && <button type="button" onClick={() => void control.reconnect()}>Sitzung wieder beitreten</button>}
          <button className="danger" type="button" onClick={() => void emergencyHome()}>Notfall: Startseite</button>
        </div>
      </header>

      {!identity && (
        <section className="mf3-entry">
          <div className="mf3-entry-copy"><p>Geheime Live-Partie</p><h1>Ein Spielstand.<span>Mehrere Geräte.</span></h1><strong>Spieler treten mit Name und PIN bei. André öffnet oder erstellt die Partie.</strong></div>
          <div className="mf3-entry-terminal">
            <nav><button className={entryMode === "join" ? "active" : ""} onClick={() => setEntryMode("join")} type="button">Beitreten</button><button className={entryMode === "create" ? "active" : ""} onClick={() => setEntryMode("create")} type="button">Neu als André</button><button className={entryMode === "resumeHost" ? "active" : ""} onClick={() => setEntryMode("resumeHost")} type="button">André wieder öffnen</button></nav>
            <form onSubmit={handleEntry}>
              {entryMode !== "create" && <label className="mf3-field"><span>Einladungscode</span><input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" required /></label>}
              {entryMode === "create" && <label className="mf3-field"><span>Name der Partie</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>}
              {entryMode === "join" && <div className="mf3-profile"><Avatar member={{ displayName: name || "?", avatarPath: avatar }} large /><label><span>Profilbild</span><input type="file" accept="image/*" capture="user" onChange={handleAvatar} /></label><label className="mf3-field"><span>Dein Name</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={28} required /></label></div>}
              <div className="mf3-pin-row"><label className="mf3-field"><span>{entryMode === "join" ? "Profil-PIN" : "André-PIN"}</span><input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} required /></label>{entryMode !== "resumeHost" && <label className="mf3-field"><span>PIN wiederholen</span><input type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} required /></label>}</div>
              {(localError || live.error || control.error) && <div className="mf3-error">{localError ?? live.error ?? control.error}</div>}
              <button className="mf2-button mf2-button-primary" disabled={busy} type="submit">{busy ? "Verbindung wird hergestellt …" : entryMode === "join" ? "Sitzung beitreten" : entryMode === "create" ? "Partie erstellen" : "André-Zugang öffnen"}</button>
            </form>
          </div>
        </section>
      )}

      {identity?.accessRole === "host" && summary && (
        <section className="mf3-workspace">
          <section className="mf3-host-hero">
            <div><p>André · Runde {summary.currentRound}</p><h1>{PHASE_LABELS[summary.phase]}</h1><span>Der normale Weiter-Button respektiert alle Voraussetzungen. Die Notfallsteuerung umgeht sie bewusst.</span><div className="mf3-main-actions">{!millionaire && <button className="mf2-button mf2-button-primary" onClick={() => void live.drawMillionaire()} type="button">Millionär auslosen</button>}<button className="mf2-button mf2-button-primary" disabled={blockers.length > 0 || summary.phase === "finished"} onClick={() => void live.advancePhase()} type="button">Nächste Phase starten</button><button className="mf2-button mf2-button-ghost" onClick={() => void control.reconnect()} type="button">Neu verbinden</button></div></div>
            <aside><small>Live-Code</small><strong>{summary.joinCode}</strong><span>{live.playerProgress.filter((player) => player.online).length}/{live.lobby.length} online</span></aside>
          </section>
          <nav className="mf3-host-nav"><button className={hostPanel === "overview" ? "active" : ""} onClick={() => setHostPanel("overview")} type="button">Übersicht</button><button className={hostPanel === "round" ? "active" : ""} onClick={() => setHostPanel("round")} type="button">Rundensteuerung</button><button className={hostPanel === "emergency" ? "active" : ""} onClick={() => setHostPanel("emergency")} type="button">Notfall</button></nav>
          {blockers.length > 0 && <section className="mf3-blockers"><strong>Noch nicht weiterschalten</strong>{blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</section>}

          {hostPanel === "overview" && <>
            <section className="mf3-panel"><header><div><p>Live-Monitor</p><h2>Spielerfortschritt</h2></div><span>André kann technische Blockaden einzeln übersteuern.</span></header><div className="mf3-progress-grid">{live.playerProgress.map((player) => <article key={player.memberId}><div className="mf3-person"><Avatar member={player} /><div><strong>{player.displayName}</strong><span>{player.online ? "Online" : "Offline"} · {teamLabel(player.challengeTeam)}</span></div></div><div className="mf3-progress-flags"><b className={player.roleRevealed ? "done" : ""}>Rolle</b><b className={player.missionOpened ? "done" : ""}>Mission</b><b className={player.advantageOpened ? "done" : ""}>Vorteil</b><b className={player.challengeBriefingOpened ? "done" : ""}>Challenge</b><b className={player.voteSubmitted ? "done" : ""}>Stimme</b></div><button type="button" onClick={() => void control.completePlayerStep(player.memberId, currentOverrideStep(summary.phase))}>Aktuellen Schritt manuell abschließen</button></article>)}</div></section>
            <section className="mf3-panel"><header><div><p>Teilnehmer</p><h2>Aktuelle Teams</h2></div><span>{control.publicFlow?.teamsDrawn ? "Teamzuteilung abgeschlossen" : "Noch nicht ausgelost"}</span></header><div className="mf3-team-columns"><div className="azur"><h3>Team Azur</h3>{live.lobby.filter((member) => member.challengeTeam === "azur").map((member) => <span key={member.memberId}><Avatar member={member} />{member.displayName}</span>)}</div><div className="gold"><h3>Team Gold</h3>{live.lobby.filter((member) => member.challengeTeam === "gold").map((member) => <span key={member.memberId}><Avatar member={member} />{member.displayName}</span>)}</div></div></section>
          </>}

          {hostPanel === "round" && <section className="mf3-round-grid">
            <article className="mf3-panel mf3-control-card"><p>1 · Mission + Vorteil</p><h2>Geheimes Paket versiegeln</h2><div className="mf3-round-pills">{([1,2,3,4] as const).map((round) => <button className={missionRound === round ? "active" : ""} onClick={() => setMissionRound(round)} type="button" key={round}>R{round}</button>)}</div><label className="mf3-field"><span>Mission</span><select value={missionId} onChange={(event) => setMissionId(event.target.value)}>{MISSIONS.map((mission) => <option value={mission.id} key={mission.id}>{mission.title} · {mission.difficulty}</option>)}</select></label><label className="mf3-field"><span>Geheimer Vorteil</span><select value={advantageId} onChange={(event) => setAdvantageId(event.target.value)}>{ADVANTAGES.map((advantage) => <option value={advantage.id} key={advantage.id}>{advantage.title} · {advantage.effect}</option>)}</select></label><div className="mf3-secret-preview"><strong>{selectedMission?.title}</strong><span>{selectedMission?.task}</span><strong>{selectedAdvantage?.title}</strong><span>{selectedAdvantage?.description}</span></div><button className="mf2-button mf2-button-primary" type="button" onClick={async () => { await live.selectMission(missionRound, missionId); await control.selectAdvantage(missionRound, advantageId); setNotice(`Mission und Vorteil für Runde ${missionRound} gespeichert.`); }}>Mission + Vorteil speichern</button>{control.hostControl?.mission && <div className="mf3-mission-review"><span>Status: <b>{control.hostControl.mission.status}</b></span><button className="success" onClick={() => void control.markMissionStatus(summary.currentRound, "completed")} type="button">Mission erfolgreich</button><button className="danger" onClick={() => void control.markMissionStatus(summary.currentRound, "failed")} type="button">Mission gescheitert</button></div>}{control.hostControl?.advantage?.usedAt && !control.hostControl.advantage.expiredAt && <div className="mf3-active-advantage"><p>Aktiver Vorteil</p><h3>{control.hostControl.advantage.title}</h3><span>{control.hostControl.advantage.hostInstructions}</span><AdvantageConfigPanel selectionMode={control.hostControl.advantage.selectionMode} members={live.lobby} value={advantageConfig} onChange={setAdvantageConfig} /><button className="mf2-button mf2-button-primary" onClick={() => void control.configureAdvantage(summary.currentRound, advantageConfig)} type="button">Vorteilskonfiguration speichern</button></div>}</article>

            <article className="mf3-panel mf3-control-card"><p>2 · Teams + Challenge</p><h2>{live.challenge?.title ?? "Challenge vorbereiten"}</h2><label className="mf3-field"><span>Challenge</span><select value={challengeId} onChange={(event) => setChallengeId(event.target.value)}>{CHALLENGES.map((challenge) => <option value={challenge.id} key={challenge.id}>{challenge.title} · {challenge.publicName}</option>)}</select></label><div className="mf3-secret-preview"><strong>{selectedChallenge?.title}</strong><span>{selectedChallenge?.playerBriefing}</span><small>{selectedChallenge?.winCondition}</small></div><div className="mf3-button-row"><button className="mf2-button mf2-button-ghost" onClick={() => void live.selectChallenge(summary.currentRound, challengeId)} type="button">Challenge speichern</button><button className="mf2-button mf2-button-primary" disabled={!live.challenge} onClick={() => void live.drawTeams(summary.currentRound)} type="button">Teams auslosen</button></div><div className={`mf3-prerequisite ${control.publicFlow?.teamsDrawn ? "done" : ""}`}><b>{control.publicFlow?.teamsDrawn ? "✓" : "!"}</b><span>{control.publicFlow?.teamsDrawn ? "Teams stehen fest – Challenge darf gestartet werden." : "Teamzuteilung ist Voraussetzung für den Challenge-Start."}</span></div>{summary.phase === "challenge" && <div className="mf3-winner-buttons"><button className="azur" disabled={!control.publicFlow?.teamsDrawn} onClick={() => void live.confirmChallengeWinner(summary.currentRound, "azur")} type="button">Team Azur gewinnt</button><button className="gold" disabled={!control.publicFlow?.teamsDrawn} onClick={() => void live.confirmChallengeWinner(summary.currentRound, "gold")} type="button">Team Gold gewinnt</button></div>}{control.publicFlow?.winningTeam && <div className={`mf3-winner-confirmed ${control.publicFlow.winningTeam}`}><strong>{teamLabel(control.publicFlow.winningTeam)} wurde bestätigt.</strong><span>Als Nächstes bestimmt das Siegerteam einen Fragesteller.</span></div>}{summary.phase === "question" && <div className="mf3-question-control"><p>Fragesteller</p><h3>{questioner?.displayName ?? "Noch nicht bestimmt"}</h3><button className={control.publicFlow?.questionCompletedAt ? "confirmed" : ""} disabled={!questioner || Boolean(control.publicFlow?.questionCompletedAt)} onClick={() => void control.completeQuestion(summary.currentRound)} type="button">{control.publicFlow?.questionCompletedAt ? "✓ Frage gestellt und beantwortet" : "Frage gestellt und beantwortet abhaken"}</button></div>}</article>

            {(summary.phase === "voting" || summary.phase === "evaluation") && <article className="mf3-panel mf3-control-card mf3-vote-control"><p>3 · Auswertung</p><h2>Stimmen inklusive Vorteil</h2>{control.hostControl?.advantage?.usedAt && !control.hostControl.advantage.expiredAt ? <div className="mf3-advantage-applied"><strong>{control.hostControl.advantage.title}</strong><span>{control.hostControl.advantage.description}</span></div> : <div className="mf3-prerequisite"><b>–</b><span>Kein aktiver Vorteil: Mission nicht erfolgreich oder Vorteil verfallen.</span></div>}{voteEvaluation?.error && <div className="mf3-error">{voteEvaluation.error}</div>}<div className="mf3-tally">{voteEvaluation?.result?.tally.slice().sort((a,b) => b.effectiveVotes - a.effectiveVotes).map((entry) => { const member = live.lobby.find((candidate) => candidate.memberId === entry.playerId); return <div key={entry.playerId}><span>{member?.displayName ?? "Unbekannt"}</span><b>{entry.regularVotes}</b><i>{entry.adjustment >= 0 ? "+" : ""}{entry.adjustment}</i><strong>{entry.effectiveVotes}</strong></div>; })}</div></article>}
          </section>}

          {hostPanel === "emergency" && <section className="mf3-panel mf3-emergency"><header><div><p>Nur bei technischen Problemen</p><h2>Manuelle Notfallsteuerung</h2></div><span>Diese Aktion umgeht die normalen Voraussetzungen.</span></header><div className="mf3-emergency-grid"><label className="mf3-field"><span>Runde</span><select value={manualRound} onChange={(event) => setManualRound(Number(event.target.value) as RoundNumber)}>{([1,2,3,4] as const).map((round) => <option value={round} key={round}>Runde {round}</option>)}</select></label><label className="mf3-field"><span>Phase</span><select value={manualPhase} onChange={(event) => setManualPhase(event.target.value as RoundPhase)}>{ALL_PHASES.map((phase) => <option value={phase} key={phase}>{PHASE_LABELS[phase]}</option>)}</select></label><button className="danger" onClick={() => void control.forcePhase(manualRound, manualPhase)} type="button">Phase sofort erzwingen</button><button onClick={() => void emergencyHome()} type="button">André-Zugang schließen und Startseite öffnen</button></div></section>}
        </section>
      )}

      {identity?.accessRole === "player" && summary && (
        <section className="mf3-workspace mf3-player">
          <section className="mf3-player-head"><div><p>Runde {summary.currentRound} · {summary.joinCode}</p><h1>{PHASE_LABELS[summary.phase]}</h1><span>Deine geheimen Informationen bleiben auf diesem Gerät.</span></div><div className="mf3-person"><Avatar member={currentMember} large /><div><strong>{currentMember?.displayName}</strong><span>{teamLabel(currentMember?.challengeTeam)}</span></div></div></section>
          <section className="mf3-player-action">
            {summary.phase === "lobby" && <article className="mf3-wait"><GoldCrownCap size="medium" /><h2>Warte auf André.</h2><p>Die Partie beginnt, sobald Rollen, Mission, Vorteil und Challenge vorbereitet sind.</p></article>}

            {summary.phase === "role_reveal" && <article className={`mf3-role-reveal ${roleOpen ? "open" : "sealed"}`}>{!roleOpen ? <div className="mf3-role-sealed"><div className="mf3-seal"><span>SM</span><i /><i /></div><p>Nur für deine Augen</p><h2>Deine Rolle ist verschlüsselt.</h2><button className="mf2-button mf2-button-primary" type="button" onClick={async () => { await live.revealRole(); setRoleOpen(true); await live.updateProgress({ screenKey: "role_card", stepKey: "role_revealed", phaseSeen: summary.phase, roleRevealed: true }); }}>Rolle entschlüsseln</button></div> : <div className={`mf3-role-result ${privateState?.role === "millionaire" ? "millionaire" : "investigator"}`}><div className="mf3-role-burst" /><span>{privateState?.role === "millionaire" ? "♛" : "⌕"}</span><p>Deine Rolle</p><h2>{privateState?.role === "millionaire" ? "Millionär" : "Ermittler"}</h2><strong>{privateState?.role === "millionaire" ? "Erfülle die Mission. Nutze deinen Vorteil. Bleib unerkannt." : "Beobachte, diskutiere und entlarve den Millionär."}</strong></div>}</article>}

            {privateState?.mission && ["mission","challenge","question","discussion","mission_review","advantage","voting","evaluation","result"].includes(summary.phase) && <article className={`mf3-secret-package ${secretOpen ? "open" : "sealed"}`}>{!secretOpen ? <div className="mf3-envelope"><div className="mf3-seal compact"><span>SM</span><i /><i /></div><p>Geheime Übertragung</p><h2>Mission und Vorteil warten.</h2><button className="mf2-button mf2-button-primary" type="button" onClick={async () => { setSecretOpen(true); await live.updateProgress({ screenKey: "mission", stepKey: "mission_and_advantage_opened", phaseSeen: summary.phase, missionOpened: true, advantageOpened: true }); }}>Geheimes Paket öffnen</button></div> : <div className="mf3-secret-documents"><section><p>Mission</p><h2>{privateState.mission.title_snapshot}</h2><strong>{privateState.mission.task_snapshot}</strong><dl><div><dt>Erfolg</dt><dd>{privateState.mission.success_criteria_snapshot}</dd></div><div><dt>Zeitfenster</dt><dd>{privateState.mission.time_window_snapshot}</dd></div></dl><b className={`status-${privateState.mission.status}`}>{privateState.mission.status === "completed" ? "Mission erfolgreich" : privateState.mission.status === "failed" ? "Mission gescheitert" : "Mission läuft"}</b></section>{privateState.advantage && <section className={`mf3-player-advantage ${privateState.advantage.used_at ? "active" : privateState.advantage.expired_at ? "failed" : "locked"}`}><p>Geheimer Vorteil</p><h2>{privateState.advantage.title_snapshot}</h2><strong>{privateState.advantage.description_snapshot}</strong><span>{privateState.advantage.player_instructions_snapshot}</span><small>{privateState.advantage.limit_snapshot}</small><b>{privateState.advantage.used_at ? "Vorteil aktiviert" : privateState.advantage.expired_at ? "Vorteil verfallen" : "Wird bei erfolgreicher Mission aktiviert"}</b></section>}</div>}</article>}

            {summary.phase === "challenge" && live.challenge && <article className={`mf3-player-challenge team-${currentMember?.challengeTeam ?? "none"}`}><div className="mf3-challenge-energy" /><p>{teamLabel(currentMember?.challengeTeam)}</p><h2>{live.challenge.title}</h2><span>{live.challenge.publicName} · {live.challenge.duration}</span><strong>{live.challenge.playerBriefing}</strong><div><section><b>Siegbedingung</b><span>{live.challenge.winCondition}</span></section><section><b>Sicherheit</b><span>{live.challenge.safetyNote}</span></section></div><button className={`mf3-ack-button ${challengeAcknowledged ? "pressed" : ""}`} disabled={challengeAcknowledged} type="button" onClick={async () => { setChallengeAcknowledged(true); await live.updateProgress({ screenKey: "challenge", stepKey: "challenge_opened", phaseSeen: summary.phase, challengeBriefingOpened: true }); }}>{challengeAcknowledged ? "✓ Challenge verstanden" : "Challenge verstanden"}</button></article>}

            {summary.phase === "question" && <article className={`mf3-question-stage ${currentMember?.challengeTeam === control.publicFlow?.winningTeam ? "winner" : "waiting"}`}>{currentMember?.challengeTeam === control.publicFlow?.winningTeam ? <><div className="mf3-victory-burst" /><p>Challenge gewonnen</p><h2>{teamLabel(control.publicFlow?.winningTeam)} hat gewonnen.</h2><strong>Bestimmt jetzt einen Fragesteller aus eurem Team. Diese Person geht zu André und stellt die Frage.</strong>{control.publicFlow?.questionerMemberId ? <div className="mf3-selected-questioner"><Avatar member={questioner} large /><span>Gewählter Fragesteller</span><b>{questioner?.displayName}</b><small>{control.publicFlow?.questionCompletedAt ? "André hat Frage und Antwort bestätigt." : "Bitte jetzt zu André gehen."}</small></div> : <div className="mf3-questioner-grid">{winningMembers.map((member) => <button type="button" onClick={() => void control.selectQuestioner(member.memberId)} key={member.memberId}><Avatar member={member} /><span>{member.displayName}</span></button>)}</div>}</> : <><p>Frage des Siegerteams</p><h2>Das andere Team bestimmt den Fragesteller.</h2><strong>Warte, bis die Frage bei André gestellt und beantwortet wurde.</strong></>}</article>}

            {summary.phase === "voting" && <article className="mf3-player-vote"><p>Geheime Abstimmung</p><h2>Wer ist der Millionär?</h2>{privateState?.ownVote ? <div className="mf3-vote-done"><span>✓</span><strong>Stimme versiegelt</strong></div> : <><div className="mf3-vote-grid">{live.lobby.filter((member) => member.attendanceStatus === "present" && member.winnerPoolStatus === "eligible").map((member) => <button className={voteTarget === member.memberId ? "selected" : ""} onClick={() => setVoteTarget(member.memberId)} type="button" key={member.memberId}><Avatar member={member} large /><span>{member.displayName}</span><b>{voteTarget === member.memberId ? "Ausgewählt" : "Verdächtigen"}</b></button>)}</div><button className="mf2-button mf2-button-primary" disabled={!voteTarget} onClick={() => void live.submitVote(voteTarget)} type="button">Stimme verbindlich abgeben</button></>}</article>}

            {!['lobby','role_reveal','challenge','question','voting','finished'].includes(summary.phase) && !privateState?.mission && <article className="mf3-wait"><div className="mf3-seal"><span>SM</span><i /><i /></div><h2>{PHASE_LABELS[summary.phase]}</h2><p>André steuert den nächsten Schritt zentral.</p></article>}
            {summary.phase === "finished" && <article className="mf3-finale"><div className="mf3-confetti">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ "--particle-index": index } as CSSProperties} />)}</div><GoldCrownCap size="large" /><p>Finale</p><h2>Die letzte Maske fällt.</h2></article>}
          </section>
        </section>
      )}

      {identity && <footer className="mf3-footer"><span>{live.error || control.error ? "Verbindung gestört" : "Live-Synchronisation aktiv"}</span><div><button onClick={() => void control.reconnect()} type="button">Sitzung wieder beitreten</button><button className="danger" onClick={() => void emergencyHome()} type="button">Notfall-Startseite</button></div></footer>}
      {(localError || notice || live.error || control.error) && identity && <div className={`mf3-toast ${localError || live.error || control.error ? "error" : ""}`}><span>{localError ?? live.error ?? control.error ?? notice}</span><button onClick={() => { setLocalError(undefined); setNotice(undefined); }} type="button">×</button><button onClick={() => void control.reconnect()} type="button">Sitzung wieder beitreten</button></div>}
    </main>
  );
}
