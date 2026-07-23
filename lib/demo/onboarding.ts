import { PHASE_LABELS } from "@/lib/game/constants";
import type { RoundPhase, RoundNumber } from "@/lib/game/types";

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
    eyebrow: "Blaue Adria · Geheimprotokoll",
    title: "Einer trägt den Korken.",
    body:
      "Ein Spieler ist heimlich der Millionär. Niemand kennt seine Identität – nicht einmal sein möglicher Nachfolger.",
    signal: "IDENTITÄT VERSCHLÜSSELT",
  },
  {
    eyebrow: "Vier Runden · ein Hauptgewinn",
    title: "Beobachten. Täuschen. Entscheiden.",
    body:
      "Challenges, geheime Missionen, exklusive Hinweise und Abstimmungen verändern in jeder Runde das Kräfteverhältnis.",
    signal: "SPIELFELD WIRD GELADEN",
  },
  {
    eyebrow: "Persönlicher Zugang",
    title: "Dein Profil gehört nur dir.",
    body:
      "Jeder Spieler erstellt ein neues Profil und schützt es mit einer vierstelligen PIN. Auch die Spielleitung erhält einen eigenen Zugang.",
    signal: "ZUGRIFFSSCHUTZ AKTIV",
  },
  {
    eyebrow: "Bereit für das Wochenende",
    title: "Die Adria wartet.",
    body:
      "Wähle jetzt deinen Zugang. Neue Spieler beginnen mit der Profilerstellung, André richtet einmalig die Spielleiter-PIN ein.",
    signal: "PROTOKOLL BEREIT",
  },
] as const;

export const PLAYER_TUTORIAL: readonly OnboardingSlide[] = [
  {
    eyebrow: "Spieler-Onboarding · 1/4",
    title: "Die Lobby ist öffentlich.",
    body:
      "Du siehst alle angemeldeten Teilnehmer, ihren Status und dein zufällig ausgelostes Challenge-Team. Geheime Rollen bleiben verborgen.",
    signal: "LOBBY SYNCHRONISIERT",
  },
  {
    eyebrow: "Spieler-Onboarding · 2/4",
    title: "Deine Rolle ist privat.",
    body:
      "Öffne Rollen-, Missions- und Vorteilskarten nur, wenn niemand auf dein Display sehen kann. Teile niemals deine PIN.",
    signal: "PRIVATE KARTE VERSIEGELT",
  },
  {
    eyebrow: "Spieler-Onboarding · 3/4",
    title: "Challenges liefern Information.",
    body:
      "Dein Team erhält ein klares Briefing. Das Gewinnerteam bestimmt einen Fragesteller, der eine exklusive Ja-Nein-Antwort erhält.",
    signal: "TEAMKANAL AKTIV",
  },
  {
    eyebrow: "Spieler-Onboarding · 4/4",
    title: "Jede Stimme ist verbindlich.",
    body:
      "Abstimmungen und Rollenentscheidungen werden geheim gespeichert. Nach der Bestätigung kann deine Auswahl nicht offen herumgezeigt werden.",
    signal: "STIMME BEREIT",
  },
] as const;

export const HOST_TUTORIAL: readonly OnboardingSlide[] = [
  {
    eyebrow: "Spielleiter-Onboarding · 1/4",
    title: "Du führst – die App sichert ab.",
    body:
      "Die Regieansicht erklärt vor jedem Schritt, was zu prüfen ist und welche Wirkung die nächste Aktion im Spiel auslöst.",
    signal: "REGIEKANAL AKTIV",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 2/4",
    title: "Zufall bleibt Zufall.",
    body:
      "Millionär und Challenge-Teams werden automatisch gezogen. Bei Korkenabgabe kann der aktuelle Millionär keinen Nachfolger bestimmen.",
    signal: "ZUFALLSQUELLE GEPRÜFT",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 3/4",
    title: "Geheime Daten bleiben getrennt.",
    body:
      "Missionen, Vorteile, Stimmen und Rollen werden nur dort angezeigt, wo sie benötigt werden. Öffentliche Lobbydaten enthalten keine Geheimnisse.",
    signal: "GEHEIMBEREICH VERSIEGELT",
  },
  {
    eyebrow: "Spielleiter-Onboarding · 4/4",
    title: "Jeder Phasenwechsel wird angekündigt.",
    body:
      "Beim Auslösen der nächsten Aktion läuft eine kurze Sequenz. Sie schafft einen klaren Übergang und gibt den Spielern Zeit, ihre Displays zu prüfen.",
    signal: "SPIELLEITUNG BEREIT",
  },
] as const;

