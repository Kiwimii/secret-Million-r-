from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing follow-up target: {label}")
    return text.replace(old, new, 1)


app_path = Path("app/demo/AkteMidasApp.tsx")
app = app_path.read_text()

app = replace_once(
    app,
    '''  const activeCandidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound);
  const activeCount = activeCandidates.length;
  const compatibleMissions = MISSION_CATALOG.filter((entry) => entry.minPlayers <= activeCount);
  const compatibleChallenges = CHALLENGE_CATALOG.filter((entry) => entry.minPlayers <= activeCount);''',
    '''  const activeCandidates = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus === "eligible" && member.activeFromRound <= view.currentRound);
  const availableParticipants = view.members.filter((member) => member.attendanceStatus === "present" && member.competitionStatus !== "disqualified" && member.activeFromRound <= view.currentRound);
  const activeCount = activeCandidates.length;
  const availableCount = availableParticipants.length;
  const compatibleMissions = MISSION_CATALOG.filter((entry) => entry.minPlayers <= availableCount);
  const compatibleChallenges = CHALLENGE_CATALOG.filter((entry) => entry.minPlayers <= availableCount);''',
    "available participant count",
)
app = app.replace(
    'const packageCompatible = mission.minPlayers <= activeCount && challenge.minPlayers <= activeCount;',
    'const packageCompatible = mission.minPlayers <= availableCount && challenge.minPlayers <= availableCount;',
)
app = app.replace(
    'const nextStep = activeCount < 4\n    ? `Mindestens vier aktive Spieler werden benötigt. Aktuell: ${activeCount}.`',
    'const nextStep = availableCount < 4\n    ? `Mindestens vier anwesende Teilnehmer werden benötigt. Aktuell: ${availableCount}.`',
)
app = app.replace('entry.minPlayers > activeCount', 'entry.minPlayers > availableCount')
app = app.replace(
    'verfügbar sind {activeCount} aktive Spieler.',
    'verfügbar sind {availableCount} anwesende Teilnehmer.',
)

host_start = app.index('function HostMemberRow(')
host_end = app.index('function TeamPanel(', host_start)
host_block = '''function HostMemberRow({ member, controller }: { member: MetaMember; controller: ReturnType<typeof useMetaGame> }) {
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

'''
app = app[:host_start] + host_block + app[host_end:]

effect_start = app.index('function EffectSelection(')
effect_end = app.index('function PlayerDashboard(', effect_start)
effect_block = '''function EffectSelection({ view, round, controller }: { view: MetaGameView; round: MetaRoundState; controller: ReturnType<typeof useMetaGame> }) {
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

'''
app = app[:effect_start] + effect_block + app[effect_end:]

app = replace_once(
    app,
    '''  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || step >= lines.length - 1) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(lines.length - 1, current + 1)), 1750);
    return () => window.clearTimeout(timer);
  }, [step, lines.length]);''',
    '''  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(lines.length - 1);
      return;
    }
    if (step >= lines.length - 1) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(lines.length - 1, current + 1)), 1750);
    return () => window.clearTimeout(timer);
  }, [step, lines.length]);''',
    "reduced motion reveal",
)

app_path.write_text(app)

css_path = Path("app/demo/akte-midas.module.css")
css = css_path.read_text()
css = replace_once(
    css,
    '.nextStep{margin-top:12px;',
    '.nextStep{grid-column:1/-1;margin-top:12px;',
    "full-width next step",
)
css_path.write_text(css)

live_path = Path("scripts/verify-akte-midas-live.cjs")
live = live_path.read_text().replace("mindestens 6 aktive Spieler", "mindestens 6 anwesende Teilnehmer")
live_path.write_text(live)

test_path = Path("lib/meta/visual-logic-regressions.test.ts")
test = test_path.read_text()
test = test.replace('entry.minPlayers > activeCount', 'entry.minPlayers > availableCount')
test = test.replace(
    '    expect(migration).toContain("\'challengePublished\', false");',
    '''    expect(migration).toContain("'challengePublished', false");
    const finalMigration = source("supabase/migrations/20260805011400_meta_game_v2_final_logic_hardening.sql");
    expect(finalMigration).toContain("m.competition_status <> 'disqualified'");
    expect(finalMigration).toContain("meta_host_advance_round_final_base");
    expect(finalMigration).toContain("direct_winner_available");''',
)
test_path.write_text(test)

Path(".github/visual-logic-followup.request").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
