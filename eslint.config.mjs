import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    ignores: ['coverage/**', 'playwright-report/**', 'test-results/**', '.next/**', 'spike/**', 'apps/**'],
  },
  {
    extends: [...next],
    rules: {
      "@next/next/no-img-element": "off",
      // React Compiler is not enabled. Keep its advisory optimization checks
      // out of the baseline gate until a dedicated compiler-adoption task.
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
