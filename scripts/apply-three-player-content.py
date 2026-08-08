from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


catalog_path = Path("lib/meta/catalogs.ts")
catalog = catalog_path.read_text()
if '"catalogId": "M21"' in catalog or '"catalogId": "C21"' in catalog:
    raise SystemExit("Three-player catalog entries already exist")

mission_tail = '''    "tags": ["gruppe", "einfluss", "lang"]
  }
];

export const CHALLENGE_CATALOG'''
mission_replacement = '''    "tags": ["gruppe", "einfluss", "lang"]
  },
  {
    "catalogId": "M21",
    "title": "Zweifaches Genau",
    "task": "Bringe die beiden anderen anwesenden Spieler dazu, innerhalb des Zeitfensters jeweils das Wort „genau“ zu sagen.",
    "successCriteria": "Beide anderen Spieler verwenden unabhängig voneinander mindestens einmal das Wort „genau“.",
    "timeWindow": "12 Minuten",
    "difficulty": "leicht",
    "minPlayers": 3,
    "requirements": "Mindestens drei anwesende Teilnehmer insgesamt.",
    "restriction": "Du darfst „genau“ selbst nicht verwenden und niemanden bitten, das Wort zu wiederholen.",
    "centralNote": "Zustimmung ist verdächtig. Zweifache Zustimmung gilt bereits als belastbares Muster.",
    "tags": ["gespräch", "wort", "3-spieler", "kurz"]
  },
  {
    "catalogId": "M22",
    "title": "Die kleine Umlaufbahn",
    "task": "Sorge dafür, dass derselbe harmlose Gegenstand nacheinander von beiden anderen Spielern in die Hand genommen oder benutzt wird.",
    "successCriteria": "Beide anderen Spieler berühren oder benutzen denselben ausgewählten Gegenstand nacheinander.",
    "timeWindow": "15 Minuten",
    "difficulty": "leicht",
    "minPlayers": 3,
    "requirements": "Ein harmloser Alltagsgegenstand wie Stift, Flaschenöffner oder Serviette.",
    "restriction": "Du darfst den zweiten Spieler nicht direkt auffordern, den Gegenstand zu nehmen.",
    "centralNote": "Bei drei Personen ist eine Umlaufbahn kurz. Die Beweiskette leider auch.",
    "tags": ["objekt", "beobachtung", "3-spieler"]
  },
  {
    "catalogId": "M23",
    "title": "Doppelter Verdacht",
    "task": "Bringe beide anderen Spieler dazu, im Verlauf der Runde jeweils hörbar einen konkreten Verdacht auf einen Teilnehmer auszusprechen.",
    "successCriteria": "Beide anderen Spieler nennen jeweils mindestens eine Person ausdrücklich als möglichen Millionär.",
    "timeWindow": "Bis zur Abstimmung",
    "difficulty": "mittel",
    "minPlayers": 3,
    "requirements": "Die Runde muss genügend Gesprächszeit vor der Abstimmung bieten.",
    "restriction": "Du darfst nicht direkt fragen, wen die Person verdächtigt, und keine Antwortoptionen vorgeben.",
    "centralNote": "Paranoia skaliert bemerkenswert gut nach unten.",
    "tags": ["verdacht", "gespräch", "3-spieler", "einfluss"]
  },
  {
    "catalogId": "M24",
    "title": "Gegenfragen",
    "task": "Sorge dafür, dass dir beide anderen Spieler innerhalb des Zeitfensters jeweils mindestens eine echte Frage stellen.",
    "successCriteria": "Jeder der beiden anderen Spieler richtet mindestens eine inhaltliche Frage an dich.",
    "timeWindow": "10 Minuten",
    "difficulty": "mittel",
    "minPlayers": 3,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Du darfst selbst keine Frage stellen und niemanden auffordern, dir eine Frage zu stellen.",
    "centralNote": "Wer Fragen stellt, sammelt Informationen. Wer sie provoziert, sammelt Punkte.",
    "tags": ["gespräch", "subtil", "3-spieler", "kurz"]
  }
];

export const CHALLENGE_CATALOG'''
catalog = replace_once(catalog, mission_tail, mission_replacement, "mission catalog tail")

