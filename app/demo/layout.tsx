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
import "./round-transition-finale.css";
import "./popup-lobby-fix.css";
import "./host-secret-round-controls.css";
import "./player-role-recall.css";
import PlayerResumeGateway from "./PlayerResumeGateway";
import HostResumeGateway from "./HostResumeGateway";
import GameIntegrityOverlay from "./GameIntegrityOverlay";
import SimplifiedQuestionFlow from "./SimplifiedQuestionFlow";
import HostSelectedAdvantageFlow from "./HostSelectedAdvantageFlow";
import RoundTransitionFinaleOverlay from "./RoundTransitionFinaleOverlay";
import ResultPopupCloseController from "./ResultPopupCloseController";
import HostSecretRoundControls from "./HostSecretRoundControls";
import PlayerRoleRecall from "./PlayerRoleRecall";

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      data-player-resume-version="profile-dropdown-v2"
      data-host-resume-version="host-pin-v1"
      data-host-resume-verification="production-v2"
      data-player-role-recall-version="private-popup-v1"
      data-core-game-flow="restored-v1"
      data-question-flow-version="offline-team-choice-v1"
      data-advantage-flow-version="host-selected-integrated-v2"
      data-round-transition-version="closable-lobby-v2"
      data-finale-version="ranking-v2"
      data-popup-flow-version="closable-lobby-v1"
      data-host-candidate-version="reroll-v1"
      data-challenge-malus-version="three-votes-v1"
    >
      <PlayerResumeGateway />
      <HostResumeGateway />
      <GameIntegrityOverlay />
      <SimplifiedQuestionFlow />
      <HostSelectedAdvantageFlow />
      <RoundTransitionFinaleOverlay />
      <ResultPopupCloseController />
      <HostSecretRoundControls />
      <PlayerRoleRecall />
      {children}
    </div>
  );
}
