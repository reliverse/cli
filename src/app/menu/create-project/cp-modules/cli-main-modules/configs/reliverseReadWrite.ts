import type { PackageJson } from "pkg-types";

import { readPackageJSON } from "pkg-types";

import type { ReliverseConfig } from "~/types.js";

import { getBiomeConfig } from "./miscellaneousConfigHelpers.js";
import { safeReadConfig, safeWriteConfig } from "./reliverseFileOps.js";

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
    case "14d":
      return diff > 14 * 24 * 60 * 60 * 1000;
    case "30d":
      return diff > 30 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

export async function writeReliverseConfig(
  targetDir: string,
  rules: ReliverseConfig,
): Promise<void> {
  await safeWriteConfig(targetDir, rules);
}

export async function readReliverseConfig(
  targetDir: string,
): Promise<ReliverseConfig | null> {
  return safeReadConfig(targetDir);
}

export async function getDefaultReliverseConfig(
  projectName: string,
  projectAuthor: string,
  projectFramework = "nextjs",
): Promise<ReliverseConfig> {
  const biomeConfig = await getBiomeConfig(process.cwd());

  // Read package.json
  let packageData: PackageJson = { name: projectName, author: projectAuthor };

  try {
    packageData = await readPackageJSON();
  } catch {
    // Use default values if package.json doesn't exist
  }

  return {
    experimental: {
      // Project details
      projectName: packageData.name ?? projectName,
      projectAuthor:
        typeof packageData.author === "object"
          ? (packageData.author.name ?? projectAuthor)
          : (packageData.author ?? projectAuthor),
      projectDescription: packageData.description ?? "",
      projectVersion: packageData.version ?? "0.1.0",
      projectLicense: packageData.license ?? "MIT",
      projectRepository:
        (typeof packageData.repository === "string"
          ? packageData.repository
          : packageData.repository?.url) ?? "",

      // Project features
      features: {
        i18n: false,
        analytics: false,
        themeMode: "dark-light",
        authentication: false,
        api: false,
        database: false,
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
      projectPackageManager: "npm",
      projectFrameworkVersion: undefined,
      nodeVersion: undefined,
      runtime: undefined,
      monorepo: {
        type: "none",
        packages: [],
        sharedPackages: [],
      },
      preferredLibraries: {},
      codeStyle: {
        lineWidth: biomeConfig?.lineWidth ?? 80,
        indentSize: biomeConfig?.indentWidth ?? 2,
        indentStyle: "space",
        quoteMark: "double",
        semicolons: true,
        trailingComma: "all",
        bracketSpacing: true,
        arrowParens: "always",
        tabWidth: 2,
        jsToTs: false,
      },

      // Dependencies management
      ignoreDependencies: [],

      // Config revalidation
      configLastRevalidate: new Date().toISOString(),
      configRevalidateFrequency: "7d",

      // Custom rules
      customRules: {},

      // Generation preferences
      skipPromptsUseAutoBehavior: false,
      deployBehavior: "prompt",
      depsBehavior: "prompt",
      gitBehavior: "prompt",
      i18nBehavior: "prompt",
      scriptsBehavior: "prompt",
    },
  };
}
