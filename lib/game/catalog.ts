import type { MissionDefinition } from "./types";

export const MISSIONS: readonly MissionDefinition[] = [
  {
    id: "r1-common-oath",
    round: 1,
    reserve: false,
    title: "Der gemeinsame Schwur",
    task: "Sorge dafür, dass mindestens fünf andere Spieler gemeinsam mit ihren Bechern anstoßen und dabei hörbar „Auf die Adria“ sagen. Du musst den Moment erkennbar anstoßen oder auslösen, ohne die Mission zu nennen.",
    successCriteria: "Der Spielleiter muss den Auslöser und den gemeinsamen Ausspruch selbst sehen und hören.",
    timeWindow: "Ab Ausgabe der Mission bis zum Beginn der Diskussionsphase.",
  },
  {
    id: "r2-double-messenger",
    round: 2,
    reserve: false,
    title: "Der doppelte Bote",
    task: "Bringe zwei verschiedene Spieler unabhängig voneinander dazu, dem Spielleiter jeweils ein Getränk zu bringen oder anzubieten. Verwende nicht dieselben Worte und erwähne die Mission nicht.",
    successCriteria: "Der Spielleiter muss beide Übergaben oder Angebote persönlich erleben und erkennen, dass sie durch dich ausgelöst wurden.",
    timeWindow: "Ab Ausgabe der Mission bis zum Ende der Challenge.",
  },
  {
    id: "r3-guided-accusation",
    round: 3,
    reserve: false,
    title: "Die gelenkte Anklage",
    task: "Sorge dafür, dass drei verschiedene Spieler dem Spielleiter gegenüber denselben konkreten Verdächtigen nennen. Du darfst den Verdächtigen streuen, aber niemanden ausdrücklich zum Spielleiter schicken.",
    successCriteria: "Der Spielleiter muss alle drei Aussagen selbst hören. Sie müssen vor der Abstimmung erfolgen.",
    timeWindow: "Ab Ausgabe der Mission bis zum Beginn der offiziellen Diskussion.",
  },
  {
    id: "r4-last-picture",
    round: 4,
    reserve: false,
    title: "Das letzte Bild",
    task: "Sorge dafür, dass mindestens fünf andere Spieler gemeinsam mit dem Spielleiter für ein Gruppenfoto posieren. Du musst die Aufnahme oder das Zusammenstellen der Gruppe erkennbar initiieren.",
    successCriteria: "Der Spielleiter muss Teil des Fotos sein und erkennen, dass du die Situation ausgelöst hast.",
    timeWindow: "Ab Ausgabe der Mission bis zur Rückkehr von der Tausch-Challenge.",
  },
  {
    id: "reserve-seat-swap",
    reserve: true,
    title: "Platzwechsel",
    task: "Bringe zwei bestimmte Spieler dazu, ihre Sitzplätze miteinander zu tauschen, während der Spielleiter anwesend ist. Ein praktischer Vorwand ist erlaubt.",
    successCriteria: "Der Spielleiter muss den vollständigen Tausch sehen und erkennen, dass er auf deine Initiative zurückgeht.",
    timeWindow: "30 Minuten ab Ausgabe.",
  },
  {
    id: "reserve-forbidden-question",
    reserve: true,
    title: "Die verbotene Frage",
    task: "Bringe einen anderen Spieler dazu, den Spielleiter ausdrücklich zu fragen, ob der Millionär nach der letzten Runde gewechselt hat. Du darfst die Frage nicht wörtlich vorsagen.",
    successCriteria: "Der Spielleiter muss die vollständige Frage persönlich hören.",
    timeWindow: "Bis zum Beginn der nächsten Challenge.",
  },
  {
    id: "reserve-two-suspects",
    reserve: true,
    title: "Zwei Verdächtige",
    task: "Bringe denselben Spieler dazu, dem Spielleiter innerhalb von 20 Minuten zwei unterschiedliche Verdächtige zu nennen.",
    successCriteria: "Der Spielleiter muss beide Namen selbst hören. Zwischen beiden Aussagen müssen mindestens drei Minuten liegen.",
    timeWindow: "20 Minuten ab der ersten Aussage.",
  },
  {
    id: "reserve-object",
    reserve: true,
    title: "Der Gegenstand",
    task: "Sorge dafür, dass drei verschiedene Spieler nacheinander denselben beliebigen Gegenstand an den Spielleiter übergeben. Unterschiedliche Gründe sind erlaubt.",
    successCriteria: "Der Spielleiter muss alle drei Übergaben sehen. Eigene Getränke und Abstimmungszettel sind ausgeschlossen.",
    timeWindow: "30 Minuten ab Ausgabe.",
  },
] as const;

export { ADVANTAGES, getAdvantageById } from "./advantages";
