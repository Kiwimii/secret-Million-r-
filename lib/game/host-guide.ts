import { PHASE_LABELS, ROUNDS } from "./constants";
import type { RoundPhase } from "./types";

export interface HostGuideContext {
  round: 1 | 2 | 3 | 4;
  phase: RoundPhase;
  hasMillionaire: boolean;
  registeredPlayers: number;
  invitedPlayers: number;
  missionStatus: "unassigned" | "assigned" | "completed" | "failed";
  voteStage: "main" | "runoff";
  submittedVotes: number;
  requiredVotes: number;
  roleDecisionsSubmitted: number;
  roleDecisionsRequired: number;
  roleTransferResolved: boolean;
  hasQuestioner: boolean;
  hasQuestion: boolean;
  hasChallenge: boolean;
  teamAssignments: number;
  hasChallengeWinner: boolean;
}

export interface HostGuide {
  title: string;
  objective: string;
  checklist: string[];
  clickLabel: string;
  clickEffect: string;
  warning?: string;
  blockedReason?: string;
}

function missionDeadline(round: 1 | 2 | 3 | 4): string {
  if (round === 2) {
    return "Die Mission endet mit dem Abschluss der Challenge.";
  }
  if (round === 4) {
    return "Die Mission endet bei der Rückkehr von der Tausch-Challenge.";
  }
  return "Die Mission endet unmittelbar vor Beginn der Diskussion.";
}

