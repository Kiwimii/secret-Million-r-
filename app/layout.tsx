import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secret Millionär – Blaue Adria",
  description: "Das moderierte Echtzeitspiel für das Wochenende an der Blauen Adria.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
