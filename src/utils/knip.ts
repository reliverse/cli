import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { type KnipConfig, type ConfigPaths } from "~/types.js";
import { relinka } from "~/utils/console.js";

import { addConfigMetadata } from "./configs/miscellaneousConfigHelpers.js";

const KNIP_DEFAULT_CONFIG: KnipConfig = addConfigMetadata({
  $schema: "https://unpkg.com/knip@latest/schema.json",
  entry: ["src/**/*.{ts,tsx}"],
  project: ["src/**/*.{ts,tsx}"],
  ignore: ["**/__tests__/**", "**/*.test.{ts,tsx}"],
  ignoreDependencies: ["@types/*"],
  rules: {
    classMembers: "warn",
    exports: "error",
    types: "error",
    enumMembers: "error",
    files: "error",
  },
});

const KNIP_MINIMAL_CONFIG = addConfigMetadata({
  $schema: "https://unpkg.com/knip@latest/schema.json",
  entry: ["src/**/*.{ts,tsx}"],
  project: ["src/**/*.{ts,tsx}"],
  ignore: ["**/__tests__/**", "**/*.test.{ts,tsx}"],
  ignoreDependencies: ["@types/*"],
  rules: {
    exports: "warn",
    files: "warn",
  },
});

async function backupConfig(configPath: string): Promise<void> {
  if (await fileExists(configPath)) {
    const backupPath = `${configPath}.backup-${Date.now()}`;
    await fs.copy(configPath, backupPath);
    relinka("info", `Created backup at ${backupPath}`);
  }
}

async function validateTargetDir(targetDir: string): Promise<void> {
  if (!targetDir) {
    throw new Error("Target directory is required");
  }

  if (!(await fs.pathExists(targetDir))) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  if (!(await fs.stat(targetDir).then((stat) => stat.isDirectory()))) {
    throw new Error(`Target path is not a directory: ${targetDir}`);
  }
}

export async function configureKnip(
  paths: Pick<
    ConfigPaths,
    "knipConfig" | "knipRecommendedConfig" | "knipRulesDisabledConfig"
  >,
) {
  try {
    const targetDir = path.dirname(paths.knipConfig);
    await validateTargetDir(targetDir);

    const knipConfigPath = paths.knipConfig;
    const knipConfigExists = await fileExists(knipConfigPath);

    const knip = await selectPrompt({
      title: "Please select which type of Knip configuration you want to use.",
      options: [
        {
          label: "Continue without Knip",
          value: "Skip",
          hint: "Continue without dead code detection",
        },
        {
          label: "Default Configuration",
          value: "Default",
          hint: "Strict dead code detection with all rules",
        },
        {
          label: "Minimal Configuration",
          value: "Minimal",
          hint: "Basic dead code detection with warnings only",
        },
      ],
    });

    if (typeof knip !== "string") {
      process.exit(0);
    }

    if (knip === "Skip") {
      relinka("info", "Continuing without Knip configuration.");
      return;
    }

    // Backup existing config if it exists
    if (knipConfigExists) {
      await backupConfig(knipConfigPath);
      await removeFile(knipConfigPath);
    }

    // Generate new config
    const configData =
      knip === "Default" ? KNIP_DEFAULT_CONFIG : KNIP_MINIMAL_CONFIG;
    if (!configData || typeof configData !== "object") {
      throw new Error("Invalid configuration template");
    }

    await fs.writeFile(knipConfigPath, JSON.stringify(configData, null, 2));
    relinka(
      "success",
      `Generated ${knip.toLowerCase()} Knip configuration at ${knipConfigPath}`,
    );
  } catch (error) {
    relinka(
      "error",
      "Failed to generate Knip configuration:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
