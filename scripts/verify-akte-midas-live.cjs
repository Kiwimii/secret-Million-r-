'use strict';

const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase browser configuration is missing.');

function makeClient() {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticate(client, label) {
  const result = await client.auth.signInAnonymously();
  if (result.error || !result.data.user) {
    throw result.error ?? new Error(`Anonymous authentication failed for ${label}.`);
  }
}

async function rpc(client, name, args = {}) {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectRpcFailure(client, name, args, expectedText) {
  const result = await client.rpc(name, args);
  assert(result.error, `${name} unexpectedly succeeded.`);
  assert(
    result.error.message.includes(expectedText),
    `${name} failed for the wrong reason: ${result.error.message}`,
  );
}

function packageFor(round) {
  if (round === 1) {
    return {
      mission: {
        catalogId: 'M01',
        title: 'Operation Ehrlich',
        task: 'Bringe drei verschiedene Spieler dazu, das Wort ehrlich auszusprechen.',
        successCriteria: 'Drei unterschiedliche Personen verwenden die Zielformulierung.',
        timeWindow: '15 Minuten',
        difficulty: 'leicht',
        requirements: 'Keine besonderen Voraussetzungen.',
        restriction: 'Das Zielwort darf nicht vorgegeben werden.',
        centralNote: 'Ehrlichkeit ist selten. Drei Fälle gelten als Auffälligkeit.',
      },
      challenge: {
        catalogId: 'C01',
        title: 'Abwurfpunkt',
        briefing: 'Die Teams werfen abwechselnd auf Zielbecher.',
        winCondition: 'Das erste Team mit vier Treffern gewinnt.',
        duration: '6 Minuten',
        material: 'Zielbecher und Tischtennisbälle',
        safety: 'Nur leichte Bälle verwenden.',
        category: 'Präzision',
        drinkRule: 'Optionaler kleiner Schluck oder Zeitstrafe.',
      },
      bonus: {
        catalogId: 'B04',
        kind: 'add_vote',
        title: 'Schattenstimme',
        description: 'Eine zusätzliche Stimme wird auf eine Zielperson gesetzt.',
        selectionMode: 'target',
      },
      malus: {
        catalogId: 'X05',
        kind: 'none',
        title: 'Kein Schutz',
        description: 'Bei Misserfolg wird kein zusätzlicher Effekt angewendet.',
        selectionMode: 'none',
      },
    };
  }
  return {
    mission: {
      catalogId: 'M02',
      title: 'Der diskrete Toast',
      task: 'Sorge dafür, dass mindestens vier Spieler gemeinsam anstoßen.',
      successCriteria: 'Vier Personen heben ihre Getränke im selben Moment.',
      timeWindow: '15 Minuten',
      difficulty: 'mittel',
      requirements: 'Getränke sind vorhanden.',
      restriction: 'Die Zielwörter dürfen nicht verwendet werden.',
      centralNote: 'Ein guter Toast beginnt mit Charme.',
    },
    challenge: {
      catalogId: 'C02',
      title: 'Transport ohne Würde',
      briefing: 'Ein Tablett wird durch einen kurzen Parcours getragen.',
      winCondition: 'Die schnellste bereinigte Gesamtzeit gewinnt.',
      duration: '8 Minuten',
      material: 'Tabletts und Kunststoffbecher',
      safety: 'Rutschige Stellen sofort trocknen.',
      category: 'Staffel',
      drinkRule: 'Kein Trinkzwang.',
    },
    bonus: {
      catalogId: 'B01',
      kind: 'double_own_vote',
      title: 'Doppelmandat',
      description: 'Die eigene Stimme zählt doppelt.',
      selectionMode: 'none',
    },
    malus: {
      catalogId: 'X03',
      kind: 'points_penalty',
      title: 'Punktabzug',
      description: 'Dem Millionär wird ein Punkt abgezogen.',
      selectionMode: 'none',
      amount: 1,
    },
  };
}

async function hostView(host, gameId) {
  return rpc(host, 'meta_get_game_view', { target_game_id: gameId });
}

async function run() {
  const stamp = `${Date.now()}`;
  const host = makeClient();
  const players = new Map();
  let gameId;

  try {
    await authenticate(host, 'host');
    const created = await rpc(host, 'meta_create_game', {
      game_title: `Akte-Midas-Live-${stamp}`,
      host_pin: '2486',
      requested_rounds: 2,
      requested_final_rule: 'classic',
      requested_notes_visibility: 'host',
    });
    gameId = created?.game_id;
    const joinCode = String(created?.join_code ?? '');
    assert(gameId && /^\d{6}$/.test(joinCode), 'Game creation did not return a valid game and join code.');

    for (const label of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
      const client = makeClient();
      await authenticate(client, label);
      const joined = await rpc(client, 'meta_join_game', {
        raw_join_code: joinCode,
        requested_name: `${label}-${stamp.slice(-5)}`,
        player_pin: '1357',
        requested_avatar_path: null,
      });
      assert(joined?.member_id, `Join failed for ${label}.`);
      players.set(joined.member_id, client);
    }

    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: packageFor(1) });
    let view = await hostView(host, gameId);
    assert(view.currentRoundState.mission.catalogId === 'M01', 'Mission catalog id was not stored.');
    assert(view.currentRoundState.challenge.catalogId === 'C01', 'Challenge catalog id was not stored.');
    assert(view.currentRoundState.bonus.catalogId === 'B04', 'Canonical bonus was not stored.');

    await rpc(host, 'meta_host_draw_millionaire', { target_game_id: gameId, force_redraw: false });
    const initialDraw = await hostView(host, gameId);
    await rpc(host, 'meta_host_draw_millionaire', { target_game_id: gameId, force_redraw: false });
    const duplicateDraw = await hostView(host, gameId);
    assert(
      initialDraw.currentRoundState.millionaireId === duplicateDraw.currentRoundState.millionaireId,
      'A duplicate draw changed the millionaire without confirmation.',
    );

    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    const beforeRedraw = await hostView(host, gameId);
    await rpc(host, 'meta_host_draw_millionaire', { target_game_id: gameId, force_redraw: true });
    const afterRedraw = await hostView(host, gameId);
    assert(afterRedraw.currentRoundState.roleReleased === false, 'Emergency redraw did not reseal roles.');
    if (afterRedraw.members.length > 1) {
      assert(beforeRedraw.currentRoundState.millionaireId !== afterRedraw.currentRoundState.millionaireId, 'Emergency redraw did not change the millionaire.');
    }

    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    await rpc(host, 'meta_host_publish_mission', { target_game_id: gameId });
    await rpc(host, 'meta_host_draw_teams', { target_game_id: gameId });
    await rpc(host, 'meta_host_set_mission_status', { target_game_id: gameId, mission_result: 'completed' });
    await expectRpcFailure(
      host,
      'meta_host_open_voting',
      { target_game_id: gameId },
      'Siegerteam',
    );
    await rpc(host, 'meta_host_set_challenge_winner', { target_game_id: gameId, winning_team: 'azur' });

    view = await hostView(host, gameId);
    const millionaireOne = view.currentRoundState.millionaireId;
    assert(players.has(millionaireOne), 'Round one millionaire has no player session.');
    const effectTarget = view.members.find((member) => member.id !== millionaireOne && member.competitionStatus === 'eligible');
    assert(effectTarget, 'No effect target available.');
    await expectRpcFailure(
      players.get(millionaireOne),
      'meta_player_set_effect_selection',
      { target_game_id: gameId, effect_selection: { targetId: randomUUID() } },
      'Zielperson',
    );
    await rpc(players.get(millionaireOne), 'meta_player_set_effect_selection', {
      target_game_id: gameId,
      effect_selection: { targetId: effectTarget.id },
    });

    await rpc(host, 'meta_host_open_voting', { target_game_id: gameId });

    const echo = makeClient();
    await authenticate(echo, 'Echo');
    const lateJoin = await rpc(echo, 'meta_join_game', {
      raw_join_code: joinCode,
      requested_name: `Echo-${stamp.slice(-5)}`,
      player_pin: '1357',
      requested_avatar_path: null,
    });
    assert(lateJoin?.member_id, 'Late join failed.');
    players.set(lateJoin.member_id, echo);

    view = await hostView(host, gameId);
    const lateMember = view.members.find((member) => member.id === lateJoin.member_id);
    assert(lateMember?.activeFromRound === 2, 'Late joiner was not deferred to round two.');

    const roundOneVoters = view.members.filter((member) =>
      member.attendanceStatus === 'present'
      && member.competitionStatus === 'eligible'
      && member.activeFromRound <= 1,
    );
    const missingVoter = roundOneVoters.find((member) => member.id !== millionaireOne);
    assert(missingVoter, 'No non-millionaire missing voter could be selected.');
    const alternateTarget = roundOneVoters.find((member) => (
      member.id !== millionaireOne && member.id !== effectTarget.id
    ));
    assert(alternateTarget, 'No distinct target available for deterministic round-one tally.');
    for (const voter of roundOneVoters) {
      if (voter.id === missingVoter.id) continue;
      const target = voter.id === millionaireOne ? alternateTarget.id : millionaireOne;
      await rpc(players.get(voter.id), 'meta_submit_vote', {
        target_game_id: gameId,
        target_member_id: target,
      });
    }

    await rpc(host, 'meta_host_close_voting', { target_game_id: gameId });
    view = await hostView(host, gameId);
    const roundOneResult = view.currentRoundState.result;
    assert(roundOneResult?.missingVoterIds?.includes(missingVoter.id), 'Missing vote was not documented.');
    assert(roundOneResult?.effect?.catalogId === 'B04', 'Mission bonus was not applied from the canonical catalog.');
    const eliminatedOne = roundOneResult.eliminatedId;
    assert(eliminatedOne === millionaireOne, 'Round one did not eliminate the deliberately exposed millionaire.');

    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });
    await rpc(host, 'meta_host_advance_round', { target_game_id: gameId });
    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: packageFor(2) });
    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    await rpc(host, 'meta_host_publish_mission', { target_game_id: gameId });
    await rpc(host, 'meta_host_draw_teams', { target_game_id: gameId });

    view = await hostView(host, gameId);
    assert(view.currentRoundState.teams?.[eliminatedOne], 'Eliminated player was not retained in the next team challenge.');
    assert(view.currentRoundState.malus.catalogId === 'X03', 'Canonical round two malus was not stored.');

    await rpc(host, 'meta_host_set_challenge_winner', { target_game_id: gameId, winning_team: 'gold' });
    await rpc(host, 'meta_host_set_mission_status', { target_game_id: gameId, mission_result: 'failed' });
    await rpc(host, 'meta_host_open_voting', { target_game_id: gameId });

    view = await hostView(host, gameId);
    const millionaireTwo = view.currentRoundState.millionaireId;
    const roundTwoVoters = view.members.filter((member) =>
      member.attendanceStatus === 'present'
      && member.competitionStatus === 'eligible'
      && member.activeFromRound <= 2,
    );
    const roundTwoAlternate = roundTwoVoters.find((member) => member.id !== millionaireTwo);
    assert(roundTwoAlternate, 'No alternate round two target available.');
    for (const voter of roundTwoVoters) {
      const target = voter.id === millionaireTwo ? roundTwoAlternate.id : millionaireTwo;
      await rpc(players.get(voter.id), 'meta_submit_vote', {
        target_game_id: gameId,
        target_member_id: target,
      });
    }

    await rpc(host, 'meta_host_close_voting', { target_game_id: gameId });
    view = await hostView(host, gameId);
    assert(view.currentRoundState.result?.effect?.catalogId === 'X03', 'Mission malus was not applied in round two.');
    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });
    await rpc(host, 'meta_host_advance_round', { target_game_id: gameId });

    view = await hostView(host, gameId);
    assert(view.phase === 'finished', 'Game did not reach the finished phase.');
    assert(view.finalResult?.timeline?.length === 2, 'Final archive does not contain both rounds.');
    assert(view.finalResult?.leaderboard?.length >= 4, 'Final leaderboard is incomplete.');
    const roundOneArchive = view.finalResult.timeline.find((entry) => entry.roundNumber === 1);
    const missingScore = roundOneArchive?.scores?.find((score) => score.memberId === missingVoter.id);
    assert(missingScore && missingScore.pointsAwarded <= 0, 'A missing voter received positive round points.');
    assert(roundOneArchive?.mission?.catalogId === 'M01', 'Final archive lost the mission catalog id.');
    const eliminatedScore = roundOneArchive?.scores?.find((score) => score.memberId === eliminatedOne);
    assert(eliminatedScore?.pointsAwarded === 0, 'The eliminated participant received round points.');

    console.log(JSON.stringify({
      status: 'success',
      gameId,
      rounds: view.finalResult.timeline.length,
      players: view.members.length,
      winnerId: view.finalResult.winnerId,
    }));
  } finally {
    if (gameId) {
      try {
        await rpc(host, 'meta_delete_own_game', { target_game_id: gameId });
      } catch (error) {
        console.error(`Cleanup failed: ${error.message}`);
      }
    }
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
