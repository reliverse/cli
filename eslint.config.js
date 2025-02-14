// @ts-check

import eslint from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import stylistic from "@stylistic/eslint-plugin";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import perfectionist from "eslint-plugin-perfectionist";
import { fileURLToPath } from "node:url";
import path from "pathe";
import tseslint from "typescript-eslint";

/** @type {import("typescript-eslint").Config} */
const config = tseslint.config(
  {
    ignores: ["**/.git/", "**/{node_modules,dist-jsr,dist-npm,tests-runtime}/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
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
    plugins: {
      perfectionist,
      // @ts-expect-error wrong issue
      "@stylistic": stylistic,
      "no-relative-import-paths": noRelativeImportPaths,
    },
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          disallowTypeAnnotations: true,
          fixStyle: "separate-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-control-regex": "off",
      "no-throw-literal": "warn",
      "no-constant-binary-expression": "off",
      "no-constant-condition": "off",
      "no-case-declarations": "off",
      "max-lines": ["error", 700],
      "perfectionist/sort-imports": "warn",
      "@stylistic/operator-linebreak": "off",
      "@stylistic/indent": "off",
      "@stylistic/quotes": "off",
      "@stylistic/quote-props": "off",
      "@stylistic/indent-binary-ops": "off",
      "no-relative-import-paths/no-relative-import-paths": [
        "warn",
        { allowSameFolder: true, rootDir: "src", prefix: "~" },
      ],
    },
  },
  {
    files: ["**/*.json"],
    plugins: {
      json,
    },
    language: "json/json",
    rules: {
      "no-irregular-whitespace": "off",
      "json/no-duplicate-keys": "error",
    },
  },
  {
    files: ["**/*.md"],
    plugins: {
      markdown,
    },
    language: "markdown/commonmark",
    rules: {
      "no-irregular-whitespace": "off",
      "markdown/no-html": [
        "error",
        {
          allowed: [
            "a",
            "Card",
            "CardGrid",
            "details",
            "div",
            "img",
            "p",
            "picture",
            "source",
            "span",
            "summary",
          ],
        },
      ],
    },
  },
  {
    files: ["build.publish.ts", "**/reliverseConfig.ts"],
    rules: {
      "max-lines": "off",
    },
  },
);

export default config;
