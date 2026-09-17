import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Este app não usa uma lib de data-fetching (SWR/React Query) de
      // propósito - todo módulo busca dados com fetch simples num useEffect
      // (padrão "load on mount/dependency change" + reset de estado antes
      // da chamada assíncrona). É um uso seguro e correto do hook, só que
      // fora do formato que esta regra espera; downgrade para warning em
      // vez de reescrever a camada de dados do app inteiro.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
