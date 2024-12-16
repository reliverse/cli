import { parseJSONC } from "confbox";
import destr from "destr";
import fs from "fs-extra";
import path from "pathe";

import type {
  BaseConfig,
  BiomeConfig,
  BiomeConfigResult,
  ConfigFile,
  ReliverseConfig,
} from "~/types.js";

import { relinka } from "../console.js";
import { DEFAULT_CONFIG } from "./reliverseDefaultConfig.js";

export const CONFIG_FILES: ConfigFile[] = [
  {
    name: "TypeScript",
    files: ["tsconfig.json"],
    editPrompt: "Edit TypeScript configuration",
  },
  {
    name: "Biome",
    files: ["biome.json", "biome.jsonc"],
    editPrompt: "Edit Biome configuration",
  },
  {
    name: "Knip",
    files: ["knip.json", "knip.jsonc"],
    editPrompt: "Edit Knip configuration",
  },
  {
    name: "ESLint",
    files: ["eslint.config.js"],
    editPrompt: "Edit ESLint configuration",
  },
  {
    name: "Vitest",
    files: ["vitest.config.ts"],
    editPrompt: "Edit Vitest configuration",
  },
  {
    name: "Prettier",
    files: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.json5",
      ".prettierrc.js",
      "prettier.config.js",
    ],
    editPrompt: "Edit Prettier configuration",
  },
];

export async function detectConfigFiles(cwd: string): Promise<ConfigFile[]> {
  const detectedConfigs: ConfigFile[] = [];

  for (const config of CONFIG_FILES) {
    for (const file of config.files) {
      if (await fs.pathExists(path.join(cwd, file))) {
        detectedConfigs.push(config);
        break;
      }
    }
  }

  return detectedConfigs;
}

// Helper function to add metadata to configs
export function addConfigMetadata<T extends object>(config: T): T & BaseConfig {
  return {
    ...config,
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
  };
}

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

let cachedBiomeConfig: BiomeConfigResult = null;

export async function getBiomeConfig(
  targetDir: string,
): Promise<BiomeConfigResult> {
  if (cachedBiomeConfig !== null) {
    return cachedBiomeConfig;
  }

  try {
    const biomePath = path.join(targetDir, "biome.jsonc");
    if (await fs.pathExists(biomePath)) {
      const content = await fs.readFile(biomePath, "utf-8");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const config = parseJSONC(content) as BiomeConfig;
      cachedBiomeConfig = {
        lineWidth: config.formatter?.lineWidth || 80,
        indentStyle: config.formatter?.indentStyle || "space",
        indentWidth: config.formatter?.indentWidth || 2,
        quoteMark: config.javascript?.formatter?.quoteStyle || "double",
        semicolons: config.javascript?.formatter?.semicolons === "always",
        trailingComma: config.javascript?.formatter?.trailingComma === "all",
      };
      return cachedBiomeConfig;
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error reading biome config:",
      error instanceof Error ? error.message : String(error),
    );
  }
  cachedBiomeConfig = null;
  return null;
}

export const PROJECT_TYPE_FILES = {
  nextjs: ["next.config.js", "next.config.ts", "next.config.mjs"],
  astro: ["astro.config.js", "astro.config.ts", "astro.config.mjs"],
  react: ["vite.config.js", "vite.config.ts", "react.config.js"],
  vue: ["vue.config.js", "vite.config.ts"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
} as const;

export async function detectProjectType(
  cwd: string,
): Promise<keyof typeof PROJECT_TYPE_FILES | null> {
  for (const [type, files] of Object.entries(PROJECT_TYPE_FILES)) {
    for (const file of files) {
      if (await fs.pathExists(path.join(cwd, file))) {
        return type as keyof typeof PROJECT_TYPE_FILES;
      }
    }
  }
  return null;
}
