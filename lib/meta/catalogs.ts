import type { ChallengeDefinition, EffectDefinition, MissionDefinition } from "./types";

export type MissionDifficulty = "leicht" | "mittel" | "anspruchsvoll";

export interface MissionCatalogEntry extends MissionDefinition {
  catalogId: string;
  difficulty: MissionDifficulty;
  minPlayers: number;
  requirements: string;
  restriction: string;
  centralNote: string;
  tags: string[];
}

export interface ChallengeCatalogEntry extends ChallengeDefinition {
  catalogId: string;
  category: string;
  minPlayers: number;
  drinkRule: string;
  centralNote: string;
  tags: string[];
}

export interface EffectCatalogEntry extends EffectDefinition {
  catalogId: string;
}

export const MISSION_CATALOG: MissionCatalogEntry[] = [
  {
    "catalogId": "M01",
    "title": "Operation Ehrlich",
    "task": "Bringe drei verschiedene Spieler dazu, das Wort „ehrlich“ oder die Formulierung „ehrlich gesagt“ auszusprechen.",
    "successCriteria": "Drei unterschiedliche Personen verwenden innerhalb des Zeitfensters mindestens eine der beiden Formulierungen.",
    "timeWindow": "15 Minuten",
    "difficulty": "leicht",
    "minPlayers": 4,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Du darfst das Zielwort selbst nicht verwenden und niemanden zum Wiederholen auffordern.",
    "centralNote": "Ehrlichkeit ist selten. Drei dokumentierte Fälle gelten bereits als statistische Auffälligkeit.",
    "tags": ["gespräch", "kurz", "wort"]
  },
  {
    "catalogId": "M02",
    "title": "Der diskrete Toast",
    "task": "Sorge dafür, dass mindestens vier Spieler gemeinsam ihre Getränke heben und anstoßen.",
    "successCriteria": "Vier Personen heben ihre Getränke im selben Moment und stoßen gemeinsam an.",
    "timeWindow": "15 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Getränke müssen vorhanden sein; alkoholfreie Getränke zählen vollständig.",
    "restriction": "Du darfst weder „Prost“, „anstoßen“ noch „Toast“ sagen und nicht als erste Person das Glas heben.",
    "centralNote": "Ein guter Toast beginnt mit Charme. Ein schlechter meist ebenfalls.",
    "tags": ["gruppe", "getränk", "sozial"]
  },
  {
    "catalogId": "M03",
    "title": "Neuordnung der Verhältnisse",
    "task": "Veranlasse zwei andere Spieler dazu, freiwillig ihre Sitzplätze zu tauschen.",
    "successCriteria": "Zwei Spieler wechseln vollständig ihre bisherigen Plätze.",
    "timeWindow": "20 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Es müssen feste Sitzplätze vorhanden sein.",
    "restriction": "Du darfst keinen direkten Platztausch vorschlagen oder anordnen.",
    "centralNote": "Sitzordnungen sind Machtstrukturen mit Rückenlehne.",
    "tags": ["gruppe", "beobachtung", "raum"]
  },
  {
    "catalogId": "M04",
    "title": "Die wandernde Akte",
    "task": "Sorge dafür, dass ein harmloser Gegenstand nacheinander durch die Hände von drei anderen Spielern geht.",
    "successCriteria": "Drei unterschiedliche Spieler halten den ausgewählten Gegenstand nacheinander.",
    "timeWindow": "15 Minuten",
    "difficulty": "leicht",
    "minPlayers": 4,
    "requirements": "Ein kleiner Gegenstand wie Stift, Serviette oder Flaschenöffner.",
    "restriction": "Nach der ersten Übergabe darfst du den Gegenstand nicht selbst zurücknehmen.",
    "centralNote": "Informationen sollen zirkulieren. Beweismittel offenbar auch.",
    "tags": ["objekt", "kurz", "beobachtung"]
  },
  {
    "catalogId": "M05",
    "title": "Erzwungener Konsens",
    "task": "Bringe mindestens drei Spieler dazu, derselben harmlosen Aussage oder Entscheidung ausdrücklich zuzustimmen.",
    "successCriteria": "Drei Personen äußern hörbare Zustimmung zum selben Thema.",
    "timeWindow": "15 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Das Thema darf keine Spielregel oder reale Konfliktfrage betreffen.",
    "restriction": "Du darfst keine formelle Abstimmung ausrufen und nicht direkt fragen, ob alle einverstanden sind.",
    "centralNote": "Konsens ist der Moment, in dem mehrere Personen denselben Fehler gemeinsam begehen.",
    "tags": ["gespräch", "gruppe", "einfluss"]
  },
  {
    "catalogId": "M06",
    "title": "Die Revision",
    "task": "Bringe einen Spieler dazu, seinen zuvor offen geäußerten Verdacht auf eine andere Person zu ändern.",
    "successCriteria": "Die Person erklärt hörbar, dass sie nun jemand anderen verdächtigt.",
    "timeWindow": "Bis zur Abstimmung",
    "difficulty": "anspruchsvoll",
    "minPlayers": 4,
    "requirements": "Ein Spieler muss zuvor einen Verdacht geäußert haben.",
    "restriction": "Du darfst keine konkrete neue Zielperson nennen.",
    "centralNote": "Überzeugung ist beweglich. Besonders unter sozialem Druck.",
    "tags": ["verdacht", "einfluss", "lang"]
  },
  {
    "catalogId": "M07",
    "title": "Der Pflichtverteidiger",
    "task": "Bringe einen Spieler dazu, einen anderen Teilnehmer gegen einen geäußerten Verdacht zu verteidigen.",
    "successCriteria": "Eine Person erklärt hörbar, warum eine andere vermutlich nicht der Millionär ist.",
    "timeWindow": "20 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Mindestens ein Verdacht muss im Raum stehen.",
    "restriction": "Du darfst die Verteidigung nicht selbst beginnen oder wörtlich verlangen.",
    "centralNote": "Jeder Verdächtige verdient eine Verteidigung. Manche sogar eine glaubwürdige.",
    "tags": ["verdacht", "gespräch", "einfluss"]
  },
  {
    "catalogId": "M08",
    "title": "Drei Fragen später",
    "task": "Drei verschiedene Spieler müssen dir jeweils eine Frage stellen.",
    "successCriteria": "Drei unterschiedliche Personen richten innerhalb des Zeitfensters mindestens eine echte Frage an dich.",
    "timeWindow": "10 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Du darfst selbst keine Frage stellen und niemanden auffordern, dir etwas zu fragen.",
    "centralNote": "Interesse lässt sich nicht erzwingen. Neugier offenbar schon.",
    "tags": ["gespräch", "kurz", "subtil"]
  },
  {
    "catalogId": "M09",
    "title": "Eitelkeit als Waffe",
    "task": "Erhalte zwei echte positive Bemerkungen von zwei unterschiedlichen Spielern.",
    "successCriteria": "Zwei Personen machen dir unabhängig voneinander ein erkennbares Kompliment.",
    "timeWindow": "20 Minuten",
    "difficulty": "anspruchsvoll",
    "minPlayers": 4,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Kein direktes Einfordern, keine Frage nach Aussehen oder Leistung und keine demonstrative Selbstabwertung.",
    "centralNote": "Eitelkeit ist eine Schwachstelle. Gelegentlich auch eine Kernkompetenz.",
    "tags": ["gespräch", "subtil", "sozial"]
  },
  {
    "catalogId": "M10",
    "title": "Das Gruppenbild",
    "task": "Sorge dafür, dass mindestens vier Personen gemeinsam für ein Foto posieren.",
    "successCriteria": "Das Gruppenbild wird tatsächlich aufgenommen.",
    "timeWindow": "20 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Ein Gerät mit Kamera muss verfügbar sein.",
    "restriction": "Du darfst die Wörter „Foto“, „Bild“, „Selfie“ und „Kamera“ nicht verwenden.",
    "centralNote": "Jede Operation braucht Dokumentation. Manche brauchen Beweise, dass alle tatsächlich anwesend waren.",
    "tags": ["gruppe", "objekt", "sozial"]
  },
  {
    "catalogId": "M11",
    "title": "Kontrollierter Countdown",
    "task": "Bringe mindestens vier Spieler dazu, gemeinsam von drei herunterzuzählen.",
    "successCriteria": "Vier Personen beteiligen sich hörbar an demselben Countdown.",
    "timeWindow": "15 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Du darfst den Countdown nicht beginnen und nicht direkt dazu auffordern.",
    "centralNote": "Niemand weiß, warum Menschen auf null warten. Sie tun es dennoch zuverlässig.",
    "tags": ["gruppe", "kurz", "sozial"]
  },
  {
    "catalogId": "M12",
    "title": "Noch eine Runde",
    "task": "Drei verschiedene Spieler müssen ihr Getränk nachfüllen oder wechseln.",
    "successCriteria": "Drei Personen holen oder erhalten ein neues beziehungsweise aufgefülltes Getränk.",
    "timeWindow": "20 Minuten",
    "difficulty": "leicht",
    "minPlayers": 4,
    "requirements": "Getränke müssen vorhanden sein; Alkohol ist nicht erforderlich.",
    "restriction": "Du darfst niemandem direkt sagen, dass die Person trinken oder nachfüllen soll.",
    "centralNote": "Flüssigkeitsversorgung ist wichtig. Die Motivation der Zentrale bleibt dennoch unklar.",
    "tags": ["getränk", "sozial", "leicht"]
  },
  {
    "catalogId": "M13",
    "title": "Der Name im Raum",
    "task": "Drei verschiedene Spieler müssen dieselbe andere Person namentlich erwähnen.",
    "successCriteria": "Drei Spieler nennen innerhalb des Zeitfensters denselben Teilnehmer.",
    "timeWindow": "10 Minuten",
    "difficulty": "anspruchsvoll",
    "minPlayers": 5,
    "requirements": "Mindestens fünf Teilnehmer sind empfohlen.",
    "restriction": "Du darfst den Namen der Zielperson während des Zeitfensters nicht selbst aussprechen.",
    "centralNote": "Ein Name ist erst dann verdächtig, wenn ihn genügend Menschen beiläufig erwähnen.",
    "tags": ["wort", "verdacht", "kurz"]
  },
  {
    "catalogId": "M14",
    "title": "Hundertprozentig",
    "task": "Bringe eine Person dazu, „hundertprozentig“, „ganz sicher“ oder „ich bin mir sicher“ zu sagen.",
    "successCriteria": "Eine der festgelegten Formulierungen wird vollständig ausgesprochen.",
    "timeWindow": "20 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Du darfst keine der Zielformulierungen selbst verwenden.",
    "centralNote": "Absolute Gewissheit ist meistens der Moment unmittelbar vor einem Fehler.",
    "tags": ["wort", "gespräch", "subtil"]
  },
  {
    "catalogId": "M15",
    "title": "Höflicher Applaus",
    "task": "Veranlasse mindestens vier Spieler zu gemeinsamem Applaus.",
    "successCriteria": "Vier Personen klatschen für dasselbe Ereignis oder dieselbe Person.",
    "timeWindow": "20 Minuten",
    "difficulty": "anspruchsvoll",
    "minPlayers": 4,
    "requirements": "Keine besonderen Voraussetzungen.",
    "restriction": "Du darfst nicht als erste Person klatschen und niemanden dazu auffordern.",
    "centralNote": "Anerkennung ist kostenlos. Das erklärt ihre inflationäre Verwendung.",
    "tags": ["gruppe", "sozial", "subtil"]
  },
  {
    "catalogId": "M16",
    "title": "Der gemeinsame Beschluss",
    "task": "Die Gruppe muss gemeinsam eine harmlose Entscheidung treffen und umsetzen, etwa Musikwechsel, Fenster, Snack oder kurze Pause.",
    "successCriteria": "Mindestens vier Personen unterstützen denselben Vorschlag und die Entscheidung wird umgesetzt.",
    "timeWindow": "15 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Es muss eine harmlose Gruppenentscheidung möglich sein.",
    "restriction": "Du darfst keine formelle Abstimmung ausrufen.",
    "centralNote": "Gruppenentscheidungen sind effizient, sobald jemand anderes die Verantwortung übernimmt.",
    "tags": ["gruppe", "einfluss", "sozial"]
  },
  {
    "catalogId": "M17",
    "title": "Die Leihgabe",
    "task": "Zwei verschiedene Spieler müssen dir jeweils einen harmlosen Gegenstand freiwillig überlassen.",
    "successCriteria": "Du erhältst zwei Gegenstände von zwei unterschiedlichen Personen.",
    "timeWindow": "20 Minuten",
    "difficulty": "anspruchsvoll",
    "minPlayers": 4,
    "requirements": "Geeignet sind nur ungefährliche Alltagsgegenstände.",
    "restriction": "Du darfst nicht direkt danach fragen, etwas auszuleihen oder zu bekommen.",
    "centralNote": "Vertrauen beginnt mit einem Stift und endet selten dort.",
    "tags": ["objekt", "subtil", "sozial"]
  },
  {
    "catalogId": "M18",
    "title": "Das Alibi des Alltags",
    "task": "Bringe zwei unterschiedliche Spieler dazu, jeweils eine kurze persönliche Alltagserzählung zu beginnen.",
    "successCriteria": "Zwei Personen erzählen jeweils mindestens drei zusammenhängende Sätze über ein eigenes Erlebnis.",
    "timeWindow": "20 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Nur harmlose Alltagsthemen.",
    "restriction": "Keine sensiblen, intimen oder konfliktbezogenen Themen.",
    "centralNote": "Menschen erzählen gern von sich. Die Kunst besteht darin, so zu wirken, als sei das überraschend.",
    "tags": ["gespräch", "sozial", "lang"]
  },
  {
    "catalogId": "M19",
    "title": "Korrektur erwünscht",
    "task": "Mache in zwei unterschiedlichen Gesprächen jeweils eine harmlose, plausible Ungenauigkeit, die von zwei verschiedenen Spielern korrigiert wird.",
    "successCriteria": "Zwei Personen korrigieren jeweils eine deiner Aussagen.",
    "timeWindow": "15 Minuten",
    "difficulty": "mittel",
    "minPlayers": 4,
    "requirements": "Die Aussagen müssen belanglos und überprüfbar sein.",
    "restriction": "Keine Unwahrheiten über Personen, Regeln, Gesundheit, Geld oder reale Konflikte.",
    "centralNote": "Fehler erzeugen Aufmerksamkeit. Kleine Fehler erzeugen nur genug davon.",
    "tags": ["gespräch", "subtil", "kurz"]
  },
  {
    "catalogId": "M20",
    "title": "Der fremde Vorschlag",
    "task": "Sorge dafür, dass ein anderer Spieler von sich aus eine festgelegte Gruppenaktion vorschlägt und beginnt.",
    "successCriteria": "Eine andere Person schlägt Musikwechsel, Snack, Frischluftpause, Gruppenbild oder Platzwechsel vor und die Aktion beginnt.",
    "timeWindow": "25 Minuten",
    "difficulty": "anspruchsvoll",
    "minPlayers": 4,
    "requirements": "Mindestens eine der erlaubten Gruppenaktionen muss möglich sein.",
    "restriction": "Du darfst die konkrete Zielaktion nicht selbst nennen.",
    "centralNote": "Der beste Vorschlag ist der, für den später jemand anderes verantwortlich gemacht wird.",
    "tags": ["gruppe", "einfluss", "lang"]
  }
];

