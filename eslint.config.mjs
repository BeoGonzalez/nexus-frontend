import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Herramientas locales de agentes/diseño y artefactos (no son código de la aplicación).
    ".agent/**",
    ".claude/**",
    ".gemini/**",
    ".impeccable/**",
    ".opencode/**",
    ".pi/**",
    ".playwright/**",
    ".superpowers/**",
    ".taste-skill/**",
    "openspec/**",
    "docs/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
