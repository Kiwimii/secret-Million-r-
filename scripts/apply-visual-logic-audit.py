from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


app_path = Path("app/demo/AkteMidasApp.tsx")
app = app_path.read_text()

app = replace_once(
    app,
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useId, useMemo, useRef, useState } from "react";',
    "React imports",
)

app = replace_once(
    app,
    'function MidasMark({ compact = false }: { compact?: boolean }) {\n  return (',
    'function MidasMark({ compact = false }: { compact?: boolean }) {\n  const gradientId = useId().replace(/:/g, "");\n  return (',
    "unique Midas gradient",
)
app = app.replace('id="midasGold"', 'id={gradientId}')
app = app.replace('stroke="url(#midasGold)"', 'stroke={`url(#${gradientId})`}')

app = replace_once(
    app,
    'function OperativeSilhouettes() {\n  return (',
    'function OperativeSilhouettes() {\n  const gradientId = useId().replace(/:/g, "");\n  return (',
    "unique silhouette gradient",
)
app = app.replace('id="fadeAgents"', 'id={gradientId}')
app = app.replace('fill="url(#fadeAgents)"', 'fill={`url(#${gradientId})`}')

app = replace_once(
    app,
    '''  dramatic?: boolean;
}) {
  return (''',
    '''  dramatic?: boolean;
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
  return (''',
    "overlay keyboard and scroll handling",
)

app = app.replace(
    'onClick={() => void controller.clearSession()}>Akte verlassen</button>',
    'onClick={() => { if (window.confirm("Diese Akte auf diesem Gerät verlassen? Mit Zugangscode, Name und PIN kannst du dein Profil wieder öffnen.")) void controller.clearSession(); }}>Akte verlassen</button>',
)
app = app.replace(
    'setDismissed([...dismissed, popup.id])',
    'setDismissed((current) => current.includes(popup.id) ? current : [...current, popup.id])',
)

app = replace_once(
    app,
    '''  const [finalOpen, setFinalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();''',
    '''  const [finalOpen, setFinalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [copiedCode, setCopiedCode] = useState(false);
  const busyRef = useRef(false);''',
    "host interaction state",
)

old_host_logic = '''  const mission = missionById(missionId);
  const challenge = challengeById(challengeId);
  const bonus = bonusById(bonusId);
  const malus = malusById(malusId);
  const usedMissionIds = useMemo(() => Object.values(view.rounds ?? {}).map((entry) => entry.mission?.catalogId).filter((id): id is string => Boolean(id)), [view.rounds]);
  const usedChallengeIds = useMemo(() => Object.values(view.rounds ?? {}).map((entry) => entry.challenge?.catalogId).filter((id): id is string => Boolean(id)), [view.rounds]);

  async function run(name: string, action: () => Promise<void>) { setBusyAction(name); try { await action(); } finally { setBusyAction(undefined); } }
  function packageInput(): RoundPackageInput { return { mission, challenge, bonus, malus }; }

  const activeCandidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound);
  const submitted = activeCandidates.filter((member) => member.voteSubmitted).length;'''
new_host_logic = '''  const activeCandidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound);
  const activeCount = activeCandidates.length;
  const compatibleMissions = MISSION_CATALOG.filter((entry) => entry.minPlayers <= activeCount);
  const compatibleChallenges = CHALLENGE_CATALOG.filter((entry) => entry.minPlayers <= activeCount);
  const mission = missionById(missionId);
  const challenge = challengeById(challengeId);
  const bonus = bonusById(bonusId);
  const malus = malusById(malusId);
  const packageCompatible = mission.minPlayers <= activeCount && challenge.minPlayers <= activeCount;
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
  const nextStep = activeCount < 4
    ? `Mindestens vier aktive Spieler werden benötigt. Aktuell: ${activeCount}.`
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
                          : "Nächste Einsatzphase starten.";'''
app = replace_once(app, old_host_logic, new_host_logic, "host workflow logic")