export const CHALLENGE_CATALOG: ChallengeCatalogEntry[] = [
  {
    "catalogId": "C01",
    "title": "Abwurfpunkt",
    "briefing": "Jedes Team besitzt sechs Zielbecher. Die Spieler werfen abwechselnd Tischtennisbälle aus markierter Entfernung. Ein Treffer entfernt den getroffenen Becher.",
    "winCondition": "Das erste Team mit vier gültigen Treffern gewinnt.",
    "duration": "6 Minuten",
    "material": "12 Zielbecher, Tischtennisbälle, Abwurflinie",
    "safety": "Nur leichte Bälle verwenden und die Abwurflinie frei halten.",
    "category": "Präzision",
    "minPlayers": 4,
    "drinkRule": "Optional: Ein kompletter Teamdurchgang ohne Treffer bedeutet einen kleinen Schluck oder fünf Sekunden Zusatzwartezeit.",
    "centralNote": "Präzision ist eine Frage des Trainings. Ausreden offenbar ebenfalls.",
    "tags": ["geschick", "drinnen", "getränkekompatibel"]
  },
  {
    "catalogId": "C02",
    "title": "Transport ohne Würde",
    "briefing": "Jeder Spieler absolviert einen kurzen Parcours mit einem Tablett und vier halb gefüllten Kunststoffbechern. Verschüttete Flüssigkeit wird über Markierungen am Becher bewertet.",
    "winCondition": "Die schnellste Gesamtzeit nach Hinzurechnung der Verschüttungsstrafen gewinnt.",
    "duration": "8 Minuten",
    "material": "2 Tabletts, 8 Kunststoffbecher, Wasser, Hindernismarken",
    "safety": "Nur Wasser oder alkoholfreie Flüssigkeit verwenden; rutschige Stellen sofort trocknen.",
    "category": "Staffel",
    "minPlayers": 4,
    "drinkRule": "Kein Trinkzwang. Verschütten erzeugt ausschließlich Zeitstrafe.",
    "centralNote": "Ein Agent verliert nie die Kontrolle. Höchstens den Inhalt des Tabletts.",
    "tags": ["staffel", "bewegung", "drinnen"]
  },
  {
    "catalogId": "C03",
    "title": "Kontaktabbruch",
    "briefing": "Staffelprinzip: Ein Spieler nimmt freiwillig einen kleinen Schluck oder berührt ersatzweise eine Strafmarke, stellt den Kunststoffbecher ab und dreht ihn durch Antippen des Randes um. Erst danach startet die nächste Person.",
    "winCondition": "Das erste vollständig abgeschlossene Team gewinnt.",
    "duration": "6 Minuten",
    "material": "2 leichte Kunststoffbecher, Getränke oder Strafmarken",
    "safety": "Keine Shots, kein Austrinken auf Zeit und immer eine alkoholfreie Alternative.",
    "category": "Staffel",
    "minPlayers": 4,
    "drinkRule": "Freie Getränkewahl; alternativ fünf Sekunden warten.",
    "centralNote": "Geschwindigkeit ist nützlich. Koordination wäre ebenfalls akzeptiert worden.",
    "tags": ["staffel", "getränkekompatibel", "geschick"]
  },
  {
    "catalogId": "C04",
    "title": "Chiffrenstapel",
    "briefing": "Das Team baut einen vorgegebenen Becherstapel. Unter einzelnen Bechern liegen Codefragmente. Nach korrektem Aufbau werden die Fragmente sichtbar und müssen geordnet werden.",
    "winCondition": "Das erste Team mit korrekt aufgebautem Stapel und richtigem Code gewinnt.",
    "duration": "8 Minuten",
    "material": "Becher, Symbolkarten, Codevorlage",
    "safety": "Nur stabile, leichte Materialien verwenden.",
    "category": "Logik & Geschick",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Manche Geheimnisse liegen unter Verschluss. Andere unter Kunststoffbechern.",
    "tags": ["logik", "geschick", "drinnen"]
  },
  {
    "catalogId": "C05",
    "title": "Der unsichtbare Korridor",
    "briefing": "Ein einfacher Laserkorridor wird mit Schnur oder Kreppband zwischen Stühlen gespannt. Jedes Team schickt nacheinander seine Spieler hindurch. Berührungen erzeugen Strafzeit.",
    "winCondition": "Die niedrigste Gesamtzeit inklusive fünf Sekunden pro Berührung gewinnt.",
    "duration": "8 Minuten",
    "material": "Schnur oder Kreppband, Stühle, Timer",
    "safety": "Keine Schnüre auf Hals- oder Kopfhöhe; Laufwege frei halten.",
    "category": "Bewegung",
    "minPlayers": 4,
    "drinkRule": "Optional ersetzt ein kleiner Schluck eine einzelne Fünf-Sekunden-Strafe; maximal drei pro Person.",
    "centralNote": "Tarnung ist die Kunst, nicht aufzufallen. Schnüre erschweren diesen Ansatz.",
    "tags": ["bewegung", "drinnen", "getränkekompatibel"]
  },
  {
    "catalogId": "C06",
    "title": "Stille Extraktion",
    "briefing": "Ein Spieler stellt einen festen Agentenbegriff pantomimisch dar. Nach richtigem Erraten übernimmt die nächste Person. Geräusche und Buchstabenzeichen sind verboten.",
    "winCondition": "Das Team mit den meisten korrekt gelösten Begriffen gewinnt.",
    "duration": "7 Minuten",
    "material": "Vorgefertigte Begriffskarten",
    "safety": "Keine riskanten oder körperlich belastenden Darstellungen.",
    "category": "Kommunikation",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Kommunikation ohne Worte. Für manche Teilnehmer eine deutliche Verbesserung.",
    "tags": ["kommunikation", "drinnen", "gruppe"]
  },
  {
    "catalogId": "C07",
    "title": "Tresorprotokoll",
    "briefing": "Eine Farb-, Zahlen- oder Symbolfolge wird fünf Sekunden gezeigt und anschließend verdeckt. Das Team rekonstruiert sie gemeinsam. Die Folgen werden je Durchgang länger.",
    "winCondition": "Das Team mit der längsten korrekt rekonstruierten Folge gewinnt.",
    "duration": "6 Minuten",
    "material": "Vorgefertigte Sequenzkarten",
    "safety": "Keine besonderen Risiken.",
    "category": "Gedächtnis",
    "minPlayers": 4,
    "drinkRule": "Optional: Eine falsche Rekonstruktion erzeugt einen kleinen Schluck oder fünf Sekunden Schweigen vor dem nächsten Versuch.",
    "centralNote": "Erinnerungen sind unzuverlässig. Teamdiskussionen helfen erstaunlich selten.",
    "tags": ["gedächtnis", "logik", "getränkekompatibel"]
  },
  {
    "catalogId": "C08",
    "title": "Das rote Telefon",
    "briefing": "Eine feste Nachricht wird innerhalb des Teams flüsternd weitergegeben. Die letzte Person spricht sie laut aus. Gespielt werden drei Durchgänge mit steigender Textlänge.",
    "winCondition": "Die höchste Anzahl korrekt übertragener Schlüsselwörter gewinnt.",
    "duration": "6 Minuten",
    "material": "Vorgefertigte Nachrichtensätze",
    "safety": "Flüstern statt Schreien; persönliche Aussagen sind ausgeschlossen.",
    "category": "Kommunikation",
    "minPlayers": 6,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Informationen verändern sich auf dem Dienstweg. Das Spiel bildet reale Strukturen nach.",
    "tags": ["kommunikation", "gruppe", "drinnen"]
  },
  {
    "catalogId": "C09",
    "title": "Der Beweistisch",
    "briefing": "Fünfzehn Gegenstände werden 20 Sekunden gezeigt und anschließend abgedeckt. Das Team notiert gemeinsam, was es gesehen hat.",
    "winCondition": "Die höchste Anzahl richtiger Gegenstände abzüglich falscher Nennungen gewinnt.",
    "duration": "7 Minuten",
    "material": "15 Alltagsgegenstände, Tablett, Tuch, Papier",
    "safety": "Keine privaten oder gefährlichen Gegenstände verwenden.",
    "category": "Beobachtung",
    "minPlayers": 4,
    "drinkRule": "Optional: Jede falsche Nennung ergibt einen kleinen Schluck oder einen Minuspunkt.",
    "centralNote": "Beobachtung ist wichtig. Fantasie wird negativ bewertet.",
    "tags": ["gedächtnis", "beobachtung", "getränkekompatibel"]
  },
  {
    "catalogId": "C10",
    "title": "Papierluftbrücke",
    "briefing": "Jedes Team faltet nach derselben Kurzanleitung Papierflugzeuge. Jeder Spieler erhält einen Wurf auf drei markierte Zielzonen.",
    "winCondition": "Die höchste Gesamtpunktzahl aus allen gültigen Würfen gewinnt.",
    "duration": "8 Minuten",
    "material": "Identische Papierblätter, Zielmarkierungen",
    "safety": "Nicht in Richtung von Gesichtern werfen.",
    "category": "Konstruktion",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Aerodynamik ist Wissenschaft. Der Rest dieses Vorgangs ist Hoffnung.",
    "tags": ["geschick", "konstruktion", "drinnen"]
  },
  {
    "catalogId": "C11",
    "title": "Münzkontakt",
    "briefing": "Eine Münze oder ein Spielchip muss einmal auf dem Tisch aufspringen und anschließend im Zielbecher landen. Alle Spieler werfen abwechselnd.",
    "winCondition": "Das erste Team mit fünf gültigen Treffern gewinnt.",
    "duration": "6 Minuten",
    "material": "Spielchips oder Münzen, Zielbecher",
    "safety": "Nur auf einer freien, stabilen Tischfläche spielen.",
    "category": "Präzision",
    "minPlayers": 4,
    "drinkRule": "Drei Fehlwürfe derselben Person ergeben einen kleinen Schluck oder eine größere Distanz beim nächsten Wurf.",
    "centralNote": "Der Haushaltsgegenstand wurde erfolgreich in ein Präzisionsinstrument umdefiniert.",
    "tags": ["geschick", "getränkekompatibel", "drinnen"]
  },
  {
    "catalogId": "C12",
    "title": "Schwarze Krawatte",
    "briefing": "Die Spieler tragen ein Buch oder leichtes Tablett auf einer geöffneten Hand durch einen kurzen Parcours. Die zweite Hand darf nicht helfen.",
    "winCondition": "Die schnellste Staffelzeit gewinnt; Herunterfallen erzeugt fünf Strafsekunden.",
    "duration": "7 Minuten",
    "material": "2 leichte Bücher oder Tabletts, Hindernismarken",
    "safety": "Keine schweren oder zerbrechlichen Gegenstände verwenden.",
    "category": "Balance",
    "minPlayers": 4,
    "drinkRule": "Optional ersetzt ein kleiner Schluck eine einzelne Fall-Strafe; maximal drei pro Person.",
    "centralNote": "Haltung ist alles. Besonders wenn der Gegenstand bereits fällt.",
    "tags": ["balance", "staffel", "getränkekompatibel"]
  },
  {
    "catalogId": "C13",
    "title": "Falscher Jahrgang",
    "briefing": "Die Teams identifizieren blind fünf ungefährliche Getränke oder Geschmacksproben in neutralen Bechern. Alkoholfreie Varianten sind Standard.",
    "winCondition": "Die meisten korrekten Zuordnungen gewinnen.",
    "duration": "8 Minuten",
    "material": "5 sichere Proben, neutrale Becher, Augenbinden optional",
    "safety": "Allergien vorher prüfen; Alkohol nur bei ausdrücklicher freiwilliger Zustimmung aller Betroffenen.",
    "category": "Sensorik",
    "minPlayers": 4,
    "drinkRule": "Die Proben selbst sind die einzige Trinkkomponente; kleine Mengen verwenden.",
    "centralNote": "Ein feiner Gaumen erkennt Nuancen. Ein ehrlicher Gaumen gibt gelegentlich auf.",
    "tags": ["sensorik", "getränkekompatibel", "drinnen"]
  },
  {
    "catalogId": "C14",
    "title": "Die diskrete Auktion",
    "briefing": "Jedes Team erhält dieselbe Anzahl Spielchips. Nacheinander werden verdeckte Objektkarten mit unterschiedlichen oder fehlenden Punktwerten versteigert.",
    "winCondition": "Die höchste Gesamtpunktzahl nach fünf Auktionen gewinnt.",
    "duration": "10 Minuten",
    "material": "Spielchips, feste Objektkarten",
    "safety": "Nur Spielmaterial verwenden; kein echtes Geld.",
    "category": "Strategie",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Kapital ist begrenzt. Selbstüberschätzung traditionell nicht.",
    "tags": ["strategie", "logik", "drinnen"]
  },
  {
    "catalogId": "C15",
    "title": "Reaktionsprotokoll",
    "briefing": "Eine Karte in einer von vier Farben wird aufgedeckt. Die erste Person, die den passenden Gegenstand berührt, erhält einen Punkt. Falsches Berühren kostet einen Punkt.",
    "winCondition": "Das erste Team mit zehn Punkten gewinnt.",
    "duration": "6 Minuten",
    "material": "Farbkarten, vier passende sichere Gegenstände",
    "safety": "Gegenstände mit Abstand aufstellen; kein Schubsen.",
    "category": "Reaktion",
    "minPlayers": 4,
    "drinkRule": "Optional: Falsches Berühren bedeutet einen kleinen Schluck statt Punktabzug.",
    "centralNote": "Reaktion ohne Prüfung gilt im Alltag als schlechter Stil. Hier bringt sie Punkte.",
    "tags": ["reaktion", "getränkekompatibel", "drinnen"]
  },
  {
    "catalogId": "C16",
    "title": "Zielraster",
    "briefing": "Die Teams spielen abwechselnd auf einem Drei-mal-drei-Raster. Ein gültiger Treffer mit einem Wurfsäckchen belegt das Feld.",
    "winCondition": "Die erste vollständige Reihe gewinnt; nach Ablauf entscheidet die Anzahl kontrollierter Felder.",
    "duration": "8 Minuten",
    "material": "9 Bodenfelder oder Becher, Wurfsäckchen",
    "safety": "Nur weiche Wurfgegenstände verwenden.",
    "category": "Taktik & Präzision",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Territoriale Kontrolle beginnt klein. Meist auf dem Wohnzimmerboden.",
    "tags": ["taktik", "geschick", "drinnen"]
  },
  {
    "catalogId": "C17",
    "title": "Kalte Übergabe",
    "briefing": "Die Spieler transportieren nacheinander Eiswürfel mit Löffel oder Zange zwischen zwei Schalen. Fällt ein Würfel herunter, beginnt die Person mit einem neuen.",
    "winCondition": "Die höchste Anzahl erfolgreich transportierter Eiswürfel gewinnt.",
    "duration": "5 Minuten",
    "material": "Eiswürfel, 2 Zangen oder Löffel, 4 Schalen",
    "safety": "Nasse Stellen sofort trocknen; Eis nicht in den Mund nehmen.",
    "category": "Staffel",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Zeitdruck, kalte Hände und schlechte Entscheidungen. Ein vollständiges Einsatzprofil.",
    "tags": ["staffel", "geschick", "drinnen"]
  },
  {
    "catalogId": "C18",
    "title": "Zwei Wahrheiten, eine Deckung",
    "briefing": "Ein Team liest drei vorgegebene Aussagen vor, von denen eine falsch ist. Das andere Team berät und entscheidet. Danach wechseln die Rollen.",
    "winCondition": "Die meisten erkannten Falschaussagen nach sechs Karten gewinnen.",
    "duration": "10 Minuten",
    "material": "Vorgefertigte Aussagekarten",
    "safety": "Keine Aussagen über reale Teilnehmer oder sensible Themen.",
    "category": "Täuschung",
    "minPlayers": 4,
    "drinkRule": "Optional: Eine falsche Entscheidung erzeugt einen kleinen Schluck oder einen Minuspunkt.",
    "centralNote": "Eine glaubwürdige Lüge enthält ausreichend Wahrheit und möglichst wenig Begeisterung.",
    "tags": ["täuschung", "wissen", "getränkekompatibel"]
  },
  {
    "catalogId": "C19",
    "title": "Archivbeschaffung",
    "briefing": "Die Teams beschaffen eine feste Liste harmloser Alltagsgegenstände: Schlüssel, Stift, Serviette, Münze, Reißverschluss, Zahl und Teamfarbe. Alles darf nur mit Erlaubnis geliehen werden.",
    "winCondition": "Das erste Team mit vollständigem und korrekt geprüftem Archiv gewinnt.",
    "duration": "7 Minuten",
    "material": "Vorgefertigte Suchliste",
    "safety": "Keine privaten Taschen ohne Erlaubnis öffnen; alles anschließend zurückgeben.",
    "category": "Suche",
    "minPlayers": 4,
    "drinkRule": "Keine Trinkregel vorgesehen.",
    "centralNote": "Beschaffung ist einfach. Rückgabe unterscheidet professionelle Operationen von gewöhnlichem Diebstahl.",
    "tags": ["suche", "bewegung", "gruppe"]
  },
  {
    "catalogId": "C20",
    "title": "Finale Extraktion",
    "briefing": "Dreistufige Operation: zwei Zielwürfe treffen, eine Symbolfolge rekonstruieren und einen gefüllten Kunststoffbecher durch einen kurzen Parcours transportieren. Jede Stufe wird erst nach Abschluss der vorherigen geöffnet.",
    "winCondition": "Die schnellste Gesamtzeit inklusive Strafsekunden gewinnt.",
    "duration": "12 Minuten",
    "material": "Zielbecher, Bälle, Symbolkarten, Tablett, Kunststoffbecher, Wasser",
    "safety": "Nur leichte Materialien und Wasser verwenden; Laufwege frei halten.",
    "category": "Mehrkampf",
    "minPlayers": 4,
    "drinkRule": "Optional: Jede nicht bestandene Stufe erlaubt einen kleinen Schluck für fünf Sekunden Zeitgutschrift; maximal drei pro Person.",
    "centralNote": "Eine gute Extraktion endet schnell. Eine unterhaltsame offenbar nicht.",
    "tags": ["mehrkampf", "finale", "getränkekompatibel"]
  }
];

