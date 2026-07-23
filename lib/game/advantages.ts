import type { AdvantageDefinition } from "./types";

export const ADVANTAGES: readonly AdvantageDefinition[] = [
  {
    id: "r1-double-vote",
    round: 1,
    title: "Echo der Krone",
    effect: "double_vote",
    description: "Der persönliche Abstimmungszettel des Millionärs zählt zweimal.",
    playerInstructions:
      "Deine eigene Stimme erhält ein Echo. Der Name, den du in der Hauptabstimmung auswählst, bekommt insgesamt zwei Stimmen von dir. Du musst André vor Abschluss der Abstimmung verdeckt bestätigen, dass du den Vorteil einsetzt.",
    hostInstructions:
      "Prüfe, dass der Millionär selbst abgestimmt hat. Addiere nach der regulären Zählung genau eine weitere Stimme auf sein gewähltes Ziel. Zeige nicht, von welchem Zettel die Zusatzstimme stammt.",
    limit: "Nur Hauptabstimmung. Gilt nicht erneut in einer Stichwahl.",
    selectionMode: "none",
    reserve: false,
  },
  {
    id: "r2-block-vote",
    round: 2,
    title: "Siegel des Schweigens",
    effect: "block_vote",
    description: "Die persönliche Stimme eines vorher bestimmten anderen Spielers wird ignoriert.",
    playerInstructions:
      "Bestimme vor der Auswertung genau einen anderen stimmberechtigten Spieler. Dessen komplette Hauptstimme wird entfernt, unabhängig davon, wen die Person gewählt hat.",
    hostInstructions:
      "Lass den Millionär vor der Auswertung einen anderen Wähler festlegen. Ziehe dessen Stimme beim regulär gewählten Ziel ab und notiere den Wähler als verdeckt blockiert.",
    limit: "Der Millionär darf sich nicht selbst wählen. Nur Hauptabstimmung.",
    selectionMode: "voter",
    reserve: false,
  },
  {
    id: "r3-two-shadow-votes",
    round: 3,
    title: "Doppelter Schatten",
    effect: "add_two_votes",
    description: "Ein vorher genanntes Ziel erhält zwei zusätzliche Stimmen.",
    playerInstructions:
      "Wähle vor der Auswertung einen noch gewinnberechtigten Spieler. Nach der normalen Zählung erhält diese Person zwei zusätzliche Stimmen. Du darfst dich selbst als Ziel wählen.",
    hostInstructions:
      "Speichere das Ziel vor der Auswertung. Addiere nach der regulären Zählung exakt zwei wirksame Stimmen auf diese Person und kennzeichne sie als Vorteilskorrektur.",
    limit: "Nur Hauptabstimmung. Das Ziel muss gewinnberechtigt und anwesend sein.",
    selectionMode: "target",
    reserve: false,
  },
  {
    id: "r4-redirect",
    round: 4,
    title: "Goldene Umleitung",
    effect: "redirect_one_vote",
    description: "Eine Stimme gegen den Millionär wird auf einen anderen Kandidaten umgeleitet.",
    playerInstructions:
      "Bestimme vor der Auswertung einen anderen gewinnberechtigten Spieler. Liegt mindestens eine Stimme gegen dich vor, wird genau eine davon entfernt und deinem Ziel zugerechnet.",
    hostInstructions:
      "Prüfe zuerst, ob der Millionär reguläre Stimmen erhalten hat. Ziehe dann genau eine Stimme bei ihm ab und addiere sie beim vorab festgelegten Ziel. Ohne Stimme gegen den Millionär verfällt der Vorteil.",
    limit: "Nur Hauptabstimmung. Das Ziel darf nicht der Millionär selbst sein.",
    selectionMode: "target",
    reserve: false,
  },
  {
    id: "reserve-one-shadow-vote",
    reserve: true,
    title: "Flüstern im Dunkeln",
    effect: "add_one_vote",
    description: "Ein vorab genanntes Ziel erhält eine zusätzliche Stimme.",
    playerInstructions:
      "Wähle einen gewinnberechtigten Spieler. Nach der regulären Zählung erhält diese Person eine zusätzliche Schattenstimme. Selbstwahl ist erlaubt.",
    hostInstructions:
      "Addiere nach der regulären Zählung eine Stimme auf das gespeicherte Ziel und führe sie getrennt als Vorteilskorrektur auf.",
    limit: "Nur Hauptabstimmung.",
    selectionMode: "target",
  },
  {
    id: "reserve-blind-vote",
    reserve: true,
    title: "Das blinde Urteil",
    effect: "ignore_eliminated_vote",
    description: "Die Stimme eines bereits ausgeschiedenen Spielers wird ignoriert.",
    playerInstructions:
      "Wähle vor der Auswertung einen anwesenden Spieler, der bereits aus dem Gewinnerpool ausgeschieden ist. Seine Hauptstimme wird vollständig entfernt.",
    hostInstructions:
      "Prüfe, dass der ausgewählte Wähler tatsächlich ausgeschieden, aber noch anwesend und stimmberechtigt ist. Ziehe seine Stimme beim gewählten Ziel ab.",
    limit: "Nur gegen die Stimme eines bereits ausgeschiedenen Spielers. Nur Hauptabstimmung.",
    selectionMode: "voter",
  },
  {
    id: "reserve-protect-other",
    reserve: true,
    title: "Schild der falschen Krone",
    effect: "protect_other",
    description: "Eine Stimme gegen einen anderen gewinnberechtigten Spieler wird gestrichen.",
    playerInstructions:
      "Schütze vor der Abstimmung einen anderen gewinnberechtigten Spieler. Nach der Zählung wird eine reguläre Stimme gegen diese Person entfernt. Du darfst dich nicht selbst schützen.",
    hostInstructions:
      "Speichere die geschützte Person vor der Auswertung. Liegt mindestens eine reguläre Stimme gegen sie vor, ziehe genau eine ab. Ohne Stimme verfällt der Schutz.",
    limit: "Kein Selbstschutz. Nur Hauptabstimmung.",
    selectionMode: "target",
  },
  {
    id: "reserve-tie-priority",
    reserve: true,
    title: "Vorrecht des Korkens",
    effect: "tie_priority",
    description: "Ist der Millionär Teil eines Gleichstands, scheidet ein vorher bestimmter Mitkonkurrent aus.",
    playerInstructions:
      "Bestimme vor der Auswertung einen anderen Kandidaten. Falls du und diese Person nach allen Korrekturen gemeinsam auf dem höchsten Stimmenwert liegen, scheidet diese Person ohne Stichwahl aus.",
    hostInstructions:
      "Der Vorteil greift nur, wenn Millionär und gespeicherter Gegner tatsächlich beide zur Spitzengruppe gehören. Bei mehr als zwei Gleichstehenden bleibt die vorab festgelegte Zielperson maßgeblich.",
    limit: "Nur bei der ersten Hauptauswertung. Nicht in einer Stichwahl.",
    selectionMode: "tie_opponent",
  },
  {
    id: "new-golden-alibi",
    reserve: true,
    isNew: true,
    title: "Das goldene Alibi",
    effect: "remove_vote_against_self",
    description: "Eine reguläre Stimme gegen den Millionär verschwindet.",
    playerInstructions:
      "Nach der regulären Zählung wird eine Stimme gegen dich entfernt. Du musst keine Zielperson wählen. Hat niemand gegen dich gestimmt, verfällt das Alibi.",
    hostInstructions:
      "Prüfe die regulären Stimmen gegen den Millionär. Ziehe höchstens eine Stimme ab und dokumentiere die Korrektur. Es wird keine Ersatzstimme verteilt.",
    limit: "Nur Hauptabstimmung. Entfernt maximal eine vorhandene Stimme.",
    selectionMode: "none",
  },
  {
    id: "new-double-agent",
    reserve: true,
    isNew: true,
    title: "Der Doppelagent",
    effect: "redirect_selected_vote",
    description: "Die Stimme eines bestimmten Wählers wird auf ein neues Ziel umgeleitet.",
    playerInstructions:
      "Wähle verdeckt einen anderen Wähler und ein gewinnberechtigtes Ziel. Die Stimme dieses Wählers zählt nicht für seine tatsächliche Auswahl, sondern für dein festgelegtes Ziel.",
    hostInstructions:
      "Finde den Zettel des gewählten Wählers, ziehe eine Stimme beim ursprünglich beschuldigten Spieler ab und addiere eine Stimme beim gespeicherten Ziel. Die betroffene Person erfährt nichts.",
    limit: "Nur Hauptabstimmung. Wähler und neues Ziel müssen vor der Auswertung feststehen.",
    selectionMode: "target_and_voter",
  },
  {
    id: "new-boomerang",
    reserve: true,
    isNew: true,
    title: "Bumerang-Protokoll",
    effect: "bounce_vote_to_voter",
    description: "Die Stimme eines gewählten Spielers fällt auf ihn selbst zurück.",
    playerInstructions:
      "Bestimme einen anderen noch gewinnberechtigten Wähler. Seine abgegebene Stimme wird beim ursprünglichen Ziel entfernt und stattdessen gegen ihn selbst gezählt.",
    hostInstructions:
      "Der ausgewählte Wähler muss selbst ein zulässiges Abstimmungsziel sein. Ziehe seine Stimme beim ursprünglichen Ziel ab und addiere sie bei ihm selbst.",
    limit: "Nur Hauptabstimmung. Nicht auf ausgeschiedene oder abgereiste Wähler anwendbar.",
    selectionMode: "voter",
  },
  {
    id: "new-twin-shadows",
    reserve: true,
    isNew: true,
    title: "Zwillingsschatten",
    effect: "split_shadow_votes",
    description: "Zwei unterschiedliche Ziele erhalten jeweils eine zusätzliche Stimme.",
    playerInstructions:
      "Bestimme zwei verschiedene gewinnberechtigte Spieler. Nach der regulären Zählung erhält jede der beiden Personen eine zusätzliche Stimme. Du darfst eines der Ziele selbst sein.",
    hostInstructions:
      "Prüfe, dass beide Ziele verschieden und zulässig sind. Addiere jeweils eine Stimme und führe beide Korrekturen getrennt auf.",
    limit: "Nur Hauptabstimmung. Zwei unterschiedliche Ziele erforderlich.",
    selectionMode: "two_targets",
  },
  {
    id: "new-false-trail",
    reserve: true,
    isNew: true,
    title: "Die falsche Fährte",
    effect: "move_vote_between_targets",
    description: "Eine Stimme wird von einem Kandidaten zu einem anderen verschoben.",
    playerInstructions:
      "Bestimme ein Ausgangsziel und ein anderes Endziel. Liegt beim Ausgangsziel mindestens eine reguläre Stimme, wird genau eine davon entfernt und dem Endziel zugerechnet.",
    hostInstructions:
      "Speichere beide Ziele vor der Auswertung. Ziehe beim Ausgangsziel höchstens eine vorhandene reguläre Stimme ab und addiere sie beim Endziel. Ohne Ausgangsstimme verfällt der Vorteil.",
    limit: "Nur Hauptabstimmung. Ausgangs- und Endziel müssen verschieden sein.",
    selectionMode: "source_and_target",
  },
  {
    id: "new-midas-echo",
    reserve: true,
    isNew: true,
    title: "Midas-Echo",
    effect: "conditional_shadow_vote",
    description: "Ein Ziel mit mindestens einer regulären Stimme erhält eine weitere Stimme.",
    playerInstructions:
      "Wähle einen gewinnberechtigten Spieler. Hat diese Person bereits mindestens eine reguläre Stimme, kommt eine zusätzliche Stimme hinzu. Hat niemand sie gewählt, verfällt der Effekt.",
    hostInstructions:
      "Prüfe zunächst nur die reguläre Zählung. Addiere eine Vorteilskorrektur von plus eins, wenn das gespeicherte Ziel mindestens eine reguläre Stimme besitzt.",
    limit: "Nur Hauptabstimmung. Benötigt mindestens eine reguläre Stimme auf dem Ziel.",
    selectionMode: "target",
  },
  {
    id: "new-fog-wall",
    reserve: true,
    isNew: true,
    title: "Nebelwand 2.0",
    effect: "cap_target_votes",
    description: "Die regulären Stimmen eines Ziels werden auf höchstens zwei begrenzt.",
    playerInstructions:
      "Wähle einen gewinnberechtigten Spieler. Erhält diese Person drei oder mehr reguläre Stimmen, werden alle Stimmen oberhalb von zwei entfernt. Bei null bis zwei Stimmen geschieht nichts.",
    hostInstructions:
      "Zähle zuerst regulär. Berechne anschließend die negative Korrektur, die nötig ist, um das gewählte Ziel auf maximal zwei wirksame Stimmen zu begrenzen.",
    limit: "Nur Hauptabstimmung. Andere Vorteilskorrekturen werden danach normal berücksichtigt.",
    selectionMode: "target",
  },
  {
    id: "new-cork-clause",
    reserve: true,
    isNew: true,
    title: "Die Korken-Klausel",
    effect: "self_tie_break",
    description: "Ein Spitzengleichstand mit dem Millionär wird zu seinen Gunsten aufgelöst.",
    playerInstructions:
      "Bist du nach der regulären Zählung und allen übrigen Korrekturen Teil eines Gleichstands um Platz eins, wird eine Stimme gegen dich entfernt. Dadurch fällt die höchste Beschuldigung auf die übrigen Gleichstehenden.",
    hostInstructions:
      "Berechne zunächst alle normalen Korrekturen. Liegt der Millionär danach gemeinsam mit mindestens einer anderen Person auf dem Höchstwert, ziehe genau eine Stimme bei ihm ab und ermittle die Spitze neu.",
    limit: "Nur Hauptabstimmung. Greift ausschließlich bei einem tatsächlichen Spitzengleichstand.",
    selectionMode: "none",
  },
] as const;

export function getAdvantageById(
  advantageId?: string,
): AdvantageDefinition | undefined {
  return ADVANTAGES.find((advantage) => advantage.id === advantageId);
}
