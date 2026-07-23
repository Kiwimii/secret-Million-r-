import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath =
  process.env.GITHUB_PAGES === "true" ? "/secret-Million-r-" : "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Secret Millionär – Blaue Adria",
    short_name: "Secret Millionär",
    description:
      "Mobile Spiel- und Testoberfläche für Secret Millionär an der Blauen Adria.",
    start_url: `${basePath}/demo/`,
    display: "standalone",
    background_color: "#050c0e",
    theme_color: "#071113",
    icons: [
      {
        src: `${basePath}/secret-millionaer-icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
