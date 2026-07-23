import { PHASE_LABELS, ROUNDS } from "./constants";
import type { RoundPhase } from "./types";

export interface HostGuideContext {
  round: 1 | 2 | 3 | 4;
  phase: RoundPhase;
  hasMillionaire: boolean;
  missionStatus: "unassigned" | "assigned" | "completed" | "failed";
  voteStage: "main" | "runoff";
  submittedVotes: number;
  requiredVotes: number;
  roleDecisionsSubmitted: number;
  roleDecisionsRequired: number;
  roleTransferResolved: boolean;
  hasQuestioner: boolean;
  hasQuestion: boolean;
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
  if (round === 2) return "Die Mission endet mit dem Abschluss der Challenge.";
  if (round === 4) return "Die Mission endet bei der Rückkehr von der Tausch-Challenge.";
  return "Die Mission endet unmittelbar vor Beginn der Diskussion.";
}

export function getHostGuide(context: HostGuideContext): HostGuide {
  const round = ROUNDS.find((entry) => entry.number === context.round) ?? ROUNDS[0];

  switch (context.phase) {
    case "lobby":
      return {
        title: "Start vorbereiten",
        objective: "Prüfe die Teilnehmer und lose den ersten Millionär geheim aus.",
        checklist: [
          "Alle anwesenden Spieler sind angelegt und bestätigt.",
          "Niemand kann auf den Spielleiterbildschirm sehen.",
          "Der Startmillionär wurde noch nicht manuell festgelegt.",
        ],
        clickLabel: context.hasMillionaire ? "Rollen freigeben" : "Startmillionär zufällig auslosen",
        clickEffect: context.hasMillionaire
          ? "Runde 1 startet. Jeder Spieler kann anschließend ausschließlich seine eigene Rolle öffnen."
          : "Die App zieht kryptografisch zufällig genau einen anwesenden und gewinnberechtigten Spieler. Nur dessen private Ansicht zeigt die Millionärsrolle.",
        warning: "Der Spielleiter darf den Startmillionär nicht auswählen oder die Auslosung wiederholen, weil ihm das Ergebnis nicht gefällt.",
      };

    case "role_reveal":
      return {
        title: "Rollen diskret öffnen lassen",
        objective: `Alle Spieler prüfen ihre geheime Rolle für Runde ${context.round}.`,
        checklist: [
          "Alle Displays werden einzeln und ohne Zuschauer geöffnet.",
          "Niemand zeigt seine Rollenkarte herum.",
          "Ausgeschiedene Spieler erhalten keine neue aktive Rolle.",
        ],
        clickLabel: "Mission freigeben",
        clickEffect: "Die aktuelle Mission wird ausschließlich in der privaten Ansicht des Millionärs sichtbar.",
      };

    case "mission":
      return {
        title: "Geheime Mission starten",
        objective: "Der Millionär liest seine Aufgabe. Die Gruppe erhält keinen öffentlichen Hinweis.",
        checklist: [
          "Die Mission ist zum aktuellen Ort und Zeitpunkt durchführbar.",
          "Der Millionär hat seine private Ansicht geöffnet.",
          missionDeadline(context.round),
        ],
        clickLabel: "Challenge starten",
        clickEffect: "Die Challenge-Phase wird für alle geöffnet. Die Mission läuft verdeckt weiter bis zu ihrem festgelegten Ende.",
        blockedReason:
          context.missionStatus === "unassigned"
            ? "Die Mission muss zuerst als ausgegeben markiert werden."
            : undefined,
      };

    case "challenge":
      return {
        title: `Challenge durchführen: ${round.title}`,
        objective: "Führe die vorgesehene Team-Challenge durch und bestimme anschließend den Fragesteller.",
        checklist: [
          "Nur anwesende, nicht disqualifizierte Spieler werden Teams zugeteilt.",
          "Bei ungerader Spielerzahl wird die Teamgröße fair ausgeglichen.",
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
            ? "Die Challenge endet und die Mission wird geschlossen. Danach entscheidest du verdeckt über Erfolg oder Scheitern."
            : "Die Challenge endet. Im nächsten Schritt wird der vom Gewinnerteam bestimmte Fragesteller eingetragen.",
      };

    case "question":
      return {
        title: "Exklusive Frage abwickeln",
        objective: "Der bestimmte Fragesteller stellt genau eine zulässige Ja-Nein-Frage an die Spielleitung.",
        checklist: [
          "Die Frage ist eindeutig mit Ja oder Nein beantwortbar.",
          "Die Frage nennt keinen direkten Spielernamen und grenzt nicht auf nur ein bis zwei Personen ein.",
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
        blockedReason: !context.hasQuestioner
          ? "Zuerst muss ein Fragesteller festgelegt werden."
          : !context.hasQuestion
            ? "Frage und Antwort müssen dokumentiert sein."
            : undefined,
      };

    case "mission_review":
      return {
        title: "Mission verdeckt bewerten",
        objective: "Entscheide anhand der festgelegten Erfolgskriterien, ob die Mission erfüllt wurde.",
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
            ? "Die Mission wird als erfüllt gespeichert. Der ausgewählte Vorteil kann später in der Hauptabstimmung einmalig eingesetzt werden."
            : "Die Mission wird als gescheitert gespeichert. Es wird kein Vorteil angewendet.",
        blockedReason:
          context.missionStatus !== "completed" && context.missionStatus !== "failed"
            ? "Markiere die Mission eindeutig als erfüllt oder gescheitert."
            : undefined,
      };

    case "discussion":
      return {
        title: "Offene Diskussion moderieren",
        objective: "Lass Verdächtigungen, Verteidigungen und Bluff zu, ohne geheime Daten offenzulegen.",
        checklist: [
          "Der Fragesteller darf über seine Antwort berichten oder bluffen.",
          "Niemand zeigt eine private Rollen-, Missions- oder Antwortkarte.",
          "Die Diskussion endet zu einem klar angekündigten Zeitpunkt.",
        ],
        clickLabel: "Vorteil vorbereiten",
        clickEffect: "Die Diskussion wird geschlossen. Bei erfolgreicher Mission werden Vorteil und notwendige Zielperson verdeckt festgelegt.",
      };

    case "advantage":
      return {
        title: "Vorteil verdeckt konfigurieren",
        objective: "Bereite bei erfolgreicher Mission den Vorteil vollständig vor, ohne ihn öffentlich zu machen.",
        checklist: [
          "Der Vorteil entspricht der aktuellen Runde oder wurde bewusst durch eine Reservekarte ersetzt.",
          "Notwendige Ziel-, Wähler- oder Gegnerauswahl ist vollständig.",
          "Der Vorteil gilt nur für die Hauptabstimmung und nicht erneut in einer Stichwahl.",
        ],
        clickLabel: "Abstimmung öffnen",
        clickEffect: "Alle stimmberechtigten Spieler können genau eine geheime Hauptstimme abgeben. Der Vorteil wird erst bei der serverseitigen Auswertung eingerechnet.",
      };

    case "voting":
      return {
        title: context.voteStage === "runoff" ? "Geheime Stichwahl" : "Geheime Hauptabstimmung",
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
        clickEffect: "Weitere Stimmen werden nicht mehr berücksichtigt. Die App prüft Vollständigkeit, Vorteilseffekte und einen möglichen Gleichstand.",
        blockedReason:
          context.submittedVotes < context.requiredVotes
            ? `Es fehlen noch ${context.requiredVotes - context.submittedVotes} Stimmen.`
            : undefined,
      };

    case "evaluation":
      return {
        title: "Auswertung kontrollieren",
        objective: "Prüfe reguläre Stimmen, Vorteilskorrekturen und das daraus entstehende Ausscheidungsergebnis.",
        checklist: [
          "Reguläre und wirksame Stimmen sind getrennt nachvollziehbar.",
          "Bei Gleichstand folgt zuerst eine Stichwahl.",
          "Nur bei erneutem Gleichstand entscheidet eine echte Zufallsauslosung.",
        ],
        clickLabel: "Ergebnis veröffentlichen",
        clickEffect: "Der Spieler mit den meisten wirksamen Stimmen scheidet aus dem Gewinnerpool aus. Punkte und richtige persönliche Tipps werden verbindlich gespeichert.",
        warning: "Nach Veröffentlichung ist die Runde abgeschlossen. Nutze davor die Vorschau und prüfe auffällige Stimmen.",
      };

    case "result":
      return {
        title: "Rundenergebnis erklären",
        objective: "Veröffentliche nur das Ausscheiden und die erlaubte Information, nicht den geheimen Punktestand.",
        checklist: [
          "Der ausgeschiedene Spieler bleibt bei Anwesenheit in Diskussionen, Challenges und Abstimmungen.",
          "Er kann nicht mehr Millionär werden, Punkte sammeln oder den Hauptpreis gewinnen.",
          context.round === 4
            ? "Im Finale wird jetzt der Hauptgewinner aufgelöst."
            : "Danach folgt die geheime Rollenentscheidung.",
        ],
        clickLabel: context.round === 4 ? "Finale auflösen" : "Rollenentscheidung öffnen",
        clickEffect:
          context.round === 4
            ? "Die App beendet das Spiel und zeigt den nach Finalregel und Tiebreakern bestimmten Hauptgewinner."
            : "Alle weiterhin gewinnberechtigten Spieler erhalten ihre geheime Rollenentscheidung. Der aktuelle Millionär kann den Korken behalten oder abgeben.",
      };

    case "role_transfer":
      return {
        title: "Korkenentscheidung geheim auflösen",
        objective: "Sammle die Rollenentscheidungen und bestimme den Millionär der nächsten Runde ohne manuelle Zielauswahl.",
        checklist: [
          `${context.roleDecisionsSubmitted} von ${context.roleDecisionsRequired} erforderlichen Entscheidungen liegen vor.`,
          "Nur der aktuelle Millionär entscheidet zwischen Behalten und Abgeben.",
          "Bei Abgabe bestimmt die App den Nachfolger zufällig und schließt den bisherigen Millionär aus der Ziehung aus.",
          "Wurde der Millionär enttarnt, wird ebenfalls zufällig aus allen verbliebenen Berechtigten gezogen.",
        ],
        clickLabel: context.roleTransferResolved ? "Nächste Runde starten" : "Rollenentscheidung auflösen",
        clickEffect: context.roleTransferResolved
          ? "Die nächste Runde beginnt und jeder Spieler kann seine neue private Rolle öffnen."
          : "Die Entscheidungen werden verdeckt geprüft. Bei Behalten bleibt die Rolle bestehen; bei Abgabe oder Enttarnung erfolgt eine geheime Zufallsauslosung.",
        blockedReason:
          !context.roleTransferResolved && context.roleDecisionsSubmitted < context.roleDecisionsRequired
            ? `Es fehlen noch ${context.roleDecisionsRequired - context.roleDecisionsSubmitted} Rollenentscheidungen.`
            : undefined,
      };

    case "finished":
      return {
        title: "Spiel abgeschlossen",
        objective: "Zeige den Hauptgewinner und löse anschließend die Rollenchronologie auf.",
        checklist: [
          "Es gibt genau einen Hauptgewinner.",
          "Geheime Punktestände können jetzt gemeinsam offengelegt werden.",
          "Das Ereignisprotokoll bleibt für spätere Nachvollziehbarkeit erhalten.",
        ],
        clickLabel: "Keine weitere Aktion",
        clickEffect: "Das Spiel ist beendet. Ein Neustart erzeugt eine vollständig neue Partie und eine neue Zufallsauslosung.",
      };

    default:
      return {
        title: PHASE_LABELS[context.phase],
        objective: "Prüfe den aktuellen Spielzustand.",
        checklist: [],
        clickLabel: "Weiter",
        clickEffect: "Die nächste Phase wird geöffnet.",
      };
  }
}