app = app.replace(
    '<button onClick={() => void navigator.clipboard?.writeText(view.joinCode)}>Code kopieren</button>',
    '<button onClick={() => void copyJoinCode()}>{copiedCode ? "Kopiert" : "Code kopieren"}</button>',
)
app = app.replace(
    '</div></div>\n          </Card>\n          <Card eyebrow="Versiegelte Auswahl"',
    '</div><div className={styles.nextStep}><span>Nächster Schritt</span><strong>{nextStep}</strong></div></div>\n          </Card>\n          <Card eyebrow="Versiegelte Auswahl"',
    1,
)
app = app.replace(
    '<div className={styles.catalogControls}>',
    '{!packageCompatible && <div className={styles.capacityWarning}>Auswahl nicht spielbar: Mission benötigt {mission.minPlayers}, Challenge {challenge.minPlayers}, verfügbar sind {activeCount} aktive Spieler.</div>}<div className={styles.catalogControls}>',
    1,
)
app = app.replace(
    '<option value={entry.catalogId} key={entry.catalogId}>{entry.catalogId} · {entry.title} · {entry.difficulty}</option>',
    '<option value={entry.catalogId} key={entry.catalogId} disabled={entry.minPlayers > activeCount}>{entry.catalogId} · {entry.title} · {entry.difficulty} · ab {entry.minPlayers}</option>',
)
app = app.replace(
    '<button onClick={() => setMissionId(randomUnused(MISSION_CATALOG, usedMissionIds).catalogId)}>Ungespielte Mission ziehen</button>',
    '<button disabled={isBusy || compatibleMissions.length === 0} onClick={() => setMissionId(randomUnused(compatibleMissions, usedMissionIds).catalogId)}>Passende Mission ziehen</button>',
)
app = app.replace(
    '<option value={entry.catalogId} key={entry.catalogId}>{entry.catalogId} · {entry.title} · {entry.category}</option>',
    '<option value={entry.catalogId} key={entry.catalogId} disabled={entry.minPlayers > activeCount}>{entry.catalogId} · {entry.title} · {entry.category} · ab {entry.minPlayers}</option>',
)
app = app.replace(
    '<button onClick={() => setChallengeId(randomUnused(CHALLENGE_CATALOG, usedChallengeIds).catalogId)}>Ungespielte Challenge ziehen</button>',
    '<button disabled={isBusy || compatibleChallenges.length === 0} onClick={() => setChallengeId(randomUnused(compatibleChallenges, usedChallengeIds).catalogId)}>Passende Challenge ziehen</button>',
)
app = app.replace(
    'disabled={!\'lobby\',\'round_setup\'.includes(view.phase) || busyAction === "configure"}',
    'disabled={isBusy || !packageCompatible || ![\'lobby\',\'round_setup\'].includes(view.phase)}',
)
app = app.replace(
    'action={<button className={styles.ghostButton} onClick={() => void run("join", () => controller.setAcceptingPlayers(!view.acceptingPlayers))}>',
    'action={<button className={styles.ghostButton} disabled={isBusy} onClick={() => void run("join", () => controller.setAcceptingPlayers(!view.acceptingPlayers))}>',
)
app = app.replace(
    "disabled={['voting_open','reveal_ready','report','role_decision','finished'].includes(view.phase)}",
    "disabled={isBusy || ['voting_open','reveal_ready','report','role_decision','finished'].includes(view.phase)}",
)
app = app.replace('disabled={!round.millionaireId || Boolean(round.roleReleased)}', 'disabled={isBusy || !round.millionaireId || Boolean(round.roleReleased)}')
app = app.replace('disabled={!round.roleReleased || Boolean(round.missionPublished)}', 'disabled={isBusy || !round.roleReleased || Boolean(round.missionPublished)}')
app = app.replace('disabled={!round.missionPublished || Boolean(round.challengePublished)}', 'disabled={isBusy || !round.missionPublished || Boolean(round.challengePublished)}')
app = app.replace("disabled={!round.challengePublished || !['challenge','mission_review'].includes(view.phase)}", "disabled={isBusy || !round.challengePublished || !['challenge','mission_review'].includes(view.phase)}")
app = app.replace(
    'disabled={![' + "'completed','failed','neutral'" + '].includes(round.missionStatus ?? "pending") || view.phase === "voting_open"}',
    'disabled={isBusy || !round.winningTeam || ![' + "'completed','failed','neutral'" + '].includes(round.missionStatus ?? "pending") || view.phase === "voting_open"}',
)
app = app.replace('disabled={view.phase !== "voting_open"}', 'disabled={isBusy || view.phase !== "voting_open"}')
app = app.replace('disabled={!round.result}>Enthüllung starten', 'disabled={isBusy || !round.result}>Enthüllung starten')
app = app.replace('disabled={!round.result || Boolean(round.resultPublished)}', 'disabled={isBusy || !round.result || Boolean(round.resultPublished)}')
app = app.replace('disabled={!round.resultPublished}', 'disabled={isBusy || !round.resultPublished}')
app = app.replace(
    'disabled={![' + "'challenge','mission_review'" + '].includes(view.phase)} onClick={() => void controller.setChallengeWinner("azur")}',
    'disabled={isBusy || ![' + "'challenge','mission_review'" + '].includes(view.phase)} onClick={() => void run("challenge-azur", () => controller.setChallengeWinner("azur"))}',
)
app = app.replace(
    'disabled={![' + "'challenge','mission_review'" + '].includes(view.phase)} onClick={() => void controller.setChallengeWinner("gold")}',
    'disabled={isBusy || ![' + "'challenge','mission_review'" + '].includes(view.phase)} onClick={() => void run("challenge-gold", () => controller.setChallengeWinner("gold"))}',
)
app = app.replace(
    'onPublish={!round.resultPublished ? () => void controller.publishResult() : undefined}',
    'onPublish={!round.resultPublished ? () => void run("publish-overlay", () => controller.publishResult()) : undefined}',
)

