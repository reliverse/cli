import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { type BiomeConfig, type ConfigPaths } from "~/types.js";

import { relinka } from "../handlers/logger.js";
import { addConfigMetadata } from "./miscellaneousConfigHelpers.js";

const BIOME_DEFAULT_CONFIG: BiomeConfig = addConfigMetadata({
  $schema: "https://biomejs.dev/schemas/1.5.3/schema.json",
  organizeImports: {
    enabled: true,
  },
  formatter: {
    enabled: true,
    indentStyle: "space",
    indentWidth: 2,
    lineWidth: 80,
  },
  linter: {
    enabled: true,
    rules: {
      recommended: true,
    },
  },
  javascript: {
    formatter: {
      quoteStyle: "double",
      trailingComma: "all",
      semicolons: "always",
    },
  },
});

const BIOME_MINIMAL_CONFIG: BiomeConfig = addConfigMetadata({
  $schema: "https://biomejs.dev/schemas/1.5.3/schema.json",
  organizeImports: {
    enabled: false,
  },
  formatter: {
    enabled: true,
    indentStyle: "space",
    indentWidth: 2,
  },
  linter: {
    enabled: false,
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

export async function configureBiome(
  config: Pick<
    ConfigPaths,
    "biomeConfig" | "biomeRecommendedConfig" | "biomeRulesDisabledConfig"
  >,
) {
  try {
    const targetDir = path.dirname(config.biomeConfig);
    await validateTargetDir(targetDir);

    const biomeConfigPath = config.biomeConfig;
    const biomeConfigExists = await fileExists(biomeConfigPath);

    const biome = await selectPrompt({
      title: "Please select which type of Biome configuration you want to use.",
      options: [
        {
          label: "Continue without Biome",
          value: "Skip",
          hint: "Continue without Biome configuration",
        },
        {
          label: "Default Configuration",
          value: "Default",
          hint: "Recommended settings with all features enabled",
        },
        {
          label: "Minimal Configuration",
          value: "Minimal",
          hint: "Basic formatting only, linting disabled",
        },
      ],
    });

    if (typeof biome !== "string") {
      process.exit(0);
    }

    if (biome === "Skip") {
      relinka("info", "Continuing without Biome configuration.");
      return;
    }

    // Backup existing config if it exists
    if (biomeConfigExists) {
      await backupConfig(biomeConfigPath);
      await removeFile(biomeConfigPath);
    }

    // Generate new config
    const configData =
      biome === "Default" ? BIOME_DEFAULT_CONFIG : BIOME_MINIMAL_CONFIG;
    if (!configData || typeof configData !== "object") {
      throw new Error("Invalid configuration template");
    }

    await fs.writeFile(biomeConfigPath, JSON.stringify(configData, null, 2));
    relinka(
      "success",
      `Generated ${biome.toLowerCase()} Biome configuration at ${biomeConfigPath}`,
    );
  } catch (error) {
    relinka(
      "error",
      "Failed to generate Biome configuration:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
