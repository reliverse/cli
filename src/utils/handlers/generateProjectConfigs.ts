import { relinka } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { DeploymentService, VSCodeSettings } from "~/types.js";

import { CONFIG_CATEGORIES, UNKNOWN_VALUE } from "~/app/constants.js";
import {
  generateReliverseConfig,
  getReliverseConfigPath,
} from "~/utils/reliverseConfig.js";

// ------------------------------------------------------------------
// Helper Functions for Additional Config Files
// ------------------------------------------------------------------

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
        const defaultCodeActions: VSCodeSettings["editor.codeActionsOnSave"] = {
          "quickfix.biome": "explicit",
          "source.addMissingImports": "never",
          "source.fixAll.eslint": "explicit",
          "source.organizeImports": "never",
          "source.removeUnused": "never",
        };
        const existingCodeActions = {
          ...defaultCodeActions,
          ...((existingSettings as Record<string, unknown>)[
            "editor.codeActionsOnSave"
          ] as typeof defaultCodeActions),
        };
        settings = {
          ...defaultSettings,
          ...existingSettings,
          "editor.codeActionsOnSave": existingCodeActions,
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
      ? "Generated brand new VSCode settings.json file"
      : "Updated VSCode settings.json with required settings",
  );
}

// ------------------------------------------------------------------
// Main Config Files Generation
// ------------------------------------------------------------------

export async function generateConfigFiles(
  projectPath: string,
  overwrite: boolean,
  projectName: string,
  deployService: DeploymentService,
  primaryDomain: string,
  frontendUsername: string,
  enableI18n: boolean,
  isDev: boolean,
  filesToGenerate: string[] = [],
): Promise<void> {
  try {
    const shouldGenerateFile = (filename: string): boolean => {
      return filesToGenerate.length === 0 || filesToGenerate.includes(filename);
    };

    // Clean up domain format
    const cleanDomain = primaryDomain
      .replace(/^https?:\/\//, "") // Remove protocol
      .replace(/\/.*$/, ""); // Remove any trailing path

    if (isDev) {
      frontendUsername =
        frontendUsername === "reliverse" ? "blefnk" : frontendUsername;
    }

    // Use the unified helper to determine the active config file name.
    const configInfo = await getReliverseConfigPath(projectPath);
    const mainConfigFileName = path.basename(configInfo.configPath);

    // The main config generator now simply delegates to the unified generateReliverseConfig.
    const configGenerators: Record<string, () => Promise<boolean>> = {
      [mainConfigFileName]: async () => {
        await generateReliverseConfig({
          projectName,
          frontendUsername:
            !frontendUsername || frontendUsername.trim() === ""
              ? UNKNOWN_VALUE
              : frontendUsername,
          deployService,
          primaryDomain: cleanDomain,
          projectPath,
          githubUsername: UNKNOWN_VALUE,
          enableI18n,
          overwrite,
          isDev,
          configInfo,
        });
        return true;
      },
      "biome.json": async () => {
        await generateBiomeConfig(projectPath, overwrite);
        return true;
      },
      "settings.json": async () => {
        await generateVSCodeSettings(projectPath, overwrite);
        return true;
      },
    };

    const generatedFiles: string[] = [];
    await Promise.all(
      Object.entries(configGenerators)
        .filter(([filename]) => shouldGenerateFile(filename))
        .map(async ([filename, generator]) => {
          const wasGenerated = await generator();
          if (wasGenerated) {
            generatedFiles.push(filename);
          }
        }),
    );

    if (generatedFiles.length > 0) {
      relinka(
        "success-verbose",
        `Generated configuration files: ${generatedFiles.join(", ")}`,
      );
    }
  } catch (error) {
    relinka(
      "error",
      "Error generating config files:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export async function generateProjectConfigs(
  projectPath: string,
  projectName: string,
  frontendUsername: string,
  deployService: DeploymentService,
  primaryDomain: string,
  enableI18n: boolean,
  isDev: boolean,
): Promise<void> {
  try {
    // Check which files exist based on categories defined in CONFIG_CATEGORIES.
    const existingFiles: string[] = [];
    for (const category of Object.keys(CONFIG_CATEGORIES)) {
      const files =
        CONFIG_CATEGORIES[category as keyof typeof CONFIG_CATEGORIES];
      for (const file of files) {
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
        projectPath,
        false,
        projectName,
        deployService,
        primaryDomain,
        frontendUsername,
        enableI18n,
        isDev,
      );
    } else {
      // No existing files, generate everything
      await generateConfigFiles(
        projectPath,
        true,
        projectName,
        deployService,
        primaryDomain,
        frontendUsername,
        enableI18n,
        isDev,
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
