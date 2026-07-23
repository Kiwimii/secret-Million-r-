import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["app/demo/**/*.tsx", "lib/demo/**/*.ts", "lib/live/**/*.ts"],
    rules: {
      // Demo- und Live-Clients hydrieren beim Mounten bewusst Zustand aus
      // Browser-Speicher, Auth und Realtime. Weitere Updates erfolgen über
      // externe Supabase-Callbacks und Presence-Ereignisse.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"]),
]);
