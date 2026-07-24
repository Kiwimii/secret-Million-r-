import type { Metadata } from "next";
import DemoAppFinal from "./DemoAppFinal";

export const metadata: Metadata = {
  title: "Einsatztest | Secret Millionär",
  description:
    "Geführte, mobile Browser-Testversion des vollständigen Secret-Millionär-Spiels.",
};

export default function DemoPage() {
  return (
    <div data-visual-version="midnight-fortune-v2">
      <DemoAppFinal />
    </div>
  );
}
