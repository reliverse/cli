import { relinka } from "@reliverse/prompts";
import { parseJSONC } from "confbox";
import fs from "fs-extra";
import path from "pathe";

import type {
  BaseConfig,
  BiomeConfig,
  BiomeConfigResult,
  ConfigFile,
} from "~/types.js";

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
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
  };
}

let cachedBiomeConfig: BiomeConfigResult = null;

export async function getBiomeConfig(
  projectPath: string,
): Promise<BiomeConfigResult> {
  if (cachedBiomeConfig !== null) {
    return cachedBiomeConfig;
  }

  try {
    const biomePath = path.join(projectPath, "biome.jsonc");
    if (await fs.pathExists(biomePath)) {
      const content = await fs.readFile(biomePath, "utf-8");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const config = parseJSONC(content) as BiomeConfig;
      cachedBiomeConfig = {
        lineWidth: config.formatter?.lineWidth ?? 80,
        indentStyle: config.formatter?.indentStyle ?? "space",
        indentWidth: config.formatter?.indentWidth ?? 2,
        quoteMark: config.javascript?.formatter?.quoteStyle ?? "double",
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