host_member_start = app.index('function HostMemberRow(')
host_member_end = app.index('function TeamPanel(', host_member_start)
host_member_block = '''function HostMemberRow({ member, controller }: { member: MetaMember; controller: ReturnType<typeof useMetaGame> }) {
  return <div className={styles.hostMemberRow}><span className={styles.avatar}>{member.displayName[0]}</span><div><strong>{member.displayName}</strong><small>{memberStatus(member)} · aktiv ab R{member.activeFromRound} · {member.points ?? 0} Punkte</small></div><label className={styles.memberStatusControl}><span>Anwesenheit</span><select value={member.attendanceStatus} onChange={(event) => void controller.setMemberStatus({ memberId: member.id, attendanceStatus: event.target.value as MetaMember["attendanceStatus"] })}><option value="present">Anwesend</option><option value="temporarily_absent">Vorübergehend abwesend</option><option value="departed">Abgereist</option></select></label><label className={styles.memberStatusControl}><span>Wertung</span><select value={member.competitionStatus} onChange={(event) => void controller.setMemberStatus({ memberId: member.id, competitionStatus: event.target.value as MetaMember["competitionStatus"] })}>{member.competitionStatus === "eligible" && <option value="eligible">Aktiv</option>}{member.competitionStatus !== "disqualified" && <option value="eliminated">Aus der Wertung</option>}<option value="disqualified">Disqualifiziert</option></select></label></div>;
}

'''
app = app[:host_member_start] + host_member_block + app[host_member_end:]

effect_start = app.index('function EffectSelection(')
effect_end = app.index('function PlayerDashboard(', effect_start)
effect_block = '''function EffectSelection({ view, round, controller }: { view: MetaGameView; round: MetaRoundState; controller: ReturnType<typeof useMetaGame> }) {
  const effect = round.missionStatus === "completed" ? round.bonus : round.missionStatus === "failed" ? round.malus : undefined;
  const [voterId, setVoterId] = useState(round.effectSelection?.voterId ?? "");
  const [targetId, setTargetId] = useState(round.effectSelection?.targetId ?? "");
  useEffect(() => {
    setVoterId(round.effectSelection?.voterId ?? "");
    setTargetId(round.effectSelection?.targetId ?? "");
  }, [round.number, round.effectSelection?.voterId, round.effectSelection?.targetId]);
  if (!effect || effect.kind === "none" || effect.selectionMode === "none") return null;
  const selectable = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound && member.id !== view.memberId);
  const requiresVoter = ["voter", "source_and_target"].includes(effect.selectionMode ?? "");
  const requiresTarget = ["target", "source_and_target"].includes(effect.selectionMode ?? "");
  const selectionComplete = (!requiresVoter || Boolean(voterId)) && (!requiresTarget || Boolean(targetId));
  return <div className={styles.effectSelection}><h4>Effektziel festlegen: {effect.title}</h4>{requiresVoter && <label>Betroffener Wähler<select value={voterId} onChange={(event) => setVoterId(event.target.value)}><option value="">Auswählen</option>{selectable.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></label>}{requiresTarget && <label>Zielperson<select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Auswählen</option>{selectable.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></label>}<button disabled={!selectionComplete} onClick={() => void controller.setEffectSelection({ voterId, targetId })}>Auswahl verriegeln</button>{!selectionComplete && <small className={styles.invalidHint}>Der Effekt verfällt ohne vollständige Auswahl.</small>}</div>;
}

'''
app = app[:effect_start] + effect_block + app[effect_end:]

