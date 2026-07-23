import type { Metadata } from "next";
import DemoApp from "./DemoApp";

export const metadata: Metadata = {
  title: "Mobile Testversion | Secret Millionär",
  description: "Interaktive Browser-Testversion des Secret-Millionär-Spiels für Smartphone und Desktop.",
};

export default function DemoPage() {
  return <DemoApp />;
}
