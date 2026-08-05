import type { Metadata } from "next";
import AkteMidasApp from "./AkteMidasApp";

export const metadata: Metadata = {
  title: "Secret Millionär – Akte Midas",
  description: "Das düstere Agentenspiel mit geheimen Missionen, festen Feldoperationen, kontrollierter Abstimmung und schwarzem Humor.",
};

export default function DemoPage() {
  return <AkteMidasApp />;
}
