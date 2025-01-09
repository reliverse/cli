import { spinnerTaskPrompt } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import { CONFIG_CATEGORIES } from "~/app/db/constants.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import {
  type DeploymentService,
  type VSCodeSettings,
  type ReliverseConfig,
} from "~/types.js";

import { shouldRevalidate } from "../configs/reliverseReadWrite.js";
import { generateReliverseFile } from "./reliverseConfig.js";

async function generateBiomeConfig(
  targetDir: string,
  overwrite: boolean,
): Promise<void> {
  const biomePath = path.join(targetDir, "biome.json");
  if (overwrite ?? !(await fs.pathExists(biomePath))) {
    const biomeConfig = {
      $schema: "https://biomejs.dev/schemas/1.5.3/schema.json",
      organizeImports: {
        enabled: true,
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true,
        },
      },
      formatter: {
        enabled: true,
        formatWithErrors: false,
        indentStyle: "space",
        indentWidth: 2,
        lineWidth: 80,
      },
    };
    await fs.writeFile(biomePath, JSON.stringify(biomeConfig, null, 2));
    relinka("success-verbose", "Generated biome.json");
  }
}

async function generateVSCodeSettings(
  targetDir: string,
  overwrite: boolean,
): Promise<void> {
  const vscodePath = path.join(targetDir, ".vscode");
  await fs.ensureDir(vscodePath);

  const settingsPath = path.join(vscodePath, "settings.json");
  const defaultSettings: VSCodeSettings = {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "biomejs.biome",
    "editor.codeActionsOnSave": {
      "quickfix.biome": "explicit",
      "source.addMissingImports": "never",
      "source.fixAll.eslint": "explicit",
      "source.organizeImports": "never",
      "source.removeUnused": "never",
    },
    "eslint.ignoreUntitled": true,
    "eslint.rules.customizations": [
      {
        rule: "perfectionist/sort-imports",
        severity: "off",
      },
    ],
    "markdownlint.config": {
      MD033: false,
    },
    "typescript.enablePromptUseWorkspaceTsdk": true,
  };

  let settings = { ...defaultSettings };

  if (!overwrite && (await fs.pathExists(settingsPath))) {
    try {
      const content = await fs.readFile(settingsPath, "utf-8");
      const existingSettings = destr(content);

      if (existingSettings && typeof existingSettings === "object") {
        const existingCodeActions =
          // @ts-expect-error TODO: fix ts
          existingSettings["editor.codeActionsOnSave"] ?? {};
        settings = {
          ...defaultSettings,
          ...existingSettings,
          "editor.codeActionsOnSave": {
            ...existingCodeActions,
            "quickfix.biome": "explicit",
            "source.addMissingImports": "never",
            "source.fixAll.eslint": "explicit",
            "source.organizeImports": "never",
            "source.removeUnused": "never",
          },
        };
      }
    } catch (error) {
      relinka(
        "warn-verbose",
        "Error reading existing settings.json, creating new one",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  relinka(
    "success-verbose",
    overwrite
      ? "Generated new .vscode/settings.json"
      : "Updated .vscode/settings.json with required settings",
  );
}

async function generateConfigFiles(
  targetDir: string,
  overwrite: boolean,
  projectName: string,
  frontendUsername: string,
  deployService: DeploymentService,
  primaryDomain: string,
  i18nShouldBeEnabled: boolean,
  shouldInstallDeps: boolean,
  filesToGenerate: string[] = [],
): Promise<void> {
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage:
      filesToGenerate.length === 0
        ? "Generating configuration files..."
        : `Generating the following configuration files: ${filesToGenerate.join(", ")}...`,
    successMessage: "✅ Configuration files generated successfully!",
    errorMessage: "❌ Failed to generate configuration files",
    async action() {
      try {
        const shouldGenerateFile = (filename: string): boolean => {
          return (
            filesToGenerate.length === 0 || filesToGenerate.includes(filename)
          );
        };

        const configGenerators = {
          ".reliverse": async () =>
            generateReliverseFile({
              projectName,
              frontendUsername,
              deployService,
              primaryDomain,
              targetDir,
              i18nShouldBeEnabled,
              shouldInstallDeps,
              overwrite,
            }),
          "biome.json": () => generateBiomeConfig(targetDir, overwrite),
          "settings.json": () => generateVSCodeSettings(targetDir, overwrite),
        };

        await Promise.all(
          Object.entries(configGenerators)
            .filter(([filename]) => shouldGenerateFile(filename))
            .map(([_, generator]) => generator()),
        );
      } catch (error) {
        relinka(
          "error",
          "Error generating config files:",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  });
}

export async function generateProjectConfigs(
  targetDir: string,
  projectName: string,
  frontendUsername: string,
  deployService: DeploymentService,
  primaryDomain: string,
  i18nShouldBeEnabled: boolean,
  shouldInstallDeps: boolean,
): Promise<void> {
  try {
    // Check which files exist
    const existingFiles = [];
    for (const category of Object.keys(CONFIG_CATEGORIES)) {
      for (const file of CONFIG_CATEGORIES[
        category as keyof typeof CONFIG_CATEGORIES
      ]) {
        const filePath = path.join(targetDir, file);
        if (await fs.pathExists(filePath)) {
          existingFiles.push(file);
        }
      }
    }

    if (existingFiles.length > 0) {
      relinka(
        "info-verbose",
        `Found ${existingFiles.length} existing configuration files`,
      );
      // Generate missing files without overwriting existing ones
      await generateConfigFiles(
        targetDir,
        false,
        projectName,
        frontendUsername,
        deployService,
        primaryDomain,
        i18nShouldBeEnabled,
        shouldInstallDeps,
      );
    } else {
      // No existing files, generate everything
      await generateConfigFiles(
        targetDir,
        true,
        projectName,
        frontendUsername,
        deployService,
        primaryDomain,
        i18nShouldBeEnabled,
        shouldInstallDeps,
      );
    }
  } catch (error) {
    relinka(
      "error",
      `Failed to set up configuration files: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export async function updateProjectConfig(
  targetDir: string,
  configType: "reliverse" | "biome" | "vscode",
  updates: Record<string, unknown>,
): Promise<boolean> {
  try {
    const configPaths = {
      reliverse: ".reliverse",
      biome: "biome.json",
      vscode: ".vscode/settings.json",
    };

    const configPath = path.join(targetDir, configPaths[configType]);

    if (!(await fs.pathExists(configPath))) {
      relinka("error", `No ${configPaths[configType]} config file found`);
      return false;
    }

    const existingContent = destr(await fs.readFile(configPath, "utf-8"));
    if (!existingContent || typeof existingContent !== "object") {
      relinka("error", `Invalid ${configPaths[configType]} config format`);
      return false;
    }

    const updatedConfig = {
      ...existingContent,
      ...updates,
    };

    // Only update configLastRevalidate if it's a reliverse config and there are actual changes
    if (configType === "reliverse") {
      const config = updatedConfig as ReliverseConfig;
      const existingConfig = existingContent as ReliverseConfig;

      const hasChanges = Object.keys(updates).some((key) => {
        // For experimental object, check its properties
        if (key === "experimental") {
          const existingExp = existingConfig.experimental ?? {};
          const updatesExp = (updates[key] as Record<string, unknown>) ?? {};
          return Object.keys(updatesExp).some(
            (expKey) =>
              JSON.stringify(
                (existingExp as Record<string, unknown>)[expKey],
              ) !== JSON.stringify(updatesExp[expKey]),
          );
        }
        // For other root properties
        return (
          JSON.stringify(existingConfig[key as keyof ReliverseConfig]) !==
          JSON.stringify(updates[key])
        );
      });

      if (hasChanges) {
        config.experimental = {
          ...(config.experimental ?? {}),
          configLastRevalidate: shouldRevalidate(
            existingConfig.experimental?.configLastRevalidate,
            existingConfig.experimental?.configRevalidateFrequency,
          )
            ? new Date().toISOString()
            : existingConfig.experimental?.configLastRevalidate,
          configRevalidateFrequency:
            config.experimental?.configRevalidateFrequency ?? "7d",
        };
      }
    }

    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
    relinka("success-verbose", `Updated ${configPaths[configType]} config`);
    return true;
  } catch (error) {
    relinka(
      "error",
      "Failed to update config:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