challenge_tail = '''    "tags": ["mehrkampf", "finale", "getränkekompatibel"]
  }
];

export const BONUS_CATALOG'''
challenge_replacement = '''    "tags": ["mehrkampf", "finale", "getränkekompatibel"]
  },
  {
    "catalogId": "C21",
    "title": "Präzisionsduell",
    "briefing": "Jedes Team bestimmt pro Durchgang genau einen Werfer. Beide Teams erhalten unabhängig von ihrer Teamgröße jeweils fünf Würfe auf identische Zielbecher. Bei drei Spielern darf das Ein-Personen-Team denselben Werfer in allen Durchgängen einsetzen.",
    "winCondition": "Die meisten Treffer aus exakt fünf Würfen pro Team gewinnen; bei Gleichstand entscheidet je ein Stechwurf.",
    "duration": "5 Minuten",
    "material": "2 Zielbecher, Tischtennisbälle oder weiche Wurfsäckchen, Abwurflinie",
    "safety": "Nur leichte Wurfgegenstände verwenden und nicht in Richtung von Personen werfen.",
    "category": "Präzision",
    "minPlayers": 3,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Teamgröße ist keine Ausrede. Die Zielscheibe zeigt sich davon unbeeindruckt.",
    "tags": ["geschick", "3-spieler", "teamneutral", "drinnen"]
  },
  {
    "catalogId": "C22",
    "title": "Schätzbüro",
    "briefing": "Die Spielleitung stellt fünf vorbereitete Schätzfragen zu neutralen Themen. Jedes Team berät und gibt pro Frage genau eine gemeinsame Zahl ab. Die Lösungen werden erst nach beiden Antworten aufgedeckt.",
    "winCondition": "Pro Frage erhält das Team mit der näheren Schätzung einen Punkt; die meisten Punkte nach fünf Fragen gewinnen.",
    "duration": "7 Minuten",
    "material": "5 Schätzfragen mit Lösungen, Papier oder Notizfunktion",
    "safety": "Nur neutrale Wissens- und Alltagsfragen verwenden; keine persönlichen Daten schätzen.",
    "category": "Wissen & Schätzen",
    "minPlayers": 3,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Wissen ist Macht. Schätzen ist sein günstigerer Verwandter.",
    "tags": ["wissen", "3-spieler", "teamneutral", "drinnen"]
  },
  {
    "catalogId": "C23",
    "title": "Reaktionsfenster",
    "briefing": "In sechs kurzen Durchgängen tritt jeweils genau ein Vertreter pro Team an. Die Spielleitung deckt eine Farb- oder Symbolkarte auf; wer zuerst den passenden Gegenstand berührt, gewinnt den Durchgang. Ein größeres Team wechselt seine Vertreter, ein Ein-Personen-Team darf dieselbe Person einsetzen.",
    "winCondition": "Das erste Team mit vier gewonnenen Durchgängen gewinnt.",
    "duration": "6 Minuten",
    "material": "Farb- oder Symbolkarten, vier passende ungefährliche Gegenstände",
    "safety": "Gegenstände mit Abstand aufstellen; kein Schubsen, Rennen oder Greifen über andere Personen.",
    "category": "Reaktion",
    "minPlayers": 3,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Reflexe sind schnell. Nachträgliche Erklärungen meistens ausführlicher.",
    "tags": ["reaktion", "3-spieler", "teamneutral", "kurz"]
  },
  {
    "catalogId": "C24",
    "title": "Ein-Personen-Tresor",
    "briefing": "Jedes Team erhält dieselbe kurze Symbolfolge für fünf Sekunden. Danach wird sie verdeckt. Das Team darf beraten, aber nur ein benannter Vertreter legt die endgültige Reihenfolge. Gespielt werden vier Folgen mit steigender Länge.",
    "winCondition": "Jede vollständig richtige Folge gibt einen Punkt; bei Gleichstand entscheidet eine zusätzliche identische Stechfolge.",
    "duration": "6 Minuten",
    "material": "5 vorbereitete Symbolfolgen oder Kartenreihen",
    "safety": "Keine besonderen Risiken; gut lesbare Symbole verwenden.",
    "category": "Gedächtnis & Logik",
    "minPlayers": 3,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Ein Tresor respektiert keine Mehrheitsverhältnisse. Das macht ihn sympathisch.",
    "tags": ["gedächtnis", "logik", "3-spieler", "teamneutral"]
  }
];

export const BONUS_CATALOG'''
catalog = replace_once(catalog, challenge_tail, challenge_replacement, "challenge catalog tail")
catalog_path.write_text(catalog)

