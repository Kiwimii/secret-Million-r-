import { PHASE_LABELS } from "../game/constants";
import type { RoundPhase, RoundNumber } from "../game/types";

export type CinematicVisual =
  | "cork-orbit"
  | "suspect-lineup"
  | "pin-vault"
  | "host-console"
  | "lobby-grid"
  | "role-card"
  | "team-split"
  | "ballot-box"
  | "mission-envelope"
  | "challenge-course"
  | "question-lamp"
  | "discussion-bubbles"
  | "review-scales"
  | "advantage-cards"
  | "evaluation-counter"
  | "result-trapdoor"
  | "transfer-roulette"
  | "finale-crown";

export interface OnboardingSlide {
  eyebrow: string;
  title: string;
  body: string;
  signal: string;
  visual: CinematicVisual;
}

export interface TransitionCue {
  eyebrow: string;
  title: string;
  body: string;
  signal: string;
  visual: CinematicVisual;
  durationMs?: number;
}

export const INTRO_SLIDES: readonly OnboardingSlide[] = [
  {
    eyebrow: "Blaue Adria · Vertrauliche Angelegenheit",
    title: "Einer trägt den Korken.",
    body:
      "Ein Spieler ist heimlich der Millionär. Die anderen tragen Verdacht, Halbwissen und jene selbstbewusste Gewissheit, mit der Menschen seit Jahrhunderten Katastrophen eröffnen.",
    signal: "IDENTITÄT VERHEIMLICHT · EGO NICHT",
    visual: "cork-orbit",
  },
  {
    eyebrow: "Vier Runden · ein Hauptgewinn",
    title: "Freundschaft ist belastbar. Angeblich.",
    body:
      "Aus einem Blick wird ein Indiz, aus einem Indiz ein Plädoyer und aus dem Plädoyer die Erkenntnis, dass Zivilisation nur eine dünne Schicht über Gruppendruck ist.",
    signal: "MISSTRAUEN WIRD GESELLSCHAFTSFÄHIG",
    visual: "suspect-lineup",
  },
  {
    eyebrow: "Persönlicher Zugang",
    title: "Vier Ziffern gegen den freien Fall der Moral.",
    body:
      "Jeder schützt sein Profil mit einer PIN. Das ist keine Hochsicherheitsbehörde, aber immer noch solider als ein Ehrenwort in einer Runde, deren Kernmechanik Verrat ist.",
    signal: "NEUGIERIGE FINGER ABGEWIESEN",
    visual: "pin-vault",
  },
  {
    eyebrow: "Bereit für die Blaue Adria",
    title: "Die Regie übernimmt. Die Unschuld geht heim.",
    body:
      "Spieler erschaffen ihre Identität, André übernimmt die Kontrolle. Oli und Gundula, die bemerkenswert blickdichten Platzbesitzer, haben selbstverständlich nichts gesehen und schon gar nichts protokolliert.",
    signal: "PROTOKOLL BEREIT · GEDÄCHTNIS FLEXIBEL",
    visual: "host-console",
  },
] as const;

export const PLAYER_TUTORIAL: readonly OnboardingSlide[] = [
  {
    eyebrow: "Spieler-Onboarding · 1/4",
    title: "Die Lobby kennt Namen, keine Unschuld.",
    body:
      "Du siehst Teilnehmer, Status und Team. Geheimnisse bleiben verborgen. Also wie bei einer Familie – nur mit saubererem Datenmodell und weniger passiv-aggressivem Kartoffelsalat.",
    signal: "ÖFFENTLICHE FASSADE STABIL",
    visual: "lobby-grid",
  },
  {
    eyebrow: "Spieler-Onboarding · 2/4",
    title: "Dein Gesicht ist die häufigste Sicherheitslücke.",
    body:
      "Öffne geheime Karten unbeobachtet. Ein Schulterblick ist kein Ermittlungstalent; und wer bei seiner Rolle sofort grinst, veröffentlicht vermutlich auch Passwörter in Familiengruppen.",
    signal: "ROLLE SICHER · MIMIK UNGEPRÜFT",
    visual: "role-card",
  },
  {
    eyebrow: "Spieler-Onboarding · 3/4",
    title: "Sieger bekommen Wissen. Verlierer Charakter.",
    body:
      "Das Gewinnerteam bestimmt den Fragesteller. Das andere Team erhält persönliche Entwicklung – jene kostenlose Prämie, die gewöhnlich verteilt wird, wenn sonst nichts mehr übrig ist.",
    signal: "TEAMGEIST BEFRISTET ZUGELASSEN",
    visual: "team-split",
  },
  {
    eyebrow: "Spieler-Onboarding · 4/4",
    title: "Deine Stimme überlebt deine spätere Version der Wahrheit.",
    body:
      "Abstimmungen werden verbindlich gespeichert. Danach bleibt die tröstliche Freiheit, den eigenen Fehler als komplexe Strategie umzudeuten.",
    signal: "VERANTWORTUNG ERFOLGREICH ZUGESTELLT",
    visual: "ballot-box",
  },
] as const;

