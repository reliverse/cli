import { task } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import { CONFIG_CATEGORIES } from "~/app/menu/data/constants.js";
import { type ReliverseConfig } from "~/types.js";
import { DEFAULT_CONFIG } from "~/utils/configs/reliverseDefaultConfig.js";
import { getDefaultReliverseConfig } from "~/utils/configs/reliverseReadWrite.js";
import { relinka } from "~/utils/console.js";

async function generateReliverseConfig(
  targetDir: string,
  overwrite: boolean,
): Promise<void> {
  const configPath = path.join(targetDir, "reliverse.json");

  const configContent = { ...DEFAULT_CONFIG };

  // Get rules and merge them directly into config
  const rc = await getDefaultReliverseConfig("my-app", "user");
  Object.assign(configContent, {
    // Project details
    projectName: rc.projectName,
    projectAuthor: rc.projectAuthor,
    projectDescription: rc.projectDescription,
    projectVersion: rc.projectVersion,
    projectLicense: rc.projectLicense,
    projectRepository: rc.projectRepository,

    // Project features
    features: rc.features,

    // Development preferences
    projectFramework: rc.projectFramework,
    projectFrameworkVersion: rc.projectFrameworkVersion,
    nodeVersion: rc.nodeVersion,
    runtime: rc.runtime,
    projectPackageManager: rc.projectPackageManager,
    monorepo: rc.monorepo,
    preferredLibraries: rc.preferredLibraries,
    codeStyle: rc.codeStyle,

    // Config revalidation
    configLastRevalidate: rc.configLastRevalidate,
    configRevalidateFrequency: rc.configRevalidateFrequency,
  });

  if (overwrite || !(await fs.pathExists(configPath))) {
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));
    relinka(
      "success-verbose",
      "Generated reliverse.json with flattened config",
    );
  } else {
    // If reliverse.json already exists, we can attempt to merge configs
    try {
      const existingContent = destr(await fs.readFile(configPath, "utf-8"));
      if (existingContent && typeof existingContent === "object") {
        const mergedContent = {
          ...(existingContent as ReliverseConfig),
          ...configContent,
        };
        await fs.writeFile(configPath, JSON.stringify(mergedContent, null, 2));
        relinka(
          "success-verbose",
          "Updated existing reliverse.json with flattened config",
        );
      }
    } catch (error) {
      relinka(
        "warn-verbose",
        "Error reading existing reliverse.json, creating new one",
        error instanceof Error ? error.message : String(error),
      );
      await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));
    }
  }
}

async function generateBiomeConfig(
  targetDir: string,
  overwrite: boolean,
): Promise<void> {
  const biomePath = path.join(targetDir, "biome.json");
  if (overwrite || !(await fs.pathExists(biomePath))) {
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
  const defaultSettings = {
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
    // Removed ".reliverserules" association since it's no longer used
    "typescript.enablePromptUseWorkspaceTsdk": true,
  };

  let settings = { ...defaultSettings };

  if (!overwrite && (await fs.pathExists(settingsPath))) {
    try {
      const content = await fs.readFile(settingsPath, "utf-8");
      const existingSettings = destr(content);

      if (existingSettings && typeof existingSettings === "object") {
        const existingCodeActions =
          existingSettings["editor.codeActionsOnSave"] || {};
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
  overwrite = false,
  filesToGenerate: string[] = [],
): Promise<void> {
  await task({
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

        // Removed .reliverserules since it's merged into reliverse.json
        const configGenerators = {
          "reliverse.json": () => generateReliverseConfig(targetDir, overwrite),
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

export async function generateProjectConfigs(targetDir: string): Promise<void> {
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
        "info",
        `Found ${existingFiles.length} existing configuration files`,
      );
      // Generate missing files without overwriting existing ones
      await generateConfigFiles(targetDir, false);
    } else {
      // No existing files, generate everything
      await generateConfigFiles(targetDir, true);
    }
  } catch (error) {
    relinka(
      "error",
      `Failed to set up configuration files: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