app = replace_once(
    app,
    '''  const [voteTarget,setVoteTarget] = useState(view.ownVoteDraft ?? "");
  const [revealOpen,setRevealOpen] = useState(false);
  const [finalOpen,setFinalOpen] = useState(false);
  useEffect(() => setVoteTarget(view.ownVoteDraft ?? ""), [view.ownVoteDraft, view.currentRound]);''',
    '''  const candidateKey = candidates.map((member) => member.id).join("|");
  const [voteTarget,setVoteTarget] = useState(view.ownVoteDraft ?? "");
  const [revealOpen,setRevealOpen] = useState(false);
  const [finalOpen,setFinalOpen] = useState(false);
  useEffect(() => {
    const draft = view.ownVoteDraft ?? "";
    setVoteTarget(draft && candidates.some((member) => member.id === draft) ? draft : "");
  }, [view.ownVoteDraft, view.currentRound, candidateKey]);''',
    "valid vote draft synchronization",
)
app = app.replace(
    '  const ownTeam = round.teams?.[view.memberId ?? ""];',
    '  const ownTeam = round.teams?.[view.memberId ?? ""];\n  const validVoteTarget = candidates.some((member) => member.id === voteTarget);',
)
app = app.replace(
    '</p>{view.ownVote ? <div className={styles.lockedVote}>',
    '</p>{voteTarget && !validVoteTarget && <div className={styles.invalidHint}>Dieses Profil ist nicht mehr abstimmungsberechtigt. Bitte wähle neu.</div>}{view.ownVote ? <div className={styles.lockedVote}>',
)
app = app.replace(
    'disabled={view.phase !== "voting_open" || !voteTarget} onClick={() => void controller.submitVote(voteTarget)}',
    'disabled={view.phase !== "voting_open" || !validVoteTarget} onClick={() => void controller.submitVote(voteTarget)}',
)

reveal_start = app.index('function RevealOverlay(')
reveal_end = app.index('function FinalOverlay(', reveal_start)
reveal_block = '''function RevealOverlay({ view, round, onClose, onPublish }: { view: MetaGameView; round: MetaRoundState; onClose(): void; onPublish?: () => void }) {
  const result = round.result!;
  const [step, setStep] = useState(0);
  const lines = ["Die Stimmen sind verriegelt.",result.effect?.kind && result.effect.kind !== "none" ? `Missionsfolge aktiv: ${result.effect.title}` : "Keine Missionsfolge verändert die Stimmen.",result.tieResolvedBy === "lot" ? "Gleichstand. Das Los übernimmt die Verantwortung." : "Das Ergebnis ist eindeutig. Unangenehm, aber eindeutig.",`${getName(view,result.eliminatedId)} erhält die meisten wirksamen Stimmen.`,result.millionaireSurvived ? "Der Millionär überlebt die Runde." : "Der Millionär wurde enttarnt.",result.millionaireSurvived ? `${getName(view,result.millionaireId)} bleibt als Millionär im Spiel.` : `${getName(view,result.millionaireId)} war der Millionär.`];
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || step >= lines.length - 1) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(lines.length - 1, current + 1)), 1750);
    return () => window.clearTimeout(timer);
  }, [step, lines.length]);
  const sortedTally = [...result.effectiveTally].sort((left, right) => right.effectiveVotes - left.effectiveVotes || getName(view,left.memberId).localeCompare(getName(view,right.memberId), "de"));
  return <Overlay classification={`AUSWERTUNG · RUNDE ${view.currentRound}`} title="Die Stimmen werden geöffnet" onClose={onClose} dramatic><div className={styles.revealSequence}>{lines.map((line,index) => <div key={line} className={step >= index ? styles.revealed : ""}><span>0{index+1}</span><p>{line}</p></div>)}</div>{step < lines.length - 1 && <button className={styles.ghostButton} onClick={() => setStep(lines.length - 1)}>Auswertung sofort anzeigen</button>}<div className={styles.tally}>{sortedTally.map((entry) => <div key={entry.memberId}><span>{getName(view,entry.memberId)}{entry.adjustment !== 0 && <small className={styles.tallyAdjustment}>{entry.adjustment > 0 ? ` +${entry.adjustment}` : ` ${entry.adjustment}`} Effekt</small>}</span><i style={{ "--votes": Math.max(0,entry.effectiveVotes) } as React.CSSProperties} /><b>{entry.effectiveVotes}</b></div>)}</div><p className={styles.darkJoke}>Die Zentrale gratuliert allen korrekten Entscheidungen. Die übrigen wurden ebenfalls gespeichert.</p>{onPublish && <button className={styles.primaryButton} onClick={onPublish}>Abschlussbericht freigeben</button>}</Overlay>;
}

'''
app = app[:reveal_start] + reveal_block + app[reveal_end:]

