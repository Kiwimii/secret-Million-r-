const { createClient } = require('@supabase/supabase-js');

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function anonymous(target, label) {
  const result = await target.auth.signInAnonymously();
  if (result.error || !result.data.user) throw result.error ?? new Error(`${label}: anonymous auth failed`);
  console.log(`OK auth ${label}`);
}

async function rpc(target, name, args) {
  console.log(`RUN ${name}`);
  const result = await target.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  console.log(`OK  ${name}`);
  return result.data;
}

const roundPackage = (round) => ({
  mission: {
    title: `Diagnose-Mission ${round}`,
    task: 'Automatisierte Diagnoseaufgabe.',
    successCriteria: 'Die Spielleitung bestätigt den Ausgang.',
    timeWindow: 'Bis zur Abstimmung',
  },
  bonus: round === 1
    ? { kind: 'add_vote', title: 'Schattenstimme', description: 'Eine Zusatzstimme.', selectionMode: 'target' }
    : { kind: 'none', title: 'Kein Bonus', description: '', selectionMode: 'none' },
  malus: round === 2
    ? { kind: 'points_penalty', title: 'Punktmalus', description: 'Ein Punkt Abzug.', amount: 1, selectionMode: 'none' }
    : { kind: 'none', title: 'Kein Malus', description: '', selectionMode: 'none' },
  challenge: {
    title: `Diagnose-Challenge ${round}`,
    briefing: 'Automatisierte Diagnose-Challenge.',
    winCondition: 'Team Azur wird bestätigt.',
    duration: '1 Minute',
    material: 'Keines',
    safety: 'Keine Risiken.',
  },
});

async function run() {
  const host = client();
  const players = new Map();
  let gameId;

  try {
    await anonymous(host, 'host');
    const created = await rpc(host, 'meta_create_game', {
      game_title: `Meta-V2-Diagnose-${Date.now()}`,
      host_pin: '2486',
      requested_rounds: 2,
      requested_final_rule: 'classic',
      requested_notes_visibility: 'host',
    });
    gameId = created.game_id;
    const joinCode = created.join_code;
    console.log(`GAME ${gameId} CODE ${joinCode}`);

    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
      const p = client();
      await anonymous(p, name);
      const joined = await rpc(p, 'meta_join_game', {
        raw_join_code: joinCode,
        requested_name: `${name}-${String(Date.now()).slice(-6)}`,
        player_pin: '1357',
        requested_avatar_path: null,
      });
      players.set(joined.member_id, p);
    }

    const getView = () => rpc(host, 'meta_get_game_view', { target_game_id: gameId });

    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: roundPackage(1) });
    await rpc(host, 'meta_host_draw_millionaire', { target_game_id: gameId, force_redraw: false });
    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    await rpc(host, 'meta_host_draw_millionaire', { target_game_id: gameId, force_redraw: true });
    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    await rpc(host, 'meta_host_publish_mission', { target_game_id: gameId });
    await rpc(host, 'meta_host_draw_teams', { target_game_id: gameId });
    await rpc(host, 'meta_host_set_challenge_winner', { target_game_id: gameId, winning_team: 'azur' });
    await rpc(host, 'meta_host_set_mission_status', { target_game_id: gameId, mission_result: 'completed' });

    let view = await getView();
    console.log(`ROUND1 MONEY ${view.currentRoundState.millionaireId}`);
    const money1 = view.currentRoundState.millionaireId;
    const effectTarget = view.members.find((m) => m.id !== money1 && m.competitionStatus === 'eligible')?.id;
    await rpc(players.get(money1), 'meta_player_set_effect_selection', {
      target_game_id: gameId,
      effect_selection: { targetId: effectTarget },
    });
    await rpc(host, 'meta_host_open_voting', { target_game_id: gameId });

    const late = client();
    await anonymous(late, 'Echo');
    const lateJoin = await rpc(late, 'meta_join_game', {
      raw_join_code: joinCode,
      requested_name: `Echo-${String(Date.now()).slice(-6)}`,
      player_pin: '2468',
      requested_avatar_path: null,
    });
    players.set(lateJoin.member_id, late);

    view = await getView();
    const round1 = view.members.filter((m) => m.activeFromRound <= 1 && m.competitionStatus === 'eligible');
    const designated = round1[0];
    for (const member of round1) {
      const target = member.id === designated.id ? round1[1] : designated;
      await rpc(players.get(member.id), 'meta_submit_vote', { target_game_id: gameId, target_member_id: target.id });
    }
    await rpc(host, 'meta_host_close_voting', { target_game_id: gameId });
    view = await getView();
    const eliminated1 = view.currentRoundState.result.eliminatedId;
    console.log(`ROUND1 ELIMINATED ${eliminated1}`);
    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });
    await rpc(host, 'meta_host_advance_round', { target_game_id: gameId });

    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: roundPackage(2) });
    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    await rpc(host, 'meta_host_publish_mission', { target_game_id: gameId });
    await rpc(host, 'meta_host_draw_teams', { target_game_id: gameId });
    view = await getView();
    if (!view.currentRoundState.teams?.[eliminated1]) throw new Error('Eliminated player missing from challenge teams.');
    await rpc(host, 'meta_host_set_challenge_winner', { target_game_id: gameId, winning_team: 'azur' });
    await rpc(host, 'meta_host_set_mission_status', { target_game_id: gameId, mission_result: 'failed' });
    await rpc(host, 'meta_host_open_voting', { target_game_id: gameId });

    view = await getView();
    const money2 = view.currentRoundState.millionaireId;
    const voters2 = view.members.filter((m) =>
      m.id !== money2 && m.activeFromRound <= 2 && m.competitionStatus === 'eligible' && m.attendanceStatus === 'present'
    );
    const target2 = voters2[0];
    for (const member of voters2) {
      const target = member.id === target2.id ? voters2[1] : target2;
      await rpc(players.get(member.id), 'meta_submit_vote', { target_game_id: gameId, target_member_id: target.id });
    }
    await rpc(host, 'meta_host_close_voting', { target_game_id: gameId });
    view = await getView();
    if (!view.currentRoundState.result.missingVoterIds.includes(money2)) throw new Error('Missing millionaire vote not recorded.');
    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });
    await rpc(host, 'meta_host_advance_round', { target_game_id: gameId });
    view = await getView();
    if (view.phase !== 'finished') throw new Error(`Expected finished, got ${view.phase}`);
    if (!view.finalResult?.winnerId || view.finalResult.timeline?.length !== 2) throw new Error('Final result incomplete.');

    const round2 = view.finalResult.timeline.find((entry) => entry.roundNumber === 2);
    const missingMoneyScore = round2?.scores.find((score) => score.memberId === money2);
    if (!missingMoneyScore || missingMoneyScore.pointsAwarded !== 0) {
      throw new Error(`Missing-vote millionaire score must be 0, got ${JSON.stringify(missingMoneyScore)}`);
    }

    await rpc(host, 'meta_delete_own_game', { target_game_id: gameId });
    gameId = undefined;
    console.log('DIAGNOSIS SUCCESS');
  } finally {
    if (gameId) {
      try { await rpc(host, 'meta_delete_own_game', { target_game_id: gameId }); } catch (error) { console.error(`CLEANUP FAILED: ${error.message}`); }
    }
  }
}

run().catch((error) => {
  console.error(`DIAGNOSIS FAILURE: ${error.stack ?? error.message ?? String(error)}`);
  process.exit(1);
});