const PHASE_COPY: Record<RoundPhase, string> = {
  lobby: "Profile, Teilnehmerstatus und Teamaufteilung werden für den Start vorbereitet.",
  role_reveal: "Die privaten Rollenkarten werden freigegeben. Niemand darf auf fremde Displays sehen.",
  mission: "Die geheime Mission wird ausschließlich dem aktuellen Millionär zugänglich.",
  challenge: "Die ausgewählte Teamprüfung beginnt. Briefing, Siegbedingung und Sicherheit werden eingeblendet.",
  question: "Das Gewinnerteam bestimmt einen Fragesteller für eine exklusive Ja-Nein-Information.",
  discussion: "Die Gruppe diskutiert offen. Wahrheit, Täuschung und Verdacht treffen aufeinander.",
  mission_review: "Die Spielleitung prüft verdeckt, ob die geheime Mission erfüllt wurde.",
  advantage: "Ein möglicher Vorteil wird vorbereitet und erst bei der Auswertung wirksam.",
  voting: "Die geheime Abstimmung wird geöffnet. Jede stimmberechtigte Person wählt genau einmal.",
  evaluation: "Reguläre Stimmen und mögliche Vorteilskorrekturen werden geprüft.",
  result: "Das Rundenergebnis wird veröffentlicht und der Gewinnerpool aktualisiert.",
  role_transfer: "Der Korken wird behalten oder zufällig und geheim neu vergeben.",
  finished: "Das Finale ist abgeschlossen. Der einzige Hauptgewinner wird aufgelöst.",
};

export function getPhaseTransitionCue(
  phase: RoundPhase,
  round: RoundNumber,
): TransitionCue {
  return {
    eyebrow: `Runde ${round} · Phasenwechsel`,
    title: PHASE_LABELS[phase],
    body: PHASE_COPY[phase],
    signal: `PHASE ${phase.toUpperCase()} AKTIV`,
    durationMs: 1900,
  };
}

export function getActionTransitionCue(action: string): TransitionCue {
  const cues: Record<string, TransitionCue> = {
    register: {
      eyebrow: "Identität wird angelegt",
      title: "Profil wird versiegelt.",
      body: "Name, Profilbild und PIN werden verbunden. Anschließend startet dein persönliches Onboarding.",
      signal: "PROFIL GESICHERT",
    },
    playerUnlock: {
      eyebrow: "PIN bestätigt",
      title: "Persönlicher Zugang geöffnet.",
      body: "Deine private Spieleransicht wird geladen. Andere Profile bleiben gesperrt.",
      signal: "SPIELERKANAL OFFEN",
    },
    hostUnlock: {
      eyebrow: "Spielleiter-PIN bestätigt",
      title: "Regiezentrale wird geöffnet.",
      body: "Die nächste Spielaktion, alle Prüfhinweise und die geheime Steuerung werden geladen.",
      signal: "REGIEKANAL OFFEN",
    },
    revealRole: {
      eyebrow: "Private Karte",
      title: "Rolle wird entschlüsselt.",
      body: "Halte dein Display verdeckt. Diese Information ist ausschließlich für dich bestimmt.",
      signal: "ROLLE ENTSCHLÜSSELT",
    },
    vote: {
      eyebrow: "Geheime Abstimmung",
      title: "Deine Stimme wird versiegelt.",
      body: "Die Auswahl wird gespeichert und erst durch die Spielleitung ausgewertet.",
      signal: "STIMME GESPEICHERT",
    },
    roleDecision: {
      eyebrow: "Geheime Rollenentscheidung",
      title: "Entscheidung wird verschlossen.",
      body: "Die Auflösung erfolgt erst, wenn alle erforderlichen Entscheidungen vorliegen.",
      signal: "ENTSCHEIDUNG GESPEICHERT",
    },
    draw: {
      eyebrow: "Gesicherte Zufallsauslosung",
      title: "Der Korken findet seinen Träger.",
      body: "Die Auswahl erfolgt zufällig und geheim aus allen aktuell berechtigten Spielern.",
      signal: "AUSLOSUNG ABGESCHLOSSEN",
    },
    teams: {
      eyebrow: "Challenge-Vorbereitung",
      title: "Teams werden neu gemischt.",
      body: "Alle anwesenden Teilnehmer werden zufällig und möglichst gleichmäßig auf Azur und Gold verteilt.",
      signal: "TEAMS AUSGELOST",
    },
    evaluation: {
      eyebrow: "Auswertung läuft",
      title: "Stimmen werden geprüft.",
      body: "Reguläre Stimmen, Vorteilseffekte und mögliche Gleichstände werden getrennt berechnet.",
      signal: "ERGEBNIS BEREIT",
    },
    result: {
      eyebrow: "Rundenabschluss",
      title: "Das Urteil wird veröffentlicht.",
      body: "Ausscheiden, Punkte und die nächste Rollenentscheidung werden verbindlich vorbereitet.",
      signal: "RUNDE ABGESCHLOSSEN",
    },
    next: {
      eyebrow: "Nächste Aktion",
      title: "Das Protokoll wird fortgesetzt.",
      body: "Die aktuelle Phase wird geschlossen und der nächste Abschnitt wird vorbereitet.",
      signal: "NÄCHSTER ABSCHNITT BEREIT",
    },
  };
  return cues[action] ?? cues.next;
}