export const BONUS_CATALOG: EffectCatalogEntry[] = [
  { "catalogId": "B01", "kind": "double_own_vote", "title": "Doppelmandat", "description": "Die eigene Stimme des Millionärs zählt bei der Auswertung doppelt.", "selectionMode": "none" },
  { "catalogId": "B02", "kind": "block_voter", "title": "Störsender", "description": "Die Stimme eines vorher ausgewählten Spielers wird nicht gewertet.", "selectionMode": "voter" },
  { "catalogId": "B03", "kind": "redirect_vote", "title": "Umleitung", "description": "Die Stimme eines ausgewählten Spielers wird auf eine ausgewählte Zielperson umgeleitet.", "selectionMode": "source_and_target" },
  { "catalogId": "B04", "kind": "add_vote", "title": "Schattenstimme", "description": "Eine zusätzliche Stimme wird auf eine ausgewählte Zielperson gesetzt.", "selectionMode": "target" },
  { "catalogId": "B05", "kind": "remove_self_vote", "title": "Spurenwischer", "description": "Eine gegen den Millionär gerichtete Stimme wird entfernt.", "selectionMode": "none" },
  { "catalogId": "B06", "kind": "points_bonus", "title": "Erfolgsprämie", "description": "Der Millionär erhält einen zusätzlichen Punkt.", "selectionMode": "none", "amount": 1 }
];

