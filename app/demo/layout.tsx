import "./demo.css";
import "./final.css";
import "./expansion.css";
import "./onboarding.css";
import "./onboarding-fixes.css";
import "./onboarding-scenes.css";
import "./live-game.css";
import "./midnight-fortune.css";
import "./midnight-fortune-v2.css";
import "./midnight-fortune-v2-compat.css";
import "./live-flow-control.css";
import "./live-flow-control-compat.css";
import "./player-resume-gateway.css";
import "./start-page-player-resume.css";
import "./game-integrity-overlay.css";
import "./simplified-question-flow.css";
import "./host-selected-advantage-flow.css";
import PlayerResumeGateway from "./PlayerResumeGateway";
import GameIntegrityOverlay from "./GameIntegrityOverlay";
import SimplifiedQuestionFlow from "./SimplifiedQuestionFlow";
import HostSelectedAdvantageFlow from "./HostSelectedAdvantageFlow";

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      data-player-resume-version="profile-dropdown-v2"
      data-core-game-flow="restored-v1"
      data-question-flow-version="offline-team-choice-v1"
      data-advantage-flow-version="host-selected-integrated-v2"
    >
      <PlayerResumeGateway />
      <GameIntegrityOverlay />
      <SimplifiedQuestionFlow />
      <HostSelectedAdvantageFlow />
      {children}
    </div>
  );
}
