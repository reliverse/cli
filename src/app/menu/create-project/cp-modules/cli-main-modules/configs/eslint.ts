import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { type ConfigPaths } from "~/types.js";
import { relinka } from "~/utils/loggerRelinka.js";

const ESLINT_DEFAULT_CONFIG = `// @ts-check

import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import nextPlugin from "@next/eslint-plugin-next";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.coverage/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      "@next/next": nextPlugin,
    },
    rules: {
      ...ts.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "no-console": "warn",
    },
  },
  prettier,
];`;

const ESLINT_MINIMAL_CONFIG = `// @ts-check

import js from "@eslint/js";
import prettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.coverage/**",
    ],
  },
  js.configs.recommended,
  prettier,
];`;

async function validateProjectPath(projectPath: string): Promise<void> {
  if (!projectPath) {
    throw new Error("Target directory is required");
  }

  if (!(await fs.pathExists(projectPath))) {
    throw new Error(`Target directory does not exist: ${projectPath}`);
  }

  if (!(await fs.stat(projectPath).then((stat) => stat.isDirectory()))) {
    throw new Error(`Target path is not a directory: ${projectPath}`);
  }
}

export async function configureEslint(
  config: Pick<
    ConfigPaths,
    "eslintConfig" | "eslintRulesDisabledConfig" | "eslintUltimateConfig"
  >,
) {
  try {
    const projectPath = path.dirname(config.eslintConfig);
    await validateProjectPath(projectPath);

    const eslintConfigPath = config.eslintConfig;
    const eslintConfigExists = await fileExists(eslintConfigPath);

    const eslint = await selectPrompt({
      title:
        "Please select which type of ESLint configuration you want to use.",
      options: [
        {
          label: "Continue without ESLint",
          value: "Skip",
          hint: "Continue without ESLint configuration",
        },
        {
          label: "Default Configuration",
          value: "Default",
          hint: "Full TypeScript and Next.js linting",
        },
        {
          label: "Minimal Configuration",
          value: "Minimal",
          hint: "Basic JavaScript linting only",
        },
      ],
    });

    if (typeof eslint !== "string") {
      process.exit(0);
    }

    if (eslint === "Skip") {
      relinka("info", "Continuing without ESLint configuration.");
      return;
    }

    // Remove existing config if it exists
    if (eslintConfigExists) {
      await removeFile(eslintConfigPath);
    }

    try {
      // Generate new config
      const config =
        eslint === "Default" ? ESLINT_DEFAULT_CONFIG : ESLINT_MINIMAL_CONFIG;
      await fs.writeFile(eslintConfigPath, config);
      relinka(
        "success",
        `Generated ${eslint.toLowerCase()} ESLint configuration.`,
      );
    } catch (error) {
      relinka(
        "error",
        "Failed to generate ESLint configuration:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } catch (error) {
    relinka(
      "error",
      "Failed to configure ESLint:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
