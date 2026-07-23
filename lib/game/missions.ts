import type { MissionDefinition } from "./types";

export const MISSIONS: readonly MissionDefinition[] = [
  {
    id: "common-oath",
    title: "Der gemeinsame Schwur",
    task:
      "Sorge dafür, dass mindestens fünf andere Spieler gemeinsam mit ihren Bechern anstoßen und dabei hörbar „Auf die Adria“ sagen. Du musst den Moment selbst auslösen, ohne die Formulierung auffällig vorzusagen.",
    successCriteria:
      "Mindestens fünf andere Spieler stoßen gleichzeitig an und der gemeinsame Ausspruch ist für André eindeutig hörbar. Der Millionär muss als Auslöser erkennbar sein.",
    timeWindow: "Von der Missionsfreigabe bis zum Beginn der Diskussion.",
    hostInstructions:
      "Beobachte, ob die Gruppe tatsächlich gemeinsam reagiert und der Impuls vom Millionär ausgeht. Ein zufälliger Trinkspruch ohne erkennbare Initiative zählt nicht.",
    difficulty: "leicht",
    suitablePhases: "Gut für Runde 1 und frühe, gesellige Spielphasen.",
    reserve: false,
  },
  {
    id: "double-messenger",
    title: "Der doppelte Bote",
    task:
      "Bringe zwei verschiedene Spieler unabhängig voneinander dazu, André jeweils ein Getränk zu bringen oder ausdrücklich anzubieten. Du darfst selbst nichts übergeben und nicht zweimal denselben Vorwand verwenden.",
    successCriteria:
      "André erlebt zwei getrennte Angebote oder Übergaben von zwei unterschiedlichen Spielern und kann den Einfluss des Millionärs nachvollziehen.",
    timeWindow: "Bis zum Ende der laufenden Challenge.",
    hostInstructions:
      "Notiere beide Personen und den jeweiligen Anlass. Eine gemeinsam organisierte Sammelbestellung zählt nur als ein Ereignis.",
    difficulty: "mittel",
    suitablePhases: "Geeignet für längere Challenge- oder Pausenabschnitte.",
    reserve: false,
  },
  {
    id: "guided-accusation",
    title: "Die gelenkte Anklage",
    task:
      "Sorge dafür, dass drei verschiedene Spieler André gegenüber denselben konkreten Verdächtigen nennen. Du darfst Zweifel streuen, aber niemanden direkt auffordern, zu André zu gehen.",
    successCriteria:
      "Drei einzelne Spieler nennen André vor der Abstimmung unabhängig voneinander denselben Namen.",
    timeWindow: "Bis zum offiziellen Beginn der Diskussion.",
    hostInstructions:
      "Zähle nur Aussagen, die dir persönlich und außerhalb einer gemeinsamen Gruppenäußerung gemacht werden. Der Millionär darf den Namen streuen, aber keine fertige Botenkette organisieren.",
    difficulty: "riskant",
    suitablePhases: "Besonders passend für Runde 3 oder 4 mit gefestigten Verdachtslinien.",
    reserve: false,
  },
  {
    id: "last-picture",
    title: "Das letzte Bild",
    task:
      "Initiiere ein Gruppenfoto mit André und mindestens fünf weiteren Spielern. Du musst die Gruppe zusammenbringen oder die Aufnahme ausdrücklich anstoßen.",
    successCriteria:
      "Auf dem entstandenen Foto sind André, der Millionär und mindestens fünf weitere Spieler zu sehen. Die Initiative ist dem Millionär zuzurechnen.",
    timeWindow: "Bis zur Rückkehr von der letzten Außen-Challenge.",
    hostInstructions:
      "Ein ohnehin geplantes Gruppenfoto zählt nur, wenn der Millionär die konkrete Aufnahme sichtbar vorantreibt oder organisiert.",
    difficulty: "mittel",
    suitablePhases: "Gut für spätere Runden und Tageslicht.",
    reserve: false,
  },
  {
    id: "seat-exchange",
    title: "Die stille Umbesetzung",
    task:
      "Bringe zwei Spieler dazu, ihre Sitzplätze vollständig miteinander zu tauschen. Der Tausch muss mindestens fünf Minuten bestehen bleiben und darf nicht als Spielauftrag angekündigt werden.",
    successCriteria:
      "Beide Spieler sitzen mindestens fünf Minuten auf den jeweils anderen Plätzen und André beobachtet den vollständigen Wechsel.",
    timeWindow: "30 Minuten ab Freigabe.",
    hostInstructions:
      "Merke dir Ausgangs- und Endplätze. Ein kurzfristiges Aufstehen, um jemanden vorbeizulassen, ist kein Sitzplatztausch.",
    difficulty: "leicht",
    suitablePhases: "Für ruhige Tisch- oder Lagerfeuerphasen.",
    reserve: true,
  },
  {
    id: "forbidden-question",
    title: "Die verbotene Frage",
    task:
      "Bringe einen anderen Spieler dazu, André ausdrücklich zu fragen, ob der Millionär nach der letzten Runde gewechselt hat. Du darfst die Frage nicht wörtlich vorsagen.",
    successCriteria:
      "André hört die vollständige Frage von einem anderen Spieler. Der Millionär hat die Nachfrage erkennbar ausgelöst, ohne sie zu diktieren.",
    timeWindow: "Bis zum Beginn der nächsten Challenge.",
    hostInstructions:
      "Eine allgemeine Diskussion über Rollenwechsel reicht nicht. Die Frage muss direkt an dich gerichtet sein.",
    difficulty: "mittel",
    suitablePhases: "Nur ab Runde 2 sinnvoll.",
    reserve: true,
  },
  {
    id: "two-suspects",
    title: "Das doppelte Geständnis",
    task:
      "Bringe denselben Spieler dazu, André innerhalb von 20 Minuten zwei unterschiedliche Hauptverdächtige zu nennen. Zwischen den Aussagen müssen mindestens drei Minuten liegen.",
    successCriteria:
      "Eine Person nennt André zwei verschiedene Namen mit ausreichendem zeitlichem Abstand.",
    timeWindow: "20 Minuten ab der ersten gezählten Aussage.",
    hostInstructions:
      "Notiere Zeit und Namen. Eine bloße Liste mehrerer möglicher Verdächtiger in einem Gespräch zählt nicht.",
    difficulty: "riskant",
    suitablePhases: "Für fortgeschrittene Runden mit beweglichen Verdachtslagen.",
    reserve: true,
  },
  {
    id: "same-object",
    title: "Die wandernde Reliquie",
    task:
      "Sorge dafür, dass drei verschiedene Spieler nacheinander denselben ungefährlichen Gegenstand an André übergeben. Jede Übergabe muss einen plausiblen eigenen Anlass haben.",
    successCriteria:
      "André erhält denselben Gegenstand dreimal von drei Personen. Getränke, Abstimmungszettel und persönliche Wertgegenstände sind ausgeschlossen.",
    timeWindow: "30 Minuten ab Freigabe.",
    hostInstructions:
      "Behalte den Gegenstand nach jeder Übergabe nur kurz und gib ihn so zurück, dass die Mission lösbar bleibt. Offensichtlich abgesprochene Staffelübergaben zählen nicht.",
    difficulty: "mittel",
    suitablePhases: "Für Bereiche mit frei verfügbaren Alltagsgegenständen.",
    reserve: true,
  },
  {
    id: "three-cheers",
    title: "Die dreifache Bestätigung",
    task:
      "Bringe drei verschiedene Spieler dazu, dir innerhalb von 25 Minuten jeweils ausdrücklich recht zu geben. Es müssen drei unterschiedliche Gesprächsthemen sein.",
    successCriteria:
      "Drei Personen äußern klar hörbar eine Zustimmung wie „stimmt“, „genau“ oder „da hast du recht“. André muss alle drei Situationen mitbekommen.",
    timeWindow: "25 Minuten ab Freigabe.",
    hostInstructions:
      "Zähle keine rein höflichen Begrüßungsfloskeln und keine drei Zustimmungen in derselben Gruppendiskussion.",
    difficulty: "leicht",
    suitablePhases: "Universell einsetzbar, besonders vor der Diskussion.",
    reserve: true,
  },
  {
    id: "borrowed-crown",
    title: "Die geliehene Krone",
    task:
      "Trage für mindestens zwei Minuten einen auffälligen Gegenstand eines anderen Spielers, nachdem diese Person ihn dir freiwillig überlassen hat. Du darfst nicht direkt erklären, dass es um eine Wette oder Aufgabe geht.",
    successCriteria:
      "Der Gegenstand ist klar einer anderen Person zuzuordnen, wird freiwillig übergeben und mindestens zwei Minuten sichtbar getragen.",
    timeWindow: "Bis zum Ende der aktuellen Phase.",
    hostInstructions:
      "Nur ungefährliche und unproblematische Gegenstände zulassen. Brillen mit Sehstärke, Medikamente, Schlüssel und intime Gegenstände sind ausgeschlossen.",
    difficulty: "leicht",
    suitablePhases: "Gut in lockeren Pausen und vor Challenges.",
    reserve: true,
  },
  {
    id: "camping-inspection",
    title: "Gundulas Qualitätskontrolle",
    task:
      "Bringe mindestens zwei Spieler dazu, denselben harmlosen Bereich des Camps kritisch zu begutachten – etwa einen Tisch, eine Kühlbox oder eine Zeltleine – und jeweils einen Verbesserungsvorschlag zu machen.",
    successCriteria:
      "Zwei verschiedene Spieler prüfen denselben Bereich und formulieren jeweils einen konkreten Vorschlag. André hört beide Vorschläge.",
    timeWindow: "30 Minuten ab Freigabe.",
    hostInstructions:
      "Die Mission ist ein kleiner Campingplatz-Seitenhieb. Keine echten Mängel erfinden, keine Besitzer konfrontieren und keine sicherheitsrelevanten Anlagen manipulieren.",
    difficulty: "mittel",
    suitablePhases: "Tagsüber und außerhalb laufender Wettkämpfe.",
    reserve: true,
  },
  {
    id: "oli-receipt",
    title: "Olis lückenlose Buchführung",
    task:
      "Bringe drei Spieler dazu, unabhängig voneinander nach einem Preis, einer Menge oder einer Rechnung zu fragen. Die Fragen dürfen sich auf Getränke, Essen, Material oder die Challenge beziehen.",
    successCriteria:
      "Drei verschiedene Personen stellen jeweils eine echte Zahlen- oder Kostenfrage, die André mithört.",
    timeWindow: "Bis zum Beginn der Abstimmung.",
    hostInstructions:
      "Die Fragen müssen organisch entstehen. Der Millionär darf Themen anstoßen, aber nicht drei Personen nacheinander dieselbe Frage stellen lassen.",
    difficulty: "mittel",
    suitablePhases: "Gut bei Vorbereitung, Einkauf oder Materialverteilung.",
    reserve: true,
  },
  {
    id: "false-memory",
    title: "Das flexible Gedächtnis",
    task:
      "Bringe zwei Spieler dazu, sich über den Ablauf eines früheren Moments uneinig zu werden. Du darfst eine mehrdeutige Erinnerung ansprechen, aber keine falsche Tatsachenbehauptung über ernste Themen erfinden.",
    successCriteria:
      "Zwei Personen vertreten hörbar unterschiedliche Versionen desselben harmlosen Ereignisses und André erlebt die Uneinigkeit.",
    timeWindow: "Bis zum Ende der Diskussion.",
    hostInstructions:
      "Nur harmlose Spiel-, Reise- oder Campingmomente zählen. Keine persönlichen Konflikte, Beziehungen oder sensiblen Erinnerungen instrumentalisieren.",
    difficulty: "riskant",
    suitablePhases: "Für Gruppen mit ausreichend gemeinsamem Erlebnismaterial.",
    reserve: true,
  },
  {
    id: "name-chain",
    title: "Die Kette der Zeugen",
    task:
      "Sorge dafür, dass dein Name innerhalb von zehn Minuten von vier verschiedenen Spielern hörbar genannt wird. Du darfst keine direkte Namensrunde starten.",
    successCriteria:
      "Vier verschiedene Personen sprechen den Namen des Millionärs aus; André hört oder bestätigt alle Nennungen.",
    timeWindow: "Zehn Minuten ab der ersten gezählten Namensnennung.",
    hostInstructions:
      "Ein gemeinsamer Ruf oder Gesang zählt nur als eine Nennung. Die vier Nennungen müssen aus getrennten Äußerungen stammen.",
    difficulty: "riskant",
    suitablePhases: "Gut während Teamorganisation oder lebhafter Diskussion.",
    reserve: true,
  },
  {
    id: "cold-case",
    title: "Der kalte Fall",
    task:
      "Bringe zwei verschiedene Spieler dazu, André ungefragt etwas Kaltes anzubieten oder auf etwas auffällig Kaltes hinzuweisen. Das können Getränke, Kühlakkus oder Wasser sein.",
    successCriteria:
      "Zwei getrennte Personen machen André zwei voneinander unabhängige kalte Angebote oder Hinweise.",
    timeWindow: "30 Minuten ab Freigabe.",
    hostInstructions:
      "Der Millionär darf Situationen vorbereiten, aber nicht beide Gegenstände selbst übergeben. Sicherheit und Lebensmittelhygiene beachten.",
    difficulty: "leicht",
    suitablePhases: "Besonders an warmen Tagen oder am See.",
    reserve: true,
  },
  {
    id: "silent-alliance",
    title: "Die Allianz ohne Vertrag",
    task:
      "Bringe zwei andere Spieler dazu, gemeinsam eine kleine Aufgabe zu übernehmen, die nichts mit einer offiziellen Challenge zu tun hat – etwa etwas holen, tragen, aufräumen oder prüfen.",
    successCriteria:
      "Die beiden Spieler arbeiten mindestens eine Minute gemeinsam an derselben freiwilligen Aufgabe. André erkennt den Einfluss des Millionärs.",
    timeWindow: "Bis zum Beginn der Diskussion.",
    hostInstructions:
      "Die Aufgabe muss harmlos, freiwillig und tatsächlich gemeinschaftlich sein. Offizielle Teamaufgaben zählen nicht.",
    difficulty: "mittel",
    suitablePhases: "Zwischen Programmpunkten und beim Camp-Alltag.",
    reserve: true,
  },
  {
    id: "echoed-word",
    title: "Das kontrollierte Echo",
    task:
      "Wähle ein ungewöhnliches, aber alltagstaugliches Wort und bringe drei andere Spieler dazu, dieses Wort innerhalb von 20 Minuten jeweils selbst auszusprechen. Du darfst das Wort höchstens zweimal selbst verwenden.",
    successCriteria:
      "Drei verschiedene Spieler sprechen dasselbe vorher bei André hinterlegte Wort aus.",
    timeWindow: "20 Minuten ab Hinterlegung des Wortes.",
    hostInstructions:
      "Lass das Zielwort vor Beginn diskret festlegen. Namen, Schimpfwörter und extrem häufige Wörter sind unzulässig.",
    difficulty: "riskant",
    suitablePhases: "Für längere Gespräche und kreative Millionäre.",
    reserve: true,
  },
  {
    id: "unanimous-choice",
    title: "Die kleine Volksabstimmung",
    task:
      "Sorge dafür, dass mindestens vier andere Spieler einer von dir vorgeschlagenen harmlosen Auswahl geschlossen zustimmen, etwa Musik, Snack, Sitzort oder Reihenfolge.",
    successCriteria:
      "Vier andere Spieler stimmen derselben konkreten Option sichtbar oder hörbar zu, ohne dass André die Entscheidung vorgibt.",
    timeWindow: "Bis zum Ende der laufenden Phase.",
    hostInstructions:
      "Die Auswahl darf keine Spielregel, Abstimmung oder sicherheitsrelevante Entscheidung betreffen. Gruppendruck nicht künstlich verschärfen.",
    difficulty: "mittel",
    suitablePhases: "Pausen, Essen und organisatorische Übergänge.",
    reserve: true,
  },
  {
    id: "third-person",
    title: "Der Mann in der dritten Person",
    task:
      "Bringe einen Spieler dazu, innerhalb eines Gesprächs zweimal von sich selbst in der dritten Person zu sprechen. Du darfst es vormachen, aber die Person nicht direkt dazu auffordern.",
    successCriteria:
      "Dieselbe Person verwendet den eigenen Namen oder eine eindeutige Selbstbezeichnung zweimal in der dritten Person. André hört beide Sätze.",
    timeWindow: "25 Minuten ab Freigabe.",
    hostInstructions:
      "Beide Formulierungen müssen natürlich Teil eines Gesprächs sein. Nachsprechen einer direkten Anweisung zählt nicht.",
    difficulty: "riskant",
    suitablePhases: "Für lockere, humorvolle Gesprächsrunden.",
    reserve: true,
  },
  {
    id: "final-toast",
    title: "Der Nachruf auf die Unschuld",
    task:
      "Initiiere einen kurzen Trinkspruch, in dem mindestens drei andere Spieler gemeinsam auf eine Person, ein Team oder das Wochenende anstoßen. Der Ausspruch darf den Millionär nicht erwähnen.",
    successCriteria:
      "Mindestens drei andere Spieler beteiligen sich hörbar und gleichzeitig an dem vom Millionär angestoßenen Moment.",
    timeWindow: "Bis zur nächsten Abstimmung.",
    hostInstructions:
      "Alkoholfreie Getränke sind gleichwertig. Der Trinkspruch muss freiwillig bleiben und darf niemanden bloßstellen.",
    difficulty: "leicht",
    suitablePhases: "Für Abendrunden oder das Finale.",
    reserve: true,
  },
] as const;

export function getMissionById(missionId?: string): MissionDefinition | undefined {
  return MISSIONS.find((mission) => mission.id === missionId);
}
