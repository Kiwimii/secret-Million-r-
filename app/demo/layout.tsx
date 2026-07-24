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
import PlayerResumeGateway from "./PlayerResumeGateway";

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-player-resume-version="profile-dropdown-v1">
      <PlayerResumeGateway />
      {children}
    </div>
  );
}
