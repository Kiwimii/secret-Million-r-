import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["app/demo/**/*.tsx", "lib/demo/**/*.ts"],
    rules: {
      // Die Testversion synchronisiert ihren Zustand bewusst beim Mounten mit
      // localStorage/sessionStorage. Produktiv wird dies durch Supabase ersetzt.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"]),
]);