final_start = app.index('function FinalOverlay(')
final_end = app.index('export default function AkteMidasApp()', final_start)
final_block = '''function FinalOverlay({ view, onClose }: { view: MetaGameView; onClose(): void }) {
  const final = view.finalResult!;
  const ranked = [...final.leaderboard].sort((left, right) => {
    const leftEligible = view.members.find((member) => member.id === left.memberId)?.competitionStatus === "eligible" ? 1 : 0;
    const rightEligible = view.members.find((member) => member.id === right.memberId)?.competitionStatus === "eligible" ? 1 : 0;
    return rightEligible - leftEligible || right.points - left.points || right.correctGuesses - left.correctGuesses;
  });
  return <Overlay classification="ARCHIV MIDAS" title="Die Operation ist beendet" onClose={onClose} dramatic><div className={styles.finalWinner}><MidasMark /><span>Gewinnerakte</span><h3>{getName(view,final.winnerId)}</h3><p>{final.reason === "final_millionaire_survived" ? "Der Millionär hat die letzte Einsatzphase überlebt." : "Die Gesamtwertung der verbliebenen Spieler entscheidet."}</p></div><div className={styles.leaderboard}>{ranked.map((entry,index) => { const member = view.members.find((candidate) => candidate.id === entry.memberId); const eligible = member?.competitionStatus === "eligible"; return <div key={entry.memberId} className={!eligible ? styles.ineligibleRank : ""}><b>#{index+1}</b><span>{getName(view,entry.memberId)}</span><strong>{entry.points} Punkte</strong><small>{entry.correctGuesses} richtige Verdächtigungen{!eligible ? " · außer Wertung" : ""}</small></div>; })}</div><div className={styles.finalTimeline}>{final.timeline.map((entry) => <article key={entry.roundNumber}><div><span>AKTE R{entry.roundNumber}</span><strong>{entry.roundNumber} Punkte</strong></div><h4>Millionär: {getName(view,entry.millionaireId)}</h4><p><b>Auftrag:</b> {entry.mission?.title ?? "Kein Auftrag"} · {entry.missionStatus === "completed" ? "erfüllt" : entry.missionStatus === "failed" ? "gescheitert" : "neutral"}</p><p><b>Aus der Wertung:</b> {getName(view,entry.eliminatedId)}{entry.winningTeam ? ` · Feldoperation: Sektor ${entry.winningTeam === "azur" ? "Azur" : "Gold"}` : ""}</p><div className={styles.finalVotes}>{entry.votes.length === 0 ? <small>Keine Stimmen abgegeben.</small> : entry.votes.map((vote) => <span key={`${entry.roundNumber}-${vote.voterId}`}>{getName(view,vote.voterId)} → {getName(view,vote.targetId)}</span>)}</div><div className={styles.finalScores}>{entry.scores.map((score) => <span key={`${entry.roundNumber}-${score.memberId}`}>{getName(view,score.memberId)}: {score.pointsAwarded >= 0 ? "+" : ""}{score.pointsAwarded}{score.correctGuess ? " ✓" : ""}</span>)}</div></article>)}</div><p className={styles.finalLine}>Das Vermögen wurde gefunden. Die Würde bleibt vermisst.</p><small>Persönliche Ermittlungsnotizen bleiben privat. Selbst die Zentrale hat Grenzen. Einige davon sind rechtlich bedingt.</small></Overlay>;
}

'''
app = app[:final_start] + final_block + app[final_end:]

