import { PHASE_LABELS } from "../game/constants";
import type { RoundPhase, RoundNumber } from "../game/types";

export interface OnboardingSlide {
  eyebrow: string;
  title: string;
  body: string;
  signal: string;
}

export interface TransitionCue {
  eyebrow: string;
  title: string;
  body: string;
  signal: string;
  durationMs?: number;
}

export const INTRO_SLIDES: readonly OnboardingSlide[] = [
  {
    eyebrow: "Blaue Adria · Vertrauliche Angelegenheit",
    title: "Einer trägt den Korken.",
    body:
      "Ein Spieler ist heimlich der Millionär. Die anderen tragen Verdacht, Halbwissen und spätestens nach der ersten Abstimmung kleinere persönliche Kränkungen.",
    signal: "IDENTITÄT ERFOLGREICH VERHEIMLICHT",
  },
  {
    eyebrow: "Vier Runden · ein Hauptgewinn",
    title: "Freundschaft ist belastbar. Angeblich.",
    body:
      "Challenges, geheime Missionen und exklusive Hinweise verschieben das Kräfteverhältnis. Aus harmlosen Blicken werden Beweise, aus Beweisen werden Monologe.",
    signal: "MISSTRAUEN WIRD HOCHGEFAHREN",
  },
  {
    eyebrow: "Persönlicher Zugang",
    title: "Vier Ziffern gegen kollektiven Verrat.",
    body:
      "Jeder erstellt sein eigenes Profil und schützt es mit einer PIN. Das ist keine Hochsicherheitsbehörde, aber immerhin mehr Datenschutz als in eurem Gruppenchat.",
    signal: "NEUGIERIGE FINGER ABGEWIESEN",
  },
  {
    eyebrow: "Bereit für die Blaue Adria",
    title: "Die Adria hat Schlimmeres gesehen.",
    body:
      "Wähle deinen Zugang. Spieler erschaffen ihre Identität, André übernimmt die Regie – und damit offiziell die Verantwortung für Entscheidungen, die später niemand getroffen haben will.",
    signal: "PROTOKOLL BEREIT · AUSREDEN NICHT",
  },
] as const;

export const PLAYER_TUTORIAL: readonly OnboardingSlide[] = [
  {
    eyebrow: "Spieler-Onboarding · 1/4",
    title: "Die Lobby kennt Namen, keine Unschuld.",
    body:
      "Du siehst Teilnehmer, Status und Challenge-Team. Geheime Rollen bleiben verborgen. Also fast wie im echten Leben, nur mit ehrlicher gekennzeichnetem Misstrauen.",
    signal: "ÖFFENTLICHE FASSADE STABIL",
  },
  {
    eyebrow: "Spieler-Onboarding · 2/4",
    title: "Dein Display ist kein Gemeinschaftseigentum.",
    body:
      "Öffne Rollen-, Missions- und Vorteilskarten nur unbeobachtet. Ein Schulterblick ist kein Ermittlungstalent, sondern lediglich Diebstahl mit schlechter Körperhaltung.",
    signal: "PRIVATSPHÄRE VORLÄUFIG GERETTET",
  },
  {
    eyebrow: "Spieler-Onboarding · 3/4",
    title: "Sieger bekommen Wissen. Verlierer Charakter.",
    body:
      "Dein Team erhält ein klares Briefing. Das Gewinnerteam bestimmt den Fragesteller; das andere Team erhält die traditionelle Trostprämie namens persönliche Entwicklung.",
    signal: "TEAMGEIST UNTER BEOBACHTUNG",
  },
  {
    eyebrow: "Spieler-Onboarding · 4/4",
    title: "Deine Stimme überlebt deine Ausrede.",
    body:
      "Abstimmungen und Rollenentscheidungen werden geheim gespeichert. Nach der Bestätigung bleibt nur Reue – die älteste Währung strategischer Fehlentscheidungen.",
    signal: "VERANTWORTUNG ERFOLGREICH ZUGESTELLT",
  },
] as const;