app_path = Path("app/demo/AkteMidasApp.tsx")
app = app_path.read_text()
app = replace_once(app, "const nextStep = availableCount < 4", "const nextStep = availableCount < 3", "three-player host guidance")
app = replace_once(
    app,
    "Mindestens vier anwesende Teilnehmer werden benötigt. Aktuell: ${availableCount}.",
    "Mindestens drei anwesende Teilnehmer werden benötigt. Aktuell: ${availableCount}.",
    "three-player host message",
)
app_path.write_text(app)

live_path = Path("scripts/verify-akte-midas-live.cjs")
live = live_path.read_text()
old_tail = '''run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});'''
new_tail = '''async function verifyThreePlayerCatalog() {
  const host = makeClient();
  const playerClients = [];
  let gameId;
  const stamp = `${Date.now()}`;
  try {
    await authenticate(host, 'three-player-host');
    const created = await rpc(host, 'meta_create_game', {
      game_title: `Akte-Midas-Three-${stamp}`,
      host_pin: '2486',
      requested_rounds: 2,
      requested_final_rule: 'classic',
      requested_notes_visibility: 'host',
    });
    gameId = created?.game_id;
    const joinCode = String(created?.join_code ?? '');
    assert(gameId && /^\\d{6}$/.test(joinCode), 'Three-player game creation failed.');

    for (const label of ['Drei-A', 'Drei-B', 'Drei-C']) {
      const client = makeClient();
      await authenticate(client, label);
      await rpc(client, 'meta_join_game', {
        raw_join_code: joinCode,
        requested_name: `${label}-${stamp.slice(-4)}`,
        player_pin: '1357',
        requested_avatar_path: null,
      });
      playerClients.push(client);
    }

    await expectRpcFailure(
      host,
      'meta_host_configure_round',
      { target_game_id: gameId, round_package: packageFor(1) },
      'mindestens 4 anwesende Teilnehmer',
    );

    const threePlayerPackage = packageFor(1);
    threePlayerPackage.mission = {
      ...threePlayerPackage.mission,
      catalogId: 'M21',
      title: 'Zweifaches Genau',
    };
    threePlayerPackage.challenge = {
      ...threePlayerPackage.challenge,
      catalogId: 'C21',
      title: 'Präzisionsduell',
    };
    await rpc(host, 'meta_host_configure_round', {
      target_game_id: gameId,
      round_package: threePlayerPackage,
    });
    await rpc(host, 'meta_host_draw_millionaire', { target_game_id: gameId, force_redraw: false });
    await rpc(host, 'meta_host_release_roles', { target_game_id: gameId });
    await rpc(host, 'meta_host_publish_mission', { target_game_id: gameId });
    await rpc(host, 'meta_host_draw_teams', { target_game_id: gameId });

    const view = await hostView(host, gameId);
    assert(view.currentRoundState.mission.catalogId === 'M21', 'Three-player mission was not stored.');
    assert(view.currentRoundState.challenge.catalogId === 'C21', 'Three-player challenge was not stored.');
    assert(Object.keys(view.currentRoundState.teams ?? {}).length === 3, 'Three-player teams were not published for all participants.');
    console.log(JSON.stringify({ status: 'three-player-success', gameId, players: 3, mission: 'M21', challenge: 'C21' }));
  } finally {
    if (gameId) {
      try {
        await rpc(host, 'meta_delete_own_game', { target_game_id: gameId });
      } catch (error) {
        console.error(`Three-player cleanup failed: ${error.message}`);
      }
    }
  }
}

run()
  .then(verifyThreePlayerCatalog)
  .catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });'''
live = replace_once(live, old_tail, new_tail, "three-player live verification")
live_path.write_text(live)

Path("scripts/apply-three-player-content.py").unlink()
Path(".github/workflows/apply-three-player-content.yml").unlink()
