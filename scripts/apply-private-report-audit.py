from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing expected snippet: {label}")
    return text.replace(old, new, 1)

app_path = Path("app/demo/AkteMidasApp.tsx")
app = app_path.read_text(encoding="utf-8")

app = replace_once(
    app,
    ': !round.resultPublished\n                        ? "Enthüllung prüfen und Abschlussbericht veröffentlichen."\n                        : view.currentRound === view.totalRounds\n                          ? "Archiv Midas öffnen."\n                          : "Nächste Einsatzphase starten.";',
    ': !round.resultPublished\n                        ? "Auswertung prüfen und Abschlussbericht veröffentlichen."\n                        : view.currentRound === view.totalRounds\n                          ? "Archiv Midas öffnen."\n                          : "Auf die private Rollenentscheidung des Millionärs warten.";',
    "host next step",
)

app = replace_once(
    app,
    '<button onClick={() => setRevealOpen(true)} disabled={isBusy || !round.result}>Enthüllung starten</button><button onClick={() => void run("publish", () => controller.publishResult())} disabled={isBusy || !round.result || Boolean(round.resultPublished)}>Bericht veröffentlichen</button><button className={styles.primaryButton} onClick={() => void run("next", () => controller.advanceRound())} disabled={isBusy || !round.resultPublished}>{view.currentRound === view.totalRounds ? "Archiv Midas öffnen" : "Nächste Einsatzphase"}</button>',
    '<button onClick={() => setRevealOpen(true)} disabled={isBusy || !round.result}>Auswertung öffnen</button><button onClick={() => void run("publish", () => controller.publishResult())} disabled={isBusy || !round.result || Boolean(round.resultPublished)}>Bericht veröffentlichen</button><button className={styles.primaryButton} onClick={() => void run("next", () => controller.advanceRound())} disabled={isBusy || !round.resultPublished || view.currentRound < view.totalRounds}>{view.currentRound === view.totalRounds ? "Archiv Midas öffnen" : "Warte auf Rollenentscheidung"}</button>',
    "host advance button",
)

app = app.replace('<EventList events={view.notifications} />', '<EventList events={view.notifications} view={view} />')

app = replace_once(
    app,
    'function EventList({ events }: { events: MetaEvent[] }) {\n  const toned = events.map(toneEvent);\n  return <div className={styles.eventList}>{toned.length === 0 ? <p className={styles.muted}>Noch keine Ereignisse. Die Stille ist nicht belastbar.</p> : toned.map((event) => <article key={event.id}><span>{event.roundNumber ? `R${event.roundNumber}` : "•"}</span><div><strong>{event.title}</strong><p>{event.body}</p><small>{new Date(event.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</small></div></article>)}</div>;\n}',
    'function EventList({ events, view }: { events: MetaEvent[]; view?: MetaGameView }) {\n  const toned = events.map(toneEvent);\n  return <div className={styles.eventList}>{toned.length === 0 ? <p className={styles.muted}>Noch keine Ereignisse. Die Stille ist nicht belastbar.</p> : toned.map((event) => { const actorId = typeof event.payload?.actorMemberId === "string" ? event.payload.actorMemberId : undefined; const actor = actorId && view ? getName(view, actorId) : undefined; return <article key={event.id}><span>{event.roundNumber ? `R${event.roundNumber}` : "•"}</span><div><strong>{event.title}</strong><p>{event.body}</p><small>{actor ? `AKTEUR · ${actor} · ` : ""}{new Date(event.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</small></div></article>; })}</div>;\n}',
    "event actor rendering",
)

app = replace_once(
    app,
    '  const [revealOpen,setRevealOpen] = useState(false);\n  const [finalOpen,setFinalOpen] = useState(false);',
    '  const [revealOpen,setRevealOpen] = useState(false);\n  const [roleDecisionDismissed,setRoleDecisionDismissed] = useState(false);\n  const [finalOpen,setFinalOpen] = useState(false);',
    "role decision state",
)