export const HOST_TUTORIAL: readonly OnboardingSlide[] = [
  {
    eyebrow: "Spielleiter-Onboarding · 1/4",
    title: "Du führst. Die App begrenzt die Schäden.",
    body:
      "Vor jedem Schritt erklärt die Regieansicht, was zu prüfen ist und was der nächste Klick auslöst. Macht ohne Dokumentation endet sonst bekanntlich in Podcasts.",
    signal: "REGIEKANAL MIT RESTGEWISSEN AKTIV",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 2/4",
    title: "Zufall ist unbestechlicher als die Gruppe.",
    body:
      "Millionär und Challenge-Teams werden automatisch ausgelost. Auch bei Korkenabgabe bestimmt niemand seinen Lieblingsnachfolger. Vetternwirtschaft hat heute spielfrei.",
    signal: "NEPOTISMUS TECHNISCH VERHINDERT",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 3/4",
    title: "Geheimnisse bleiben dort, wo sie Schaden anrichten.",
    body:
      "Missionen, Vorteile, Stimmen und Rollen erscheinen nur in den nötigen Ansichten. Die öffentliche Lobby zeigt genug für Misstrauen, aber zu wenig für einen Untersuchungsausschuss.",
    signal: "GEHEIMBEREICH FRAGWÜRDIG SAUBER",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 4/4",
    title: "Jeder Klick bekommt seinen dramatischen Moment.",
    body:
      "Phasenwechsel starten mit einer kurzen Sequenz. Das schafft Orientierung und gibt allen Zeit, Haltung anzunehmen, obwohl innerlich längst Panik herrscht.",
    signal: "SPIELLEITUNG BEREIT · MORAL FLEXIBEL",
  },
] as const;

const PHASE_COPY: Record<RoundPhase, string> = {
  lobby:
    "Profile, Status und Teams werden vorbereitet. Noch wirkt alles zivilisiert; genießt diesen statistisch kurzen Zustand.",
  role_reveal:
    "Die privaten Rollenkarten werden freigegeben. Fremde Displays bleiben tabu – billige Spionage ist weiterhin nur billige Spionage.",
  mission:
    "Der Millionär erhält seine geheime Mission. Alle anderen dürfen aus gewöhnlichem Verhalten eine Verschwörung destillieren.",
  challenge:
    "Die Teamprüfung beginnt. Briefing und Siegbedingung sind klar; die späteren Ausreden vermutlich weniger.",
  question:
    "Das Gewinnerteam bestimmt einen Fragesteller. Eine exklusive Ja-Nein-Antwort trifft nun auf menschliche Interpretation – bedauerlicherweise.",
  discussion:
    "Die Gruppe diskutiert offen. Wahrheit, Bluff und unbegründete Gewissheit kämpfen um denselben knappen Sauerstoff.",
  mission_review:
    "Die Spielleitung prüft verdeckt den Missionserfolg. Sympathie ist kein Beweis, auch wenn Gruppen das gern verwechseln.",
  advantage:
    "Ein möglicher Vorteil wird vorbereitet. Kleine Regelkorrektur, große Empörung – ein bewährtes gesellschaftliches Prinzip.",
  voting:
    "Die geheime Abstimmung ist geöffnet. Jede Person wählt genau einmal und kann sich anschließend hervorragend distanzieren.",
  evaluation:
    "Stimmen und Vorteilseffekte werden geprüft. Mathematik übernimmt kurz, weil Emotionen bereits genug Schaden angerichtet haben.",
  result:
    "Das Rundenergebnis wird veröffentlicht. Der Gewinnerpool schrumpft, die Zahl der nachträglichen Erklärungen steigt.",
  role_transfer:
    "Der Korken bleibt oder wird zufällig neu vergeben. Niemand ernennt seinen Erben; wir sind schließlich kein Familienunternehmen.",
  finished:
    "Das Finale ist beendet. Ein Hauptgewinner bleibt übrig – zusammen mit mehreren sehr überzeugenden alternativen Wahrheiten.",
};

export function getPhaseTransitionCue(
  phase: RoundPhase,
  round: RoundNumber,
): TransitionCue {
  return {
    eyebrow: `Runde ${round} · Lageverschärfung`,
    title: PHASE_LABELS[phase],
    body: PHASE_COPY[phase],
    signal: `PHASE ${phase.toUpperCase()} AKTIV`,
    durationMs: 1900,
  };
}

