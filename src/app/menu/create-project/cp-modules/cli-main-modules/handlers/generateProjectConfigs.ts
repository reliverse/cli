import { spinnerTaskPrompt } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import { CONFIG_CATEGORIES } from "~/app/db/constants.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import {
  type DeploymentService,
  type ReliverseMemory,
  type VSCodeSettings,
} from "~/types.js";

import { generateReliverseFile } from "./reliverseConfig.js";

async function generateBiomeConfig(
  projectPath: string,
  overwrite: boolean,
): Promise<void> {
  const biomePath = path.join(projectPath, "biome.json");
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
  projectPath: string,
  overwrite: boolean,
): Promise<void> {
  const vscodePath = path.join(projectPath, ".vscode");
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
  memory: ReliverseMemory,
  projectPath: string,
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
              projectPath,
              i18nShouldBeEnabled,
              shouldInstallDeps,
              overwrite,
              memory,
            }),
          "biome.json": () => generateBiomeConfig(projectPath, overwrite),
          "settings.json": () => generateVSCodeSettings(projectPath, overwrite),
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
  memory: ReliverseMemory,
  projectPath: string,
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
        const filePath = path.join(projectPath, file);
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
        memory,
        projectPath,
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
        memory,
        projectPath,
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
  projectPath: string,
  configType: "reliverse" | "biome" | "vscode",
  updates: Record<string, unknown>,
): Promise<boolean> {
  try {
    const configPaths = {
      reliverse: ".reliverse",
      biome: "biome.json",
      vscode: ".vscode/settings.json",
    };

    const configPath = path.join(projectPath, configPaths[configType]);

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
