import { destr } from "destr";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "~/utils/console.js";

import type { ReliverseConfig } from "../types.js";

import { DEFAULT_CONFIG } from "../types.js";
import { MEMORY_FILE } from "./data/constants.js";

export const isConfigExists = async () => {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, MEMORY_FILE);
    return await fs.pathExists(filePath);
  } catch (error) {
    relinka("error", "Error checking if config file exists:", error.toString());
    return false;
  }
};

export async function readConfig(cwd: string): Promise<ReliverseConfig> {
  const configPath = path.join(cwd, "reliverse.json");
  const rulesPath = path.join(cwd, "reliverse.json");
  let config: ReliverseConfig = { ...DEFAULT_CONFIG };

  try {
    // Try to read reliverse.json first
    if (await fs.pathExists(configPath)) {
      const configContent = await fs.readFile(configPath, "utf-8");
      const userConfig = destr<Partial<ReliverseConfig>>(configContent);
      config = { ...config, ...userConfig };
    }

    // Try to read reliverse.json and merge if exists
    if (await fs.pathExists(rulesPath)) {
      const rulesContent = await fs.readFile(rulesPath, "utf-8");
      let rules: ReliverseConfig;

      try {
        // Try parsing as JSONC first
        rules = destr(rulesContent);
      } catch {
        // If parsing fails, warn user but continue with existing config
        relinka(
          "warn",
          "Failed to parse reliverse.json file, using reliverse.json only",
        );
        return config;
      }

      // Merge rules into config, preserving existing values
      config = {
        ...config,
        // Project details
        projectName: rules.projectName || config.projectName,
        projectAuthor: rules.projectAuthor || config.projectAuthor,
        projectDescription:
          rules.projectDescription || config.projectDescription,
        projectVersion: rules.projectVersion || config.projectVersion,
        projectLicense: rules.projectLicense || config.projectLicense,
        projectRepository: rules.projectRepository || config.projectRepository,

        // Project features
        features: {
          ...config.features,
          ...rules.features,
        },

        // Development preferences
        projectFramework: rules.projectFramework || config.projectFramework,
        projectFrameworkVersion:
          rules.projectFrameworkVersion || config.projectFrameworkVersion,
        nodeVersion: rules.nodeVersion || config.nodeVersion,
        runtime: rules.runtime || config.runtime,
        projectPackageManager:
          rules.projectPackageManager || config.projectPackageManager,
        monorepo: rules.monorepo || config.monorepo,
        preferredLibraries: {
          ...config.preferredLibraries,
          ...rules.preferredLibraries,
        },

        // Code style preferences
        codeStyle: {
          ...config.codeStyle,
          ...rules.codeStyle,
        },

        // Dependencies management
        ignoreDependencies:
          rules.ignoreDependencies || config.ignoreDependencies,

        // Config revalidation
        configLastRevalidate:
          rules.configLastRevalidate || config.configLastRevalidate,
        configRevalidateFrequency:
          rules.configRevalidateFrequency || config.configRevalidateFrequency,

        // Custom rules
        customRules: {
          ...config.customRules,
          ...rules.customRules,
        },
      };

      // If reliverse.json exists but reliverse.json doesn't, suggest migration
      if (!(await fs.pathExists(configPath))) {
        relinka(
          "info",
          "Found reliverse.json but no reliverse.json. Consider migrating to reliverse.json for better compatibility.",
        );
      }
    }
  } catch (error) {
    console.warn("Error reading configuration files:", error);
  }

  return config;
}
