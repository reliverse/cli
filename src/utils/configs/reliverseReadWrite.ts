import type { TSConfig } from "pkg-types";
import type { PackageJson } from "pkg-types";

import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import { readTSConfig } from "pkg-types";
import { readPackageJSON } from "pkg-types";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../console.js";
import { getBiomeConfig } from "./miscellaneousConfigHelpers.js";
import { DEFAULT_CONFIG } from "./reliverseDefaultConfig.js";

// Helper function to check if revalidation is needed
export function shouldRevalidate(
  lastRevalidate: string | undefined,
  frequency: string | undefined,
): boolean {
  if (!lastRevalidate || !frequency) {
    return true;
  }

  const now = new Date();
  const lastCheck = new Date(lastRevalidate);
  const diff = now.getTime() - lastCheck.getTime();

  switch (frequency) {
    case "1h":
      return diff > 60 * 60 * 1000;
    case "1d":
      return diff > 24 * 60 * 60 * 1000;
    case "2d":
      return diff > 2 * 24 * 60 * 60 * 1000;
    case "7d":
      return diff > 7 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

export async function writeReliverseConfig(
  targetDir: string,
  rules: ReliverseConfig,
): Promise<void> {
  try {
    const configPath = path.join(targetDir, "reliverse.json");
    // Convert rules to config format
    const config: ReliverseConfig = {
      ...DEFAULT_CONFIG,
      // Project details
      projectName: rules.projectName,
      projectAuthor: rules.projectAuthor,
      projectDescription: rules.projectDescription,
      projectVersion: rules.projectVersion,
      projectLicense: rules.projectLicense,
      projectRepository: rules.projectRepository,

      // Project features
      features: rules.features,

      // Development preferences
      projectFramework: rules.projectFramework,
      projectPackageManager: rules.projectPackageManager,
      projectFrameworkVersion: rules.projectFrameworkVersion,
      nodeVersion: rules.nodeVersion,
      runtime: rules.runtime,
      monorepo: rules.monorepo,
      preferredLibraries: rules.preferredLibraries,
      codeStyle: rules.codeStyle,

      // Dependencies management
      ignoreDependencies: rules.ignoreDependencies,

      // Config revalidation
      configLastRevalidate:
        rules.configLastRevalidate || new Date().toISOString(),
      configRevalidateFrequency: rules.configRevalidateFrequency || "2d",

      // Custom rules
      customRules: rules.customRules,
    };

    // Format with 2 spaces indentation and add section comments
    const content = JSON.stringify(config, null, 2)
      // Inject comments above each section
      .replace('"projectAuthor":', '// Project details\n  "projectAuthor":')
      .replace('"features":', '\n  // Project features\n  "features":')
      .replace(
        '"projectFramework":',
        '\n  // Development preferences\n  "projectFramework":',
      )
      .replace('"codeStyle":', '\n  // Code style preferences\n  "codeStyle":')
      .replace('"projectName":', '\n  // Project metadata\n  "projectName":')
      .replace(
        '"deployBehavior":',
        '\n  // Prompts behavior (prompt | autoYes | autoNo)\n  "deployBehavior":',
      )
      .replace(
        '"configLastRevalidate":',
        '\n  // Config revalidation (1h | 1d | 2d | 7d)\n  "configLastRevalidate":',
      );

    await fs.writeFile(configPath, content);
    relinka("info-verbose", "Project configuration saved to reliverse.json");
  } catch (error) {
    relinka(
      "error",
      "Error saving project configuration:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function readReliverseConfig(
  targetDir: string,
): Promise<ReliverseConfig | null> {
  try {
    const configPath = path.join(targetDir, "reliverse.json");
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, "utf-8");
      // Handle empty file or just {}
      if (!content.trim() || content.trim() === "{}") {
        const defaultRules = await getDefaultReliverseConfig(
          path.basename(targetDir),
          "user",
        );
        await writeReliverseConfig(targetDir, defaultRules);
        return defaultRules;
      }

      try {
        const config = destr(content);
        // Check if config object is empty
        if (!config || Object.keys(config).length === 0) {
          const defaultRules = await getDefaultReliverseConfig(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseConfig(targetDir, defaultRules);
          return defaultRules;
        }
        // Validate config before returning
        if (
          !config ||
          typeof config !== "object" ||
          !("projectName" in config) ||
          !("projectAuthor" in config) ||
          !("projectFramework" in config) ||
          !("packageManager" in config)
        ) {
          const defaultRules = await getDefaultReliverseConfig(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseConfig(targetDir, defaultRules);
          return defaultRules;
        }
        return config as ReliverseConfig;
      } catch (error) {
        relinka("error", "Failed to parse reliverse.json", error.toString());
        return null;
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error reading project configuration:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

export async function getDefaultReliverseConfig(
  projectName: string,
  projectAuthor: string,
  projectFramework: ReliverseConfig["projectFramework"] = "nextjs",
): Promise<ReliverseConfig> {
  const biomeConfig = await getBiomeConfig(process.cwd());

  // Read package.json and tsconfig.json
  let packageData: PackageJson = { name: projectName, author: projectAuthor };
  let tsConfig: TSConfig = {};

  try {
    packageData = await readPackageJSON();
  } catch {
    // Use default values if package.json doesn't exist
  }

  try {
    tsConfig = await readTSConfig();
  } catch {
    // Ignore error if tsconfig.json doesn't exist
  }

  return {
    // Project details
    projectName: packageData.name || projectName,
    projectAuthor:
      typeof packageData.author === "object"
        ? packageData.author.name
        : packageData.author || projectAuthor,
    projectDescription: packageData.description,
    projectVersion: packageData.version,
    projectLicense: packageData.license,
    projectRepository:
      typeof packageData.repository === "string"
        ? packageData.repository
        : packageData.repository?.url,

    // Project features
    features: {
      i18n: true,
      analytics: false,
      themeMode: "dark-light",
      authentication: true,
      api: true,
      database: true,
      testing: false,
      docker: false,
      ci: false,
      commands: [],
      webview: [],
      language: [],
      themes: [],
    },

    // Development preferences
    projectFramework,
    projectPackageManager: "bun",
    preferredLibraries: {
      stateManagement: "zustand",
      formManagement: "react-hook-form",
      styling: "tailwind",
      uiComponents: "shadcn-ui",
      testing: "bun",
      authentication: "clerk",
      database: "drizzle",
      api: "trpc",
    },

    // Code style preferences
    codeStyle: {
      dontRemoveComments: true,
      shouldAddComments: true,
      typeOrInterface: (tsConfig as any).compilerOptions?.strict
        ? "type"
        : "interface",
      importOrRequire: "import",
      quoteMark: biomeConfig?.quoteMark || "double",
      semicolons: biomeConfig?.semicolons ?? true,
      lineWidth: biomeConfig?.lineWidth || 80,
      indentStyle: biomeConfig?.indentStyle || "space",
      indentSize: biomeConfig?.indentWidth || 2,
      importSymbol: "~",
    },

    // Config revalidation
    configLastRevalidate: new Date().toISOString(),
    configRevalidateFrequency: "2d",
  };
}