app = replace_once(
    app,
    '''  const [briefingSeen,setBriefingSeen] = useState(false);
  useEffect(() => { if (!briefingKey || typeof window === "undefined") return; setBriefingSeen(window.localStorage.getItem(briefingKey) === "seen"); },[briefingKey]);''',
    '''  const [briefingSeen,setBriefingSeen] = useState(false);
  const [briefingReady,setBriefingReady] = useState(false);
  useEffect(() => {
    if (!briefingKey || typeof window === "undefined") { setBriefingReady(false); return; }
    setBriefingSeen(window.localStorage.getItem(briefingKey) === "seen");
    setBriefingReady(true);
  },[briefingKey]);''',
    "briefing hydration",
)
app = app.replace(
    'return <>{dashboard}{!briefingSeen && <OperationBriefing',
    'return <>{dashboard}{briefingReady && !briefingSeen && <OperationBriefing',
)

app_path.write_text(app)

css_path = Path("app/demo/akte-midas.module.css")
css = css_path.read_text()
marker = "/* visual-logic-audit */"
if marker not in css:
    css += '''

/* visual-logic-audit */
.nextStep{margin-top:12px;padding:12px 14px;border:1px solid rgba(196,161,90,.34);background:rgba(196,161,90,.07);display:grid;gap:4px}
.nextStep span{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#c4a15a}
.nextStep strong{font-size:13px;color:#ded7ca;line-height:1.45}
.capacityWarning,.invalidHint{margin:0 0 14px;padding:11px 13px;background:#2b1810;border:1px solid #76502c;color:#e7c69f;line-height:1.5;font-size:12px}
.invalidHint{margin:0;background:#281317;border-color:#713039;color:#e5b8bd}
.memberStatusControl{display:grid;gap:5px;min-width:0}
.memberStatusControl>span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#7f847e}
.tallyAdjustment{display:block;margin-top:3px;color:#d4b96f;font-size:9px;font-weight:700}
.ineligibleRank{opacity:.55}
.ineligibleRank b,.ineligibleRank strong{color:#8f938d}
.app button:focus-visible,.entry button:focus-visible,.intro button:focus-visible,.app a:focus-visible,.app input:focus-visible,.app select:focus-visible,.app textarea:focus-visible,.entry input:focus-visible,.entry select:focus-visible{outline:2px solid #e1c47e;outline-offset:3px}
.primaryButton:disabled,.controlFlow button:disabled,.dangerButton:disabled,.inlineActions button:disabled,.roleDecision button:disabled,.participantCard button:disabled,.effectSelection button:disabled,.catalogControls>button:disabled,.ghostButton:disabled{opacity:.32;cursor:not-allowed;filter:none}
.introProgress button{height:28px;background:linear-gradient(transparent 12px,#343532 12px 15px,transparent 15px)}
.introProgress .activeProgress{background:linear-gradient(transparent 12px,#c4a15a 12px 15px,transparent 15px)}
.introContent>small,.loading small,.eventList small,.notification span,.notification small{color:#8b9089}
.card,.overlayPanel,.entryPanel,.notificationDrawer{overflow-wrap:anywhere}
@media(max-width:980px){.hostMemberRow{grid-template-columns:auto minmax(0,1fr)}.memberStatusControl{grid-column:2}}
@media(max-width:640px){.topbar{position:sticky;top:0}.notificationDrawer{position:fixed;left:8px;right:8px;top:72px;width:auto;max-height:calc(100vh - 84px)}.anchorNav{scrollbar-width:none}.anchorNav::-webkit-scrollbar{display:none}.hostMemberRow{grid-template-columns:auto minmax(0,1fr)}.memberStatusControl{grid-column:1/-1}.introProgress{width:100%;justify-content:center}.introProgress button{flex:1;max-width:52px}.tally div{grid-template-columns:minmax(90px,1fr) minmax(60px,2fr) 28px}}
@media(pointer:coarse){.primaryButton,.ghostButton,.controlFlow button,.inlineActions button,.roleDecision button,.participantCard button,.effectSelection button,.codeBox button,.catalogControls>button,.modeTabs button,.anchorNav a{min-height:44px}}
'''
css_path.write_text(css)

# Remove the request and this one-shot patcher after a successful run.
Path(".github/visual-logic-audit.request").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