export function getActionTransitionCue(action: string): TransitionCue {
  const cues: Record<string, TransitionCue> = {
    register: {
      eyebrow: "Identität wird amtlich verdächtig",
      title: "Dein Profil wird versiegelt.",
      body:
        "Name, Bild und PIN werden verbunden. Danach folgt das Onboarding – eine kurze Schulung darin, anderen Menschen kontrolliert zu misstrauen.",
      signal: "PROFIL GESICHERT · RUF OFFEN",
    },
    playerUnlock: {
      eyebrow: "PIN überraschend korrekt",
      title: "Dein persönlicher Zugang öffnet sich.",
      body:
        "Die private Spieleransicht wird geladen. Fremde Profile bleiben gesperrt, weil Anstand allein als Sicherheitskonzept mutig wäre.",
      signal: "SPIELERKANAL OFFEN · NEUGIER DRAUSSEN",
    },
    hostUnlock: {
      eyebrow: "Spielleiter-PIN akzeptiert",
      title: "Die Regiezentrale erwacht.",
      body:
        "Prüfhinweise, Geheimsteuerung und die nächste verantwortungsvolle Fehlentscheidung werden vorbereitet.",
      signal: "REGIEKANAL OFFEN · HAFTUNG UNGEKLÄRT",
    },
    revealRole: {
      eyebrow: "Private Karte",
      title: "Deine Rolle wird entschlüsselt.",
      body:
        "Halte das Display verdeckt. Diese Information gehört ausschließlich dir – bis dein Gesicht sie freiwillig veröffentlicht.",
      signal: "ROLLE ENTSCHLÜSSELT · MIMIK VERDÄCHTIG",
    },
    vote: {
      eyebrow: "Geheime Abstimmung",
      title: "Deine Stimme wird versiegelt.",
      body:
        "Die Auswahl wird gespeichert und später ausgewertet. Ab jetzt heißt impulsiv offiziell strategisch.",
      signal: "STIMME GESPEICHERT · REUE OPTIONAL",
    },
    roleDecision: {
      eyebrow: "Geheime Rollenentscheidung",
      title: "Die Entscheidung verschwindet im Tresor.",
      body:
        "Aufgelöst wird erst, wenn alle Berechtigten entschieden haben. Demokratie braucht Zeit, besonders bei vierstelliger PIN und Getränk in der Hand.",
      signal: "ENTSCHEIDUNG GESPEICHERT · AUSREDE ARCHIVIERT",
    },
    draw: {
      eyebrow: "Gesicherte Zufallsauslosung",
      title: "Der Korken sucht sein nächstes Opfer.",
      body:
        "Die Auswahl erfolgt zufällig und geheim aus allen Berechtigten. Beziehungen, Charme und laut vorgetragene Wünsche bleiben wertlos.",
      signal: "AUSLOSUNG ABGESCHLOSSEN · SCHICKSAL SCHULDIG",
    },
    teams: {
      eyebrow: "Challenge-Vorbereitung",
      title: "Die Zweckgemeinschaften werden gebildet.",
      body:
        "Alle Anwesenden werden zufällig auf Azur und Gold verteilt. Freundschaften können später unter kontrollierten Bedingungen beschädigt werden.",
      signal: "TEAMS AUSGELOST · LOYALITÄT BEFRISTET",
    },
    evaluation: {
      eyebrow: "Auswertung läuft",
      title: "Die Mathematik betritt den Tatort.",
      body:
        "Reguläre Stimmen, Vorteile und Gleichstände werden getrennt berechnet. Zahlen lügen seltener, wirken dafür persönlich beleidigender.",
      signal: "ERGEBNIS BEREIT · GEFÜHLE UNBERÜCKSICHTIGT",
    },
    result: {
      eyebrow: "Rundenabschluss",
      title: "Das Urteil verlässt den sicheren Raum.",
      body:
        "Ausscheiden, Punkte und Rollenwechsel werden verbindlich. Für nachträgliche Diplomatie ist jetzt ein guter, aber nutzloser Moment.",
      signal: "RUNDE ABGESCHLOSSEN · BEZIEHUNGEN IN PRÜFUNG",
    },
    next: {
      eyebrow: "Nächste Aktion",
      title: "Das Protokoll marschiert weiter.",
      body:
        "Die aktuelle Phase wird geschlossen. Der nächste Abschnitt beginnt, obwohl vermutlich noch jemand seine Verteidigungsrede sortiert.",
      signal: "NÄCHSTER ABSCHNITT AKTIV",
    },
  };
  return cues[action] ?? cues.next;
}
