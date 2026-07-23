import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Secret Millionär – Blaue Adria",
    short_name: "Secret Millionär",
    description: "Mobile Spiel- und Testoberfläche für Secret Millionär an der Blauen Adria.",
    start_url: "/demo",
    display: "standalone",
    background_color: "#050c0e",
    theme_color: "#071113",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/secret-millionaer-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
