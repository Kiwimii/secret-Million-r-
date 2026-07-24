import type { Metadata } from "next";
import DemoAppFinal from "./DemoAppFinal";

export const metadata: Metadata = {
  title: "Secret Millionär – Live-Ablauf V3",
  description:
    "Mobile Live-Partie mit verbindlichem Challenge-, Fragen-, Missions- und Vorteilssystem.",
};

export default function DemoPage() {
  return (
    <div data-visual-version="midnight-fortune-v3" data-live-flow="authoritative">
      <DemoAppFinal />
    </div>
  );
}