app = replace_once(
    app,
    '  useEffect(() => { if (round.resultPublished) setRevealOpen(true); }, [round.resultPublished, view.currentRound]);\n  useEffect(() => { if (view.phase === "finished") setFinalOpen(true); }, [view.phase]);',
    '  useEffect(() => { if (round.resultPublished) setRevealOpen(true); }, [round.resultPublished, view.currentRound]);\n  useEffect(() => { setRoleDecisionDismissed(false); }, [view.currentRound, round.resultPublished]);\n  useEffect(() => { if (view.phase === "finished") setFinalOpen(true); }, [view.phase]);',
    "role decision reset",
)

app = replace_once(
    app,
    '  const validVoteTarget = candidates.some((member) => member.id === voteTarget);',
    '  const validVoteTarget = candidates.some((member) => member.id === voteTarget);\n  const canKeepRole = currentMember?.attendanceStatus === "present" && currentMember.competitionStatus === "eligible";\n  const roleDecisionPending = view.ownRole === "millionaire" && Boolean(round.resultPublished) && view.currentRound < view.totalRounds;',
    "role decision computed state",
)

old_card = '      {view.ownRole === "millionaire" && round.resultPublished && round.result?.millionaireSurvived && view.currentRound < view.totalRounds && <Card eyebrow="Nächste Deckung" title="Rolle behalten?"><p>Sie wurden nicht enttarnt. Das kann Kompetenz gewesen sein. Die Zentrale vermeidet vorschnelle Schlussfolgerungen.</p><div className={styles.roleDecision}><button onClick={() => void controller.submitRoleDecision("keep")}>Deckung behalten</button><button onClick={() => void controller.submitRoleDecision("transfer")}>Zufällig weitergeben</button></div></Card>}'
new_card = '      {roleDecisionPending && roleDecisionDismissed && <Card eyebrow="Nächste Deckung" title="Rollenentscheidung ausstehend"><p>Die nächste Runde wartet auf Ihre private Entscheidung.</p><button className={styles.primaryButton} onClick={() => setRoleDecisionDismissed(false)}>Entscheidung öffnen</button></Card>}'
app = replace_once(app, old_card, new_card, "old role decision card")

app = replace_once(
    app,
    '    {revealOpen && round.result && <RevealOverlay view={view} round={round} onClose={() => setRevealOpen(false)} />}{finalOpen && view.finalResult && <FinalOverlay view={view} onClose={() => setFinalOpen(false)} />}',
    '    {revealOpen && round.result && <RevealOverlay view={view} round={round} onClose={() => setRevealOpen(false)} />}{roleDecisionPending && !revealOpen && !roleDecisionDismissed && <RoleDecisionOverlay canKeep={Boolean(canKeepRole)} busy={controller.loading} onClose={() => setRoleDecisionDismissed(true)} onDecision={(decision) => void controller.submitRoleDecision(decision)} />}{finalOpen && view.finalResult && <FinalOverlay view={view} onClose={() => setFinalOpen(false)} />}',
    "player overlays",
)

