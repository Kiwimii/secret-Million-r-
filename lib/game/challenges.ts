import type { ChallengeDefinition } from "./types";

export const CHALLENGES: readonly ChallengeDefinition[] = [
  {
    id: "operation-umkehrschub",
    title: "Operation Umkehrschub",
    publicName: "Flip Cup",
    category: "classic",
    duration: "10–20 Minuten",
    material: ["ein stabiler Tisch", "ein Becher pro Spieler", "Getränk oder Wasser"],
    playerBriefing:
      "Beide Teams stehen sich am Tisch gegenüber. Nacheinander wird der eigene Becher geleert, an die Tischkante gestellt und mit einem Fingerschnipp auf den Kopf geflippt. Erst nach einem erfolgreichen Flip darf die nächste Person starten.",
    hostInstructions:
      "Stelle gleich große Becher und identische Füllmengen bereit. Lege die Reihenfolge vor dem Start fest. Ein Flip zählt nur, wenn der Becher vollständig auf dem Rand oder Boden landet und stehen bleibt. Bei einem Fehlversuch probiert dieselbe Person weiter.",
    winCondition:
      "Das Team gewinnt, dessen letzte Person zuerst einen gültigen Flip abschließt.",
    safetyNote:
      "Wasser ist jederzeit zulässig. Niemand muss Alkohol trinken. Verschüttete Flüssigkeit sofort entfernen.",
    original: true,
  },
  {
    id: "fall-des-weissen-koenigs",
    title: "Der Fall des weißen Königs",
    publicName: "Flunkyball",
    category: "classic",
    duration: "20–35 Minuten",
    material: ["ein Zielgegenstand", "ein Wurfball", "ein Getränk pro Spieler", "zwei Markierungen"],
    playerBriefing:
      "Die Teams stehen sich in zwei Reihen gegenüber. Ein Team wirft auf den weißen König in der Mitte. Bei einem Treffer darf dieses Team trinken, während das andere Team Ziel und Ball zurückstellt. Sobald das verteidigende Team wieder bereit ist, ruft es laut Stopp.",
    hostInstructions:
      "Markiere gleiche Abstände und lege vorab fest, wann ein Getränk als leer gilt. Treffer zählen nur mit dem bereitgestellten Ball. Nach jedem Treffer müssen Ziel und Ball vollständig an ihren Ausgangspunkt zurückgebracht werden.",
    winCondition:
      "Das Team gewinnt, bei dem zuerst alle vorgesehenen Getränke regelkonform geleert sind.",
    safetyNote:
      "Alkoholfreie Getränke sind gleichwertig. Keine harten Bälle verwenden und ausreichend Abstand zu Zelten, Fahrzeugen und Unbeteiligten halten.",
    original: true,
  },
  {
    id: "protokoll-aquarius",
    title: "Protokoll Aquarius",
    publicName: "Wassertransport",
    category: "water",
    duration: "25–45 Minuten",
    material: ["zwei Zielbehälter mit Markierung", "Wasserquelle", "Startlinie"],
    playerBriefing:
      "Transportiert Wasser über ungefähr 200 Meter bis zu eurem Zielbehälter. Verwendet ausschließlich Gegenstände, die ihr vor Ort findet und nicht eigens für die Challenge mitgebracht habt. Ihr dürft beliebig oft laufen und eure Methode verändern.",
    hostInstructions:
      "Prüfe die Strecke vorab und markiere für beide Teams denselben Füllstand. Nicht erlaubt sind mitgebrachte Flaschen, Eimer oder Trinksysteme. Gegenstände dürfen nicht beschädigt, aus fremdem Besitz genommen oder aus der Natur herausgerissen werden.",
    winCondition:
      "Das Team gewinnt, dessen Zielbehälter zuerst sichtbar die festgelegte Markierung erreicht.",
    safetyNote:
      "Keine Glasgefäße, kein Rennen auf rutschigem Untergrund und keine Entnahme aus unsicheren oder geschützten Gewässern.",
    original: true,
  },
  {
    id: "midas-klammer",
    title: "Die Midas-Klammer",
    publicName: "Tausch-Challenge",
    category: "trade",
    duration: "60–120 Minuten",
    material: ["eine identische Wäscheklammer pro Team", "Handy für Beweisfotos"],
    playerBriefing:
      "Startet mit einer einfachen Klammer und tauscht sie außerhalb der Gruppe Schritt für Schritt gegen immer wertvollere oder außergewöhnlichere Gegenstände. Jeder Tausch muss freiwillig und nachvollziehbar sein.",
    hostInstructions:
      "Gib beiden Teams dieselbe Startklammer und eine feste Rückkehrzeit. Verboten sind Geldzahlungen, eigene Gegenstände als Zwischenhandel, Täuschung über den Zweck und das Betreten privater Bereiche ohne Erlaubnis. Dokumentiere die Tauschkette mit Fotos oder kurzen Notizen.",
    winCondition:
      "André entscheidet anhand von objektivem Wert, Originalität und nachvollziehbarer Tauschkette. Das stärkste Endobjekt gewinnt.",
    safetyNote:
      "Keine gefährlichen, illegalen, lebenden oder offensichtlich gestohlenen Gegenstände annehmen. Rücksichtsvoll und höflich auftreten.",
    original: true,
  },
  {
    id: "orbitale-frachtbruecke",
    title: "Orbitale Frachtbrücke",
    publicName: "Korken-Staffel",
    category: "skill",
    duration: "12–20 Minuten",
    material: ["zwei Esslöffel", "zwei Korken", "vier Wendemarkierungen"],
    playerBriefing:
      "Transportiert den Korken auf einem Löffel durch den markierten Parcours und zurück. Der Löffel wird nur am Griff gehalten. Fällt der Korken herunter, geht die laufende Person zum letzten Kontrollpunkt zurück.",
    hostInstructions:
      "Baue zwei identische, ungefährliche Parcours. Jede Person absolviert eine Runde und übergibt Löffel und Korken hinter der Startlinie. Handkontakt mit dem Korken ist nur beim Auflegen und bei der Übergabe erlaubt.",
    winCondition:
      "Das Team gewinnt, dessen letzte Person zuerst mit Korken und Löffel regelkonform die Ziellinie überquert.",
    safetyNote:
      "Keine scharfen Kurven, Stolperstellen oder Rennen auf nassem Boden. Metalllöffel nicht im Mund tragen.",
    original: false,
  },
  {
    id: "protokoll-stille",
    title: "Protokoll Stille",
    publicName: "Stumme Formation",
    category: "teamwork",
    duration: "8–15 Minuten",
    material: ["Start- und Ziellinie", "Stoppuhr"],
    playerBriefing:
      "Ordnet euch ohne ein gesprochenes Wort nach der vorgegebenen Eigenschaft, beispielsweise Geburtsmonat, Körpergröße oder Entfernung des Wohnorts. Gesten sind erlaubt, Schreiben und Handygebrauch nicht.",
    hostInstructions:
      "Nenne beiden Teams dieselbe eindeutige Sortieraufgabe. Starte die Zeit beim Kommando und stoppe, sobald das Team fertig meldet. Prüfe anschließend jede Position. Für jeden Fehler werden zehn Sekunden addiert.",
    winCondition:
      "Die niedrigste Zeit inklusive Strafsekunden gewinnt.",
    safetyNote:
      "Verwende keine sensiblen oder beschämenden Sortiermerkmale. Körperkontakt ist freiwillig.",
    original: false,
  },
  {
    id: "turm-der-sieben-siegel",
    title: "Turm der Sieben Siegel",
    publicName: "Konstruktionsduell",
    category: "teamwork",
    duration: "15–25 Minuten",
    material: ["20 Pappbecher pro Team", "10 Blatt Papier pro Team", "ein Meter Klebeband pro Team", "Maßband"],
    playerBriefing:
      "Baut aus dem bereitgestellten Material einen möglichst hohen freistehenden Turm. Nach Ablauf der Bauzeit darf niemand das Bauwerk berühren. Der Turm muss zehn Sekunden selbstständig stehen.",
    hostInstructions:
      "Teile exakt identisches Material aus und lege eine Bauzeit von zehn Minuten fest. Schneidwerkzeuge und zusätzliche Hilfsmittel sind nicht erlaubt. Miss vom Boden bis zum höchsten stabilen Punkt.",
    winCondition:
      "Der höchste Turm, der nach dem Loslassen zehn Sekunden stehen bleibt, gewinnt.",
    safetyNote:
      "Nur leichtes Material verwenden. Nicht auf Stühle, Tische oder Personen steigen.",
    original: false,
  },
  {
    id: "echo-matrix",
    title: "Echo-Matrix",
    publicName: "Musterübertragung",
    category: "mind",
    duration: "15–25 Minuten",
    material: ["zwei identische Sätze farbiger Becher oder Karten", "eine Sichtschutzwand", "Musterkarte"],
    playerBriefing:
      "Nur ein Bote darf das geheime Muster sehen. Er läuft zwischen Vorlage und Team hin und her und beschreibt, was gebaut werden muss. Er darf keine Gegenstände berühren. Das Team rekonstruiert das Muster ausschließlich nach seinen Angaben.",
    hostInstructions:
      "Baue hinter dem Sichtschutz für beide Teams dasselbe Muster. Pro Weg darf der Bote höchstens zehn Sekunden schauen. Fotos, Notizen und Zeigen auf die Vorlage sind verboten. Prüfe am Ende Position, Farbe und Ausrichtung.",
    winCondition:
      "Das erste vollständig korrekte Muster gewinnt. Bei Zeitablauf gewinnt das Team mit den meisten korrekten Positionen.",
    safetyNote:
      "Laufweg freihalten und die Vorlage so platzieren, dass kein anderes Team sie sehen kann.",
    original: false,
  },
  {
    id: "azur-pipeline",
    title: "Azur-Pipeline",
    publicName: "Becherkette",
    category: "water",
    duration: "12–20 Minuten",
    material: ["ein Becher pro Spieler", "zwei Startbehälter", "zwei Messbehälter"],
    playerBriefing:
      "Stellt euch in einer Reihe auf und gebt Wasser ausschließlich von Becher zu Becher nach hinten weiter. Niemand darf seinen Platz verlassen. Die letzte Person füllt den Zielbehälter.",
    hostInstructions:
      "Verwende für beide Teams dieselbe Wassermenge und identische Becher. Wasser darf nur aus dem eigenen Becher in den Becher der nächsten Person gegossen werden. Nachfüllen erfolgt ausschließlich am Startbehälter.",
    winCondition:
      "Nach fünf Minuten gewinnt das Team mit der größeren gemessenen Wassermenge im Zielbehälter.",
    safetyNote:
      "Nur draußen oder auf wasserfestem Untergrund spielen. Kein Werfen von Bechern und keine Glasgefäße.",
    original: false,
  },
  {
    id: "signalverlust",
    title: "Signalverlust",
    publicName: "Pantomime-Kette",
    category: "teamwork",
    duration: "12–20 Minuten",
    material: ["Begriffskarten", "Stoppuhr"],
    playerBriefing:
      "Die erste Person liest einen geheimen Begriff und stellt ihn der nächsten Person pantomimisch dar. Danach sieht nur die jeweils nächste Person die Darstellung. Am Ende nennt die letzte Person den vermuteten Begriff.",
    hostInstructions:
      "Stelle beide Teams so auf, dass immer nur zwei Personen die Darstellung sehen. Sprechen, Buchstaben, Zahlen und Gegenstände als direkte Hinweise sind verboten. Spiele drei Begriffe pro Team mit vergleichbarer Schwierigkeit.",
    winCondition:
      "Jeder korrekt übertragene Begriff bringt einen Punkt. Bei Gleichstand entscheidet die kürzere Gesamtzeit.",
    safetyNote:
      "Keine riskanten Bewegungen, Sprünge oder körperlich unangenehmen Darstellungen verlangen.",
    original: false,
  },
  {
    id: "nullpunkt-puzzle",
    title: "Nullpunkt-Puzzle",
    publicName: "Fragmentcode",
    category: "mind",
    duration: "12–25 Minuten",
    material: ["zwei identische zerschnittene Bild- oder Textpuzzles", "zwei Unterlagen"],
    playerBriefing:
      "Setzt die verstreuten Fragmente zu einem vollständigen Motiv oder Satz zusammen. Alle Personen dürfen gleichzeitig arbeiten. Das Puzzle darf erst nach dem Startsignal berührt werden.",
    hostInstructions:
      "Bereite zwei wirklich identische Puzzles mit 30 bis 50 Teilen vor. Mische jedes Set getrennt und kontrolliere, dass kein Teil fehlt. Ein Team meldet fertig und darf danach nichts mehr verändern, bis du geprüft hast.",
    winCondition:
      "Das erste vollständig korrekte Puzzle gewinnt.",
    safetyNote:
      "Keine sehr kleinen Teile verwenden, wenn Kinder oder Tiere in der Nähe sind. Papierkanten sauber schneiden.",
    original: false,
  },
  {
    id: "goldene-balance",
    title: "Goldene Balance",
    publicName: "Tablett-Parcours",
    category: "skill",
    duration: "12–20 Minuten",
    material: ["zwei stabile Tabletts", "je sechs leichte Gegenstände", "Wendemarkierungen"],
    playerBriefing:
      "Transportiert das beladene Tablett durch den Parcours. Das Tablett wird mit einer Hand getragen. Fällt ein Gegenstand herunter, muss die laufende Person am letzten Kontrollpunkt neu starten.",
    hostInstructions:
      "Belade beide Tabletts identisch und verwende nur leichte, unzerbrechliche Gegenstände. Jede Person läuft einmal. Übergabe erfolgt hinter der Startlinie, ohne dass Gegenstände festgehalten werden.",
    winCondition:
      "Das Team mit der schnellsten fehlerfreien Gesamtzeit gewinnt.",
    safetyNote:
      "Keine Glasflaschen, scharfen Gegenstände oder heißen Flüssigkeiten. Parcours ohne Stolperstellen wählen.",
    original: false,
  },
  {
    id: "archiv-der-schatten",
    title: "Archiv der Schatten",
    publicName: "Gedächtnisprüfung",
    category: "mind",
    duration: "10–18 Minuten",
    material: ["20 unterschiedliche Alltagsgegenstände", "Tuch", "Papier und Stift pro Team"],
    playerBriefing:
      "Ihr habt 60 Sekunden Zeit, euch alle sichtbaren Gegenstände einzuprägen. Danach wird der Tisch abgedeckt und ihr notiert gemeinsam so viele Gegenstände wie möglich.",
    hostInstructions:
      "Lege 20 klar unterscheidbare Gegenstände aus. Nach exakt 60 Sekunden deckst du alles vollständig ab. Schreibzeit sind drei Minuten. Doppelte, zu allgemeine oder nicht vorhandene Angaben zählen nicht.",
    winCondition:
      "Das Team mit den meisten korrekt benannten Gegenständen gewinnt.",
    safetyNote:
      "Keine privaten, wertvollen, gefährlichen oder leicht verwechselbaren Gegenstände verwenden.",
    original: false,
  },
  {
    id: "schmugglercode-dreizehn",
    title: "Schmugglercode 13",
    publicName: "Hinweis-Parcours",
    category: "mind",
    duration: "20–35 Minuten",
    material: ["fünf nummerierte Hinweisumschläge pro Team", "zwei identische Lösungsblätter"],
    playerBriefing:
      "Löst nacheinander fünf kurze Rätsel. Jede Lösung führt euch zum nächsten Umschlag. Die Reihenfolge muss eingehalten werden und alle Teammitglieder bleiben zusammen.",
    hostInstructions:
      "Verstecke zwei identische Hinweisketten an getrennten, gleich weit entfernten Orten. Jeder Umschlag enthält eine eindeutige Aufgabe und den Hinweis zum nächsten Standort. Gib pro Team höchstens einen Zeitstrafen-Hinweis von zwei Minuten.",
    winCondition:
      "Das Team gewinnt, das zuerst mit dem korrekten Endcode zurückkehrt.",
    safetyNote:
      "Nur frei zugängliche, sichere Orte nutzen. Nichts vergraben, auf Bäume klettern lassen oder in private Bereiche legen.",
    original: false,
  },
  {
    id: "kapselbergung",
    title: "Kapselbergung",
    publicName: "Distanzrettung",
    category: "teamwork",
    duration: "12–20 Minuten",
    material: ["zwei Seile", "zwei Reifen oder markierte Kreise", "zwei leichte Zielobjekte"],
    playerBriefing:
      "Bergt das Zielobjekt aus der markierten Sperrzone, ohne dass eine Person den Kreis betritt. Verwendet ausschließlich das bereitgestellte Seil und eure Zusammenarbeit.",
    hostInstructions:
      "Lege Objekt und Seil für beide Teams identisch aus. Berührt eine Person den Innenbereich, wird das Objekt zurückgesetzt. Das Seil darf geknotet und von mehreren Personen gehalten werden, aber nicht um Körperteile geschlungen werden.",
    winCondition:
      "Das Team gewinnt, das sein Objekt zuerst vollständig über die eigene Ziellinie bringt.",
    safetyNote:
      "Nur leichte Gegenstände und weiche Seile verwenden. Kein Ziehen am Körper und keine Schlaufen um Hals, Hände oder Füße.",
    original: false,
  },
  {
    id: "chronos-knoten",
    title: "Chronos-Knoten",
    publicName: "Menschenknoten",
    category: "teamwork",
    duration: "8–15 Minuten",
    material: ["freie ebene Fläche", "Stoppuhr"],
    playerBriefing:
      "Stellt euch im Kreis auf, greift mit jeder Hand eine andere Hand und löst den entstandenen Knoten, ohne loszulassen. Ziel ist wieder ein geschlossener oder sauber verbundener Kreis.",
    hostInstructions:
      "Prüfe vor dem Start, dass niemand beide Hände derselben Person hält und keine direkten Nachbarn verbunden sind. Stoppe die Zeit, sobald ein stabiler Kreis oder zwei sauber getrennte Kreise entstanden sind.",
    winCondition:
      "Das Team mit der kürzeren Lösungszeit gewinnt. Bei unlösbarem Knoten ist ein Neustart mit 60 Strafsekunden erlaubt.",
    safetyNote:
      "Langsam bewegen, keine Gelenke verdrehen und sofort stoppen, wenn jemand Schmerzen oder Unwohlsein meldet.",
    original: false,
  },
] as const;

export function getChallengeById(
  challengeId?: string,
): ChallengeDefinition | undefined {
  return CHALLENGES.find((challenge) => challenge.id === challengeId);
}
