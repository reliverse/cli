import type { PackageJson } from "pkg-types";

import { readPackageJSON } from "pkg-types";

import type { ReliverseConfig } from "~/types.js";

import { getBiomeConfig } from "./miscellaneousConfigHelpers.js";
import { safeGetReliverseConfig, safeWriteConfig } from "./reliverseFileOps.js";

export async function writeReliverseConfig(
  projectPath: string,
  rules: ReliverseConfig,
): Promise<void> {
  await safeWriteConfig(projectPath, rules);
}

export async function readReliverseConfig(
  projectPath: string,
): Promise<ReliverseConfig | null> {
  return safeGetReliverseConfig(projectPath);
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
