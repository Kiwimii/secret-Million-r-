import type { Metadata } from "next";
import MetaGameApp from "./MetaGameApp";

export const metadata: Metadata = {
  title: "Secret Millionär – Live Dashboard",
  description: "Vollständige Mehrgeräte-Partie mit dauerhaftem Spieler-Dashboard, Spielleitersteuerung, Benachrichtigungen und Finale.",
};

export default function DemoPage() {
  return <MetaGameApp />;
}