export const HOST_TUTORIAL: readonly OnboardingSlide[] = [
  {
    eyebrow: "Spielleiter-Onboarding · 1/4",
    title: "Du führst. Die App dokumentiert den Tatort.",
    body:
      "Vor jedem Klick erklärt die Regie, was zu prüfen ist. Macht ohne Protokoll ist nur Improvisation mit späterem Untersuchungsausschuss.",
    signal: "REGIEKANAL MIT RESTGEWISSEN AKTIV",
    visual: "host-console",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 2/4",
    title: "Zufall ist unbestechlicher als Sympathie.",
    body:
      "Millionär und Teams werden automatisch gezogen. Niemand ernennt seinen Lieblingsnachfolger. Vetternwirtschaft ist schließlich nur Tradition mit schlechter Benutzeroberfläche.",
    signal: "NEPOTISMUS TECHNISCH VERHINDERT",
    visual: "cork-orbit",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 3/4",
    title: "Geheimnisse werden getrennt. Menschen leider nicht.",
    body:
      "Rollen, Stimmen und Vorteile erscheinen nur dort, wo sie gebraucht werden. Die Lobby zeigt genug für Verdacht, aber zu wenig für eine mittelmäßige True-Crime-Serie.",
    signal: "GEHEIMBEREICH FRAGWÜRDIG SAUBER",
    visual: "evaluation-counter",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 4/4",
    title: "Jeder Klick hat Folgen. Endlich realistische Software.",
    body:
      "Phasenwechsel werden inszeniert und erklärt. So wissen alle, wann etwas endet – ein Luxus, den Beziehungen, politische Karrieren und Oli und Gundulas Nebenkostenabrechnung selten bieten.",
    signal: "SPIELLEITUNG BEREIT · MORAL FLEXIBEL",
    visual: "result-trapdoor",
  },
] as const;

const PHASE_COPY: Record<
  RoundPhase,
  { body: string; visual: CinematicVisual }
> = {
  lobby: {
    body:
      "Profile, Status und Teams werden vorbereitet. Noch wirkt alles zivilisiert; genießt diesen statistisch kurzen Zustand.",
    visual: "lobby-grid",
  },
  role_reveal: {
    body:
      "Die Rollen werden freigegeben. Fremde Displays bleiben tabu – billige Spionage bleibt auch mit ernster Stirn billige Spionage.",
    visual: "role-card",
  },
  mission: {
    body:
      "Der Millionär erhält seine Mission. Alle anderen dürfen aus gewöhnlichem Verhalten eine Verschwörung destillieren, wie Erwachsene es eben tun.",
    visual: "mission-envelope",
  },
  challenge: {
    body:
      "Die Teamprüfung beginnt. Die Regeln sind klar; die späteren Ausreden werden deutlich kreativer sein.",
    visual: "challenge-course",
  },
  question: {
    body:
      "Eine exklusive Ja-Nein-Antwort trifft auf menschliche Interpretation. Ein bewährtes Verfahren, sofern Genauigkeit nicht das Hauptziel ist.",
    visual: "question-lamp",
  },
  discussion: {
    body:
      "Wahrheit, Bluff und unbegründete Gewissheit kämpfen um denselben knappen Sauerstoff. Lautstärke gilt dabei traditionell als Ersatz für Belege.",
    visual: "discussion-bubbles",
  },
  mission_review: {
    body:
      "Die Spielleitung prüft den Missionserfolg. Sympathie ist kein Beweis – ein Satz, der große Teile der Menschheitsgeschichte hätte verkürzen können.",
    visual: "review-scales",
  },
  advantage: {
    body:
      "Ein Vorteil wird vorbereitet. Kleine Regelkorrektur, große Empörung – damit sind wir praktisch schon bei institutioneller Politik.",
    visual: "advantage-cards",
  },
  voting: {
    body:
      "Jede Person wählt genau einmal und kann sich danach hervorragend von der eigenen Entscheidung distanzieren.",
    visual: "ballot-box",
  },
  evaluation: {
    body:
      "Die Mathematik übernimmt kurz, weil Emotionen bereits genug Schäden verursacht haben. Zahlen sind kalt, aber wenigstens konsequent.",
    visual: "evaluation-counter",
  },
  result: {
    body:
      "Der Gewinnerpool schrumpft, die Zahl nachträglicher Erklärungen steigt. So funktioniert Fortschritt in vielen Organisationen.",
    visual: "result-trapdoor",
  },
  role_transfer: {
    body:
      "Der Korken bleibt oder wird zufällig neu vergeben. Niemand ernennt seinen Erben; wir sind schließlich kein Familienunternehmen.",
    visual: "transfer-roulette",
  },
  finished: {
    body:
      "Ein Hauptgewinner bleibt übrig – zusammen mit mehreren Menschen, die moralisch selbstverständlich trotzdem gewonnen haben.",
    visual: "finale-crown",
  },
};

export function getPhaseTransitionCue(
  phase: RoundPhase,
  round: RoundNumber,
): TransitionCue {
  const copy = PHASE_COPY[phase];
  return {
    eyebrow: `Runde ${round} · Lageverschärfung`,
    title: PHASE_LABELS[phase],
    body: copy.body,
    visual: copy.visual,
    signal: `PHASE ${phase.toUpperCase()} AKTIV`,
    durationMs: 2200,
  };
}

