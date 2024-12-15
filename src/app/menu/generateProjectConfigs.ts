import { task } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { CONFIG_CATEGORIES } from "~/app/data/constants.js";
import { DEFAULT_CONFIG } from "~/types/config.js";
import { relinka } from "~/utils/console.js";

async function generateConfigFiles(
  targetDir: string,
  overwrite = false,
): Promise<void> {
  await task({
    spinnerSolution: "ora",
    initialMessage: "Generating configuration files...",
    successMessage: "✅ Configuration files generated successfully!",
    errorMessage: "❌ Failed to generate configuration files",
    async action() {
      try {
        // Generate reliverse.json
        const configPath = path.join(targetDir, "reliverse.json");
        if (overwrite || !(await fs.pathExists(configPath))) {
          await fs.writeFile(
            configPath,
            JSON.stringify(DEFAULT_CONFIG, null, 2),
          );
          relinka("success", "Generated reliverse.json");
        }

        // Generate biome.json
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
          relinka("success", "Generated biome.json");
        }

        // Create .vscode directory with settings
        const vscodePath = path.join(targetDir, ".vscode");
        const settingsPath = path.join(vscodePath, "settings.json");
        if (overwrite || !(await fs.pathExists(settingsPath))) {
          await fs.ensureDir(vscodePath);
          const settings = {
            "editor.defaultFormatter": "biomejs.biome",
            "editor.formatOnSave": true,
            "editor.codeActionsOnSave": {
              "source.organizeImports.biome": true,
            },
          };
          await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
          relinka("success", "Generated VS Code settings");
        }
      } catch (error) {
        relinka(
          "error",
          `Failed to generate config files: ${error instanceof Error ? error.message : String(error)}`,
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