old_reveal = 'function RevealOverlay({ view, round, onClose, onPublish }: { view: MetaGameView; round: MetaRoundState; onClose(): void; onPublish?: () => void }) {\n  const result = round.result!;\n  const [step, setStep] = useState(0);\n  const lines = ["Die Stimmen sind verriegelt.",result.effect?.kind && result.effect.kind !== "none" ? `Missionsfolge aktiv: ${result.effect.title}` : "Keine Missionsfolge verändert die Stimmen.",result.tieResolvedBy === "lot" ? "Gleichstand. Das Los übernimmt die Verantwortung." : "Das Ergebnis ist eindeutig. Unangenehm, aber eindeutig.",`${getName(view,result.eliminatedId)} erhält die meisten wirksamen Stimmen.`,result.millionaireSurvived ? "Der Millionär überlebt die Runde." : "Der Millionär wurde enttarnt.",result.millionaireSurvived ? `${getName(view,result.millionaireId)} bleibt als Millionär im Spiel.` : `${getName(view,result.millionaireId)} war der Millionär.`];'
new_reveal = 'function RoleDecisionOverlay({ canKeep, busy, onClose, onDecision }: { canKeep: boolean; busy: boolean; onClose(): void; onDecision(decision: "keep" | "transfer"): void }) {\n  return <Overlay classification="PRIVATE ROLLENENTSCHEIDUNG" title="Wie geht Ihre Deckung weiter?" onClose={onClose} dramatic><p>Der Rundenbericht ist veröffentlicht. Ihre Identität bleibt versiegelt. Bestimmen Sie jetzt, wie die nächste Runde startet.</p>{!canKeep && <div className={styles.invalidHint}>Sie sind nicht mehr in der Wertung. Die Rolle muss zufällig neu ausgelost werden.</div>}<div className={styles.roleDecision}><button disabled={busy || !canKeep} onClick={() => onDecision("keep")}>Millionär bleiben</button><button className={styles.primaryButton} disabled={busy} onClick={() => onDecision("transfer")}>Zufällig neu auslosen</button></div><p className={styles.muted}>Ihre Entscheidung bleibt für die übrigen Spieler geheim. Danach startet automatisch die nächste Runde.</p></Overlay>;\n}\n\nfunction RevealOverlay({ view, round, onClose, onPublish }: { view: MetaGameView; round: MetaRoundState; onClose(): void; onPublish?: () => void }) {\n  const result = round.result!;\n  const [step, setStep] = useState(0);\n  const lines = ["Die Stimmen sind verriegelt.",result.effect?.kind && result.effect.kind !== "none" ? `Missionsfolge aktiv: ${result.effect.title}` : "Keine Missionsfolge verändert die Stimmen.",result.tieResolvedBy === "lot" ? "Gleichstand. Das Los übernimmt die Verantwortung." : "Das Ergebnis ist eindeutig. Unangenehm, aber eindeutig.",`${getName(view,result.eliminatedId)} erhält die meisten wirksamen Stimmen und scheidet aus der Wertung aus.`,"Die Identität des Millionärs bleibt versiegelt."];'
app = replace_once(app, old_reveal, new_reveal, "private reveal copy")

app_path.write_text(app, encoding="utf-8")

live_path = Path("scripts/verify-akte-midas-live.cjs")
live = live_path.read_text(encoding="utf-8")

live = replace_once(
    live,
    "    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });\n    await rpc(host, 'meta_host_advance_round', { target_game_id: gameId });\n    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: packageFor(2) });",
    "    const noteText = `Verdacht-${stamp.slice(-4)}`;\n    await rpc(players.get(effectTarget.id), 'meta_save_note', { target_game_id: gameId, subject_member_id: alternateTarget.id, note_text: noteText });\n    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });\n\n    const publicReport = await rpc(players.get(effectTarget.id), 'meta_get_game_view', { target_game_id: gameId });\n    assert(!('millionaireId' in publicReport.currentRoundState.result), 'Published player report leaked the millionaire id.');\n    assert(!('millionaireSurvived' in publicReport.currentRoundState.result), 'Published player report leaked whether the millionaire survived.');\n\n    view = await hostView(host, gameId);\n    const voteAudit = view.notifications.find((event) => event.eventType === 'vote_submitted' && event.payload?.actorMemberId);\n    assert(voteAudit, 'Host audit log does not identify the player who submitted a vote.');\n    const noteAudit = view.notifications.find((event) => event.eventType === 'note_saved_host' && event.payload?.actorMemberId === effectTarget.id && event.payload?.subjectMemberId === alternateTarget.id);\n    assert(noteAudit && noteAudit.body.includes(noteText), 'Host audit log does not show note author, subject and note text.');\n\n    await expectRpcFailure(host, 'meta_host_advance_round', { target_game_id: gameId }, 'privaten Rollenentscheidung');\n    await expectRpcFailure(players.get(millionaireOne), 'meta_player_role_decision', { target_game_id: gameId, role_decision: 'keep' }, 'nicht mehr für die Wertung');\n    await rpc(players.get(millionaireOne), 'meta_player_role_decision', { target_game_id: gameId, role_decision: 'transfer' });\n\n    view = await hostView(host, gameId);\n    assert(view.currentRound === 2 && view.phase === 'round_setup', 'Private role decision did not start round two automatically.');\n    assert(view.currentRoundState.millionaireId && view.currentRoundState.millionaireId !== millionaireOne, 'Transfer did not assign a new valid millionaire.');\n    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: packageFor(2) });",
    "live round transition",
)

live_path.write_text(live, encoding="utf-8")