export function getActionTransitionCue(action: string): TransitionCue {
  const cues: Record<string, TransitionCue> = {
    register: {
      eyebrow: "Identität wird amtlich verdächtig",
      title: "Dein Profil wird versiegelt.",
      body:
        "Name, Bild und PIN werden verbunden. Danach folgt eine kurze Schulung darin, anderen Menschen kontrolliert zu misstrauen.",
      signal: "PROFIL GESICHERT · RUF OFFEN",
      visual: "pin-vault",
    },
    playerUnlock: {
      eyebrow: "PIN überraschend korrekt",
      title: "Dein persönlicher Zugang öffnet sich.",
      body:
        "Fremde Profile bleiben gesperrt, weil Anstand allein als Sicherheitskonzept ungefähr so belastbar ist wie eine Campingplatzquittung von Oli.",
      signal: "SPIELERKANAL OFFEN · NEUGIER DRAUSSEN",
      visual: "role-card",
    },
    hostUnlock: {
      eyebrow: "Spielleiter-PIN akzeptiert",
      title: "Die Regiezentrale erwacht.",
      body:
        "Prüfhinweise, Geheimsteuerung und die nächste verantwortungsvolle Fehlentscheidung werden vorbereitet.",
      signal: "REGIEKANAL OFFEN · HAFTUNG UNGEKLÄRT",
      visual: "host-console",
    },
    revealRole: {
      eyebrow: "Private Karte",
      title: "Deine Rolle wird entschlüsselt.",
      body:
        "Diese Information gehört ausschließlich dir – bis dein Gesicht sie wie eine schlecht vorbereitete Pressekonferenz veröffentlicht.",
      signal: "ROLLE ENTSCHLÜSSELT · MIMIK VERDÄCHTIG",
      visual: "role-card",
    },
    vote: {
      eyebrow: "Geheime Abstimmung",
      title: "Deine Stimme wird versiegelt.",
      body:
        "Die Auswahl wird gespeichert. Ab jetzt heißt impulsiv offiziell strategisch, und Reue wird zur persönlichen Nachbetrachtung.",
      signal: "STIMME GESPEICHERT · REUE OPTIONAL",
      visual: "ballot-box",
    },
    roleDecision: {
      eyebrow: "Geheime Rollenentscheidung",
      title: "Die Entscheidung verschwindet im Tresor.",
      body:
        "Aufgelöst wird erst, wenn alle entschieden haben. Demokratie braucht Zeit, besonders mit Getränk in der Hand und Verantwortung in sicherer Entfernung.",
      signal: "ENTSCHEIDUNG GESPEICHERT · AUSREDE ARCHIVIERT",
      visual: "transfer-roulette",
    },
    draw: {
      eyebrow: "Gesicherte Zufallsauslosung",
      title: "Der Korken sucht sein nächstes Opfer.",
      body:
        "Beziehungen, Charme und laut vorgetragene Wünsche bleiben wertlos. Das ist kalt, fair und damit ungewohnt menschlich.",
      signal: "AUSLOSUNG ABGESCHLOSSEN · SCHICKSAL SCHULDIG",
      visual: "cork-orbit",
    },
    teams: {
      eyebrow: "Challenge-Vorbereitung",
      title: "Die Zweckgemeinschaften werden gebildet.",
      body:
        "Azur und Gold entstehen zufällig. Freundschaften können anschließend unter kontrollierten Bedingungen beschädigt werden.",
      signal: "TEAMS AUSGELOST · LOYALITÄT BEFRISTET",
      visual: "team-split",
    },
    evaluation: {
      eyebrow: "Auswertung läuft",
      title: "Die Mathematik betritt den Tatort.",
      body:
        "Reguläre Stimmen, Vorteile und Gleichstände werden getrennt berechnet. Zahlen lügen seltener, wirken dafür persönlicher beleidigend.",
      signal: "ERGEBNIS BEREIT · GEFÜHLE UNBERÜCKSICHTIGT",
      visual: "evaluation-counter",
    },
    result: {
      eyebrow: "Rundenabschluss",
      title: "Das Urteil verlässt den sicheren Raum.",
      body:
        "Ausscheiden, Punkte und Rollenwechsel werden verbindlich. Gundula würde sagen, Beschwerden bitte schriftlich – und dann versehentlich verlieren.",
      signal: "RUNDE ABGESCHLOSSEN · BEZIEHUNGEN IN PRÜFUNG",
      visual: "result-trapdoor",
    },
    next: {
      eyebrow: "Nächste Aktion",
      title: "Das Protokoll marschiert weiter.",
      body:
        "Die aktuelle Phase wird geschlossen. Der nächste Abschnitt beginnt, obwohl vermutlich noch jemand seine Verteidigungsrede sortiert.",
      signal: "NÄCHSTER ABSCHNITT AKTIV",
      visual: "host-console",
    },
  };
  return cues[action] ?? cues.next;
}