export function getHostGuide(context: HostGuideContext): HostGuide {
  const round =
    ROUNDS.find((entry) => entry.number === context.round) ?? ROUNDS[0];

  switch (context.phase) {
    case "lobby": {
      const registrationBlock =
        context.registeredPlayers < 2
          ? "Mindestens zwei Spieler müssen ihr Profil registriert haben."
          : undefined;
      const teamBlock =
        context.hasMillionaire && context.teamAssignments < 2
          ? "Wähle die erste Challenge und lose Team Azur und Team Gold aus."
          : undefined;
      return {
        title: "Anmeldung und Start vorbereiten",
        objective:
          "Prüfe Profile, gemeinsame Lobby und Teamaufteilung. Danach wird der Startmillionär geheim ausgelost und Runde 1 freigegeben.",
        checklist: [
          `${context.registeredPlayers} Spieler sind registriert; ${context.invitedPlayers} Einladungen sind noch offen.`,
          "Jedes aktive Profil hat den richtigen Namen und möglichst ein erkennbares Profilbild.",
          "Die ausgewählte Challenge ist für Ort, Wetter und Material geeignet.",
          "Team Azur und Team Gold wurden zufällig und möglichst gleich groß ausgelost.",
          "Niemand kann bei der Millionärsauslosung auf den Spielleiterbildschirm sehen.",
        ],
        clickLabel: context.hasMillionaire
          ? "Rollen freigeben"
          : "Startmillionär zufällig auslosen",
        clickEffect: context.hasMillionaire
          ? "Runde 1 startet. Jeder registrierte Spieler kann anschließend ausschließlich seine eigene Rolle öffnen. Die Lobby und Teamzuordnung bleiben für alle sichtbar."
          : "Die App zieht kryptografisch zufällig genau einen anwesenden, registrierten und gewinnberechtigten Spieler. Eine manuelle Auswahl ist ausgeschlossen.",
        warning:
          "Die Auslosung darf nicht wiederholt werden, nur weil das Ergebnis der Spielleitung nicht gefällt. Eine erneute Ziehung ist ausschließlich bei einem echten Ausfall zulässig.",
        blockedReason: registrationBlock ?? teamBlock,
      };
    }

    case "role_reveal":
      return {
        title: "Rollen diskret öffnen lassen",
        objective: `Alle registrierten Spieler prüfen ihre geheime Rolle für Runde ${context.round}.`,
        checklist: [
          "Alle Displays werden einzeln und ohne Zuschauer geöffnet.",
          "Niemand zeigt seine Rollenkarte herum.",
          "Ausgeschiedene Spieler erhalten keine neue aktive Rolle.",
          "Die gemeinsame Lobby zeigt weiterhin nur öffentliche Daten und Teams.",
        ],
        clickLabel: "Mission freigeben",
        clickEffect:
          "Die aktuelle Mission wird ausschließlich in der privaten Ansicht des Millionärs sichtbar.",
      };

    case "mission":
      return {
        title: "Geheime Mission starten",
        objective:
          "Der Millionär liest seine Aufgabe. Die Gruppe erhält keinen öffentlichen Hinweis.",
        checklist: [
          "Die Mission ist am aktuellen Ort und mit der Gruppengröße durchführbar.",
          "Der Millionär hat seine private Ansicht geöffnet.",
          missionDeadline(context.round),
          "Challenge und Teams sind in der Lobby korrekt sichtbar.",
        ],
        clickLabel: "Challenge starten",
        clickEffect:
          "Die ausgewählte Challenge wird für alle mit persönlichem Team, Spieler-Briefing, Siegbedingung und Sicherheitshinweis geöffnet. Die Mission läuft verdeckt weiter.",
        blockedReason:
          context.missionStatus === "unassigned"
            ? "Die Mission muss zuerst als ausgegeben markiert werden."
            : !context.hasChallenge
              ? "Wähle zuerst eine Challenge aus."
              : context.teamAssignments < 2
                ? "Lose zuerst die Challenge-Teams aus."
                : undefined,
      };

    case "challenge":
      return {
        title: `Challenge durchführen: ${round.title}`,
        objective:
          "Lies das Spieler-Briefing vor, führe die ausgewählte Prüfung durch und bestätige anschließend das Gewinnerteam.",
        checklist: [
          "Material, Spielfeld und Sicherheitshinweis wurden vollständig geprüft.",
          "Nur anwesende und nicht disqualifizierte Spieler sind einem Team zugeteilt.",
          "Team Azur und Team Gold unterscheiden sich höchstens um eine Person.",
          "Siegbedingung, Zeitlimit und mögliche Strafregeln wurden vor dem Start erklärt.",
          context.round === 2 || context.round === 4
            ? "Nach Ende der Challenge muss die Mission sofort bewertet werden."
            : "Die Mission läuft noch bis kurz vor der Diskussion.",
        ],
        clickLabel:
          context.round === 2 || context.round === 4
            ? "Mission bewerten"
            : "Fragesteller festlegen",
        clickEffect:
          context.round === 2 || context.round === 4
            ? "Die Challenge endet, das bestätigte Gewinnerteam wird gespeichert und die Mission wird geschlossen. Danach bewertest du verdeckt Erfolg oder Scheitern."
            : "Die Challenge endet. Nur Mitglieder des bestätigten Gewinnerteams können im nächsten Schritt als Fragesteller ausgewählt werden.",
        warning:
          "Ändere Challenge oder Teams nach dem Start nur bei einem echten organisatorischen Problem. Eine Neuauslosung verändert die öffentliche Lobby für alle.",
        blockedReason: !context.hasChallenge
          ? "Es wurde noch keine Challenge ausgewählt."
          : context.teamAssignments < 2
            ? "Die Teams wurden noch nicht ausgelost."
            : !context.hasChallengeWinner
              ? "Bestätige nach Durchführung Team Azur oder Team Gold als Gewinner."
              : undefined,
      };

    case "question":
      return {
        title: "Exklusive Frage abwickeln",
        objective:
          "Das bestätigte Gewinnerteam bestimmt genau einen Fragesteller für eine private Ja-Nein-Frage.",
        checklist: [
          "Der Fragesteller gehört zum bestätigten Gewinnerteam.",
          "Die Frage ist eindeutig mit Ja oder Nein beantwortbar.",
          "Sie nennt keinen direkten Spielernamen und grenzt nicht auf nur ein bis zwei Personen ein.",
          "Antwort und Frage werden vertraulich nur dem Fragesteller gezeigt.",
        ],
        clickLabel:
          context.round === 1 || context.round === 3
            ? "Mission bewerten"
            : "Diskussion starten",
        clickEffect:
          context.round === 1 || context.round === 3
            ? "Die Frage wird geschlossen. Vor Beginn der Diskussion wird die geheime Mission abschließend bewertet."
            : "Die exklusive Frage wird geschlossen und die gemeinsame Diskussion beginnt.",
        blockedReason: !context.hasChallengeWinner
          ? "Zuerst muss das Gewinnerteam der Challenge bestätigt werden."
          : !context.hasQuestioner
            ? "Zuerst muss ein Fragesteller aus dem Gewinnerteam festgelegt werden."
            : !context.hasQuestion
              ? "Frage und Antwort müssen dokumentiert sein."
              : undefined,
      };

    case "mission_review":
      return {
        title: "Mission verdeckt bewerten",
        objective:
          "Entscheide anhand der festgelegten Erfolgskriterien, ob die Mission erfüllt wurde.",
        checklist: [
          "Nur selbst beobachtete oder eindeutig nachweisbare Handlungen zählen.",
          "Bei Zweifel gilt die vorher formulierte Erfolgsvoraussetzung, nicht Sympathie oder Spielgefühl.",
          "Das Ergebnis wird nicht öffentlich erklärt.",
        ],
        clickLabel:
          context.round === 2 || context.round === 4
            ? "Fragesteller öffnen"
            : "Diskussion starten",
        clickEffect:
          context.missionStatus === "completed"
            ? "Die Mission wird als erfüllt gespeichert. Einer der 16 Vorteile kann vollständig und verdeckt konfiguriert werden."
            : "Die Mission wird als gescheitert gespeichert. Es wird kein Vorteil angewendet.",
        blockedReason:
          context.missionStatus !== "completed" &&
          context.missionStatus !== "failed"
            ? "Markiere die Mission eindeutig als erfüllt oder gescheitert."
            : undefined,
      };

    case "discussion":
      return {
        title: "Offene Diskussion moderieren",
        objective:
          "Lass Verdächtigungen, Verteidigungen und Bluff zu, ohne geheime Daten offenzulegen.",
        checklist: [
          "Der Fragesteller darf über seine Antwort berichten oder bluffen.",
          "Niemand zeigt eine private Rollen-, Missions-, Vorteils- oder Antwortkarte.",
          "Die Diskussion endet zu einem klar angekündigten Zeitpunkt.",
        ],
        clickLabel: "Vorteil vorbereiten",
        clickEffect:
          "Die Diskussion wird geschlossen. Bei erfolgreicher Mission werden Vorteil und sämtliche erforderlichen Ziele verdeckt festgelegt.",
      };

    case "advantage":
      return {
        title: "Vorteil verdeckt konfigurieren",
        objective:
          "Wähle bei erfolgreicher Mission eine der 16 Vorteilskarten und bereite alle benötigten Ziele vollständig vor.",
        checklist: [
          "Die Spielerbeschreibung wurde nur dem Millionär gezeigt.",
          "Die Spielleiterbeschreibung und Grenze wurden vollständig gelesen.",
          "Notwendige Ziel-, Zweitziel-, Ausgangsziel-, Wähler- oder Gegnerauswahl ist vollständig.",
          "Der Vorteil gilt ausschließlich in der Hauptabstimmung.",
        ],
        clickLabel: "Abstimmung öffnen",
        clickEffect:
          "Alle stimmberechtigten Spieler können genau eine geheime Hauptstimme abgeben. Der ausgewählte Vorteil wird erst bei der Auswertung sichtbar verrechnet.",
      };

    case "voting":
      return {
        title:
          context.voteStage === "runoff"
            ? "Geheime Stichwahl"
            : "Geheime Hauptabstimmung",
        objective:
          context.voteStage === "runoff"
            ? "Alle Stimmberechtigten wählen erneut, ausschließlich zwischen den Gleichstehenden."
            : "Alle Stimmberechtigten beschuldigen genau einen noch gewinnberechtigten und anwesenden Spieler.",
        checklist: [
          `${context.submittedVotes} von ${context.requiredVotes} Stimmen sind eingegangen.`,
          "Niemand stimmt offen oder zeigt seine Auswahl.",
          context.voteStage === "runoff"
            ? "Vorteile werden in der Stichwahl nicht erneut angewendet."
            : "Statusänderungen während der Wahl entfernen automatisch ungültige Stimmen.",
        ],
        clickLabel: "Abstimmung schließen und prüfen",
        clickEffect:
          "Weitere Stimmen werden nicht mehr berücksichtigt. Die App prüft Vollständigkeit, Vorteilseffekte und einen möglichen Gleichstand.",
        blockedReason:
          context.submittedVotes < context.requiredVotes
            ? `Es fehlen noch ${
                context.requiredVotes - context.submittedVotes
              } Stimmen.`
            : undefined,
      };

    case "evaluation":
      return {
        title: "Auswertung kontrollieren",
        objective:
          "Prüfe reguläre Stimmen, Vorteilskorrekturen und das daraus entstehende Ausscheidungsergebnis.",
        checklist: [
          "Reguläre und wirksame Stimmen sind getrennt nachvollziehbar.",
          "Der konfigurierte Vorteil entspricht seiner Spieler- und Spielleiterbeschreibung.",
          "Bei Gleichstand folgt zuerst eine Stichwahl.",
          "Nur bei erneutem Gleichstand entscheidet eine echte Zufallsauslosung.",
        ],
        clickLabel: "Ergebnis veröffentlichen",
        clickEffect:
          "Der Spieler mit den meisten wirksamen Stimmen scheidet aus dem Gewinnerpool aus. Punkte und richtige persönliche Tipps werden verbindlich gespeichert.",
        warning:
          "Nach Veröffentlichung ist die Runde abgeschlossen. Nutze davor die Vorschau und prüfe auffällige Korrekturen.",
      };

    case "result":
      return {
        title: "Rundenergebnis erklären",
        objective:
          "Veröffentliche nur Ausscheiden und erlaubte Information, nicht den geheimen Punktestand.",
        checklist: [
          "Der ausgeschiedene Spieler bleibt bei Anwesenheit in Diskussionen, Challenges und Abstimmungen.",
          "Er kann nicht mehr Millionär werden, Punkte sammeln oder den Hauptpreis gewinnen.",
          context.round === 4
            ? "Im Finale wird jetzt der Hauptgewinner aufgelöst."
            : "Danach folgt die geheime Korkenentscheidung.",
        ],
        clickLabel:
          context.round === 4
            ? "Finale auflösen"
            : "Rollenentscheidung öffnen",
        clickEffect:
          context.round === 4
            ? "Die App beendet das Spiel und zeigt den nach Finalregel und Tiebreakern bestimmten Hauptgewinner."
            : "Alle weiterhin gewinnberechtigten Spieler erhalten ihre geheime Rollenentscheidung. Der aktuelle Millionär kann den Korken behalten oder abgeben.",
      };

    case "role_transfer":
      return {
        title: "Korkenentscheidung geheim auflösen",
        objective:
          "Sammle die Entscheidungen und bestimme den Millionär der nächsten Runde ohne manuelle Zielauswahl.",
        checklist: [
          `${context.roleDecisionsSubmitted} von ${context.roleDecisionsRequired} erforderlichen Entscheidungen liegen vor.`,
          "Nur der aktuelle Millionär entscheidet zwischen Behalten und Abgeben.",
          "Bei Abgabe bestimmt die App den Nachfolger zufällig und schließt den bisherigen Millionär aus.",
          "Wurde der Millionär enttarnt, wird zufällig aus allen verbliebenen Berechtigten gezogen.",
          "Vor Start der nächsten Runde kann eine neue Challenge gewählt und die Teamaufteilung neu ausgelost werden.",
        ],
        clickLabel: context.roleTransferResolved
          ? "Nächste Runde starten"
          : "Rollenentscheidung auflösen",
        clickEffect: context.roleTransferResolved
          ? "Die nächste Runde beginnt. Spieler öffnen ihre neue private Rolle; Challenge und Teams werden in der Lobby aktualisiert."
          : "Die Entscheidungen werden verdeckt geprüft. Bei Behalten bleibt die Rolle; bei Abgabe oder Enttarnung erfolgt eine geheime Zufallsauslosung.",
        blockedReason:
          !context.roleTransferResolved &&
          context.roleDecisionsSubmitted < context.roleDecisionsRequired
            ? `Es fehlen noch ${
                context.roleDecisionsRequired -
                context.roleDecisionsSubmitted
              } Rollenentscheidungen.`
            : undefined,
      };

    case "finished":
      return {
        title: "Spiel abgeschlossen",
        objective:
          "Zeige den Hauptgewinner und löse anschließend die Rollenchronologie auf.",
        checklist: [
          "Es gibt genau einen Hauptgewinner.",
          "Geheime Punktestände können jetzt gemeinsam offengelegt werden.",
          "Das Ereignisprotokoll bleibt für spätere Nachvollziehbarkeit erhalten.",
        ],
        clickLabel: PHASE_LABELS.finished,
        clickEffect: "Es wird keine weitere Spielphase freigegeben.",
      };
  }
}
