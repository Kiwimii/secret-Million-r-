from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing live patch target: {label}")
    return text.replace(old, new, 1)


path = Path("scripts/verify-akte-midas-live.cjs")
text = path.read_text()

text = replace_once(
    text,
    """    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: packageFor(1) });
    let view = await hostView(host, gameId);""",
    """    const oversizedPackage = packageFor(1);
    oversizedPackage.challenge = { ...oversizedPackage.challenge, catalogId: 'C08' };
    await expectRpcFailure(
      host,
      'meta_host_configure_round',
      { target_game_id: gameId, round_package: oversizedPackage },
      'mindestens 6 aktive Spieler',
    );

    await rpc(host, 'meta_host_configure_round', { target_game_id: gameId, round_package: packageFor(1) });
    let view = await hostView(host, gameId);""",
    "minimum-player enforcement",
)

text = replace_once(
    text,
    """    const eliminatedOne = roundOneResult.eliminatedId;
    assert(eliminatedOne === millionaireOne, 'Round one did not eliminate the deliberately exposed millionaire.');

    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });""",
    """    const eliminatedOne = roundOneResult.eliminatedId;
    assert(eliminatedOne === millionaireOne, 'Round one did not eliminate the deliberately exposed millionaire.');
    await expectRpcFailure(
      host,
      'meta_host_set_member_status',
      {
        target_game_id: gameId,
        target_member_id: eliminatedOne,
        new_attendance_status: null,
        new_competition_status: 'eligible',
        change_reason: 'regression-check',
      },
      'nicht wieder in die Wertung',
    );

    await rpc(host, 'meta_host_publish_result', { target_game_id: gameId });""",
    "irreversible elimination",
)

path.write_text(text)
Path(__file__).unlink(missing_ok=True)
