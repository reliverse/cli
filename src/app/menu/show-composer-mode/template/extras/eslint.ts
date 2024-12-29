// @ts-check

import eslint from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const config = tseslint.config(
  {
    ignores: ["**/.git/", "**/node_modules/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{js,jsx,md,json}"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        warnOnUnsupportedTypeScriptVersion: false,
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      "max-lines": ["error", 700],
    },
  },
);

export default config;
