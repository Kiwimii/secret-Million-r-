import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath =
  process.env.GITHUB_PAGES === "true" ? "/secret-Million-r-" : "";

export const metadata: Metadata = {
  title: "Secret Millionär – Blaue Adria",
  description:
    "Das moderierte Echtzeitspiel für das Wochenende an der Blauen Adria.",
  applicationName: "Secret Millionär",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Secret Millionär",
  },
  icons: {
    icon: `${basePath}/secret-millionaer-icon.svg`,
    apple: `${basePath}/secret-millionaer-icon.svg`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#071113",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