export const MALUS_CATALOG: EffectCatalogEntry[] = [
  { "catalogId": "X01", "kind": "cancel_own_vote", "title": "Stimmenverlust", "description": "Die eigene Stimme des Millionärs wird nicht gewertet.", "selectionMode": "none" },
  { "catalogId": "X02", "kind": "add_vote_against_self", "title": "Offene Flanke", "description": "Eine zusätzliche Stimme wird gegen den Millionär gesetzt.", "selectionMode": "none" },
  { "catalogId": "X03", "kind": "points_penalty", "title": "Punktabzug", "description": "Dem Millionär wird ein Punkt abgezogen.", "selectionMode": "none", "amount": 1 },
  { "catalogId": "X04", "kind": "points_penalty", "title": "Doppelter Punktabzug", "description": "Dem Millionär werden zwei Punkte abgezogen.", "selectionMode": "none", "amount": 2 },
  { "catalogId": "X05", "kind": "none", "title": "Kein Schutz", "description": "Bei Misserfolg wird kein zusätzlicher Missionseffekt angewendet.", "selectionMode": "none" }
];

export function missionById(id: string) {
  return MISSION_CATALOG.find((entry) => entry.catalogId === id) ?? MISSION_CATALOG[0];
}

export function challengeById(id: string) {
  return CHALLENGE_CATALOG.find((entry) => entry.catalogId === id) ?? CHALLENGE_CATALOG[0];
}

export function bonusById(id: string) {
  return BONUS_CATALOG.find((entry) => entry.catalogId === id) ?? BONUS_CATALOG[0];
}

export function malusById(id: string) {
  return MALUS_CATALOG.find((entry) => entry.catalogId === id) ?? MALUS_CATALOG[0];
}

export function randomUnused<T extends { catalogId: string }>(catalog: T[], usedIds: string[]) {
  const unused = catalog.filter((entry) => !usedIds.includes(entry.catalogId));
  const pool = unused.length > 0 ? unused : catalog;
  return pool[Math.floor(Math.random() * pool.length)];
}
