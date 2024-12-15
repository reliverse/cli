import { parseJSON5, parseJSONC } from "confbox";
import { safeDestr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON, readTSConfig } from "pkg-types";

import type { ReliverseRules } from "~/types/rules.js";

import { relinka } from "./console.js";

// Define the return type explicitly first
type BiomeConfigResult = {
  lineWidth?: number;
  indentStyle?: "space" | "tab";
  indentWidth?: 2 | 4 | 8;
  quoteMark?: "single" | "double";
  semicolons?: boolean;
  trailingComma?: boolean;
} | null;

// Define BiomeConfig type
type BiomeConfig = {
  formatter?: {
    lineWidth?: number;
    indentStyle?: "space" | "tab";
    indentWidth?: 2 | 4 | 8;
  };
  javascript?: {
    formatter?: {
      quoteStyle?: "single" | "double";
      semicolons?: "always" | "never";
      trailingComma?: "all" | "none";
    };
  };
};

// Define PackageJson type
type PackageAuthor = string | { name: string; email?: string; url?: string };
type PackageJson = {
  name?: string;
  author?: PackageAuthor;
  description?: string;
  version?: string;
  license?: string;
  repository?: string | { url: string };
};

let cachedBiomeConfig: BiomeConfigResult = null;

async function getBiomeConfig(targetDir: string): Promise<BiomeConfigResult> {
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

export async function writeReliverseRules(
  targetDir: string,
  rules: ReliverseRules,
): Promise<void> {
  try {
    const rulesPath = path.join(targetDir, ".reliverserules");
    // Convert to JSONC format with comments
    const jsonContent = {
      // Project metadata
      appName: rules.appName,
      appAuthor: rules.appAuthor,
      appDescription: rules.appDescription,
      appVersion: rules.appVersion,
      appLicense: rules.appLicense,
      appRepository: rules.appRepository,
      framework: rules.framework,
      packageManager: rules.packageManager,

      // Library preferences
      preferredLibraries: rules.preferredLibraries,

      // Code style settings
      codeStyle: rules.codeStyle,

      // Feature flags
      features: rules.features,
    };

    // Format with 2 spaces indentation
    const content = JSON.stringify(jsonContent, null, 2)
      // Add section comments
      .replace('"appName":', '// Project metadata\n  "appName":')
      .replace(
        '"preferredLibraries":',
        '\n  // Library preferences\n  "preferredLibraries":',
      )
      .replace('"codeStyle":', '\n  // Code style settings\n  "codeStyle":')
      .replace('"features":', '\n  // Feature flags\n  "features":');

    await fs.writeFile(rulesPath, content);
    relinka("info-verbose", "Project rules saved to .reliverserules");
  } catch (error) {
    relinka(
      "error",
      "Error saving project rules:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function readReliverseRules(
  targetDir: string,
): Promise<ReliverseRules | null> {
  try {
    const rulesPath = path.join(targetDir, ".reliverserules");
    if (await fs.pathExists(rulesPath)) {
      const content = await fs.readFile(rulesPath, "utf-8");
      // Handle empty file or just {}
      if (!content.trim() || content.trim() === "{}") {
        const defaultRules = await getDefaultRules(
          path.basename(targetDir),
          "user",
        );
        await writeReliverseRules(targetDir, defaultRules);
        return defaultRules;
      }

      try {
        // Try JSONC first
        const rules = parseJSONC(content);
        // Check if rules object is empty
        if (!rules || Object.keys(rules).length === 0) {
          const defaultRules = await getDefaultRules(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseRules(targetDir, defaultRules);
          return defaultRules;
        }
        // Validate rules before returning
        if (
          !rules ||
          typeof rules !== "object" ||
          !("appName" in rules) ||
          !("appAuthor" in rules) ||
          !("framework" in rules) ||
          !("packageManager" in rules)
        ) {
          const defaultRules = await getDefaultRules(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseRules(targetDir, defaultRules);
          return defaultRules;
        }
        return rules as ReliverseRules;
      } catch {
        // If JSONC parsing fails, try JSON5 for more lenient parsing
        try {
          const rules = await parseJSON5(content);
          if (
            !rules ||
            typeof rules !== "object" ||
            !("appName" in rules) ||
            !("appAuthor" in rules) ||
            !("framework" in rules) ||
            !("packageManager" in rules)
          ) {
            const defaultRules = await getDefaultRules(
              path.basename(targetDir),
              "user",
            );
            await writeReliverseRules(targetDir, defaultRules);
            return defaultRules;
          }
          return rules as ReliverseRules;
        } catch {
          // If both fail, try safe destr as last resort
          const parsed = safeDestr(content);
          if (!parsed || Object.keys(parsed).length === 0) {
            const defaultRules = await getDefaultRules(
              path.basename(targetDir),
              "user",
            );
            await writeReliverseRules(targetDir, defaultRules);
            return defaultRules;
          }
          // Validate parsed rules before returning
          if (
            !parsed ||
            typeof parsed !== "object" ||
            !("appName" in parsed) ||
            !("appAuthor" in parsed) ||
            !("framework" in parsed) ||
            !("packageManager" in parsed)
          ) {
            const defaultRules = await getDefaultRules(
              path.basename(targetDir),
              "user",
            );
            await writeReliverseRules(targetDir, defaultRules);
            return defaultRules;
          }
          return parsed as ReliverseRules;
        }
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error reading project rules:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

export async function getDefaultRules(
  appName: string,
  appAuthor: string,
  framework: ReliverseRules["framework"] = "nextjs",
): Promise<ReliverseRules> {
  const biomeConfig = await getBiomeConfig(process.cwd());

  // Read package.json and tsconfig.json
  let packageData: PackageJson = { name: appName, author: appAuthor };
  let tsConfig = {};

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
    appName: packageData.name || appName,
    appAuthor:
      typeof packageData.author === "object"
        ? packageData.author.name
        : packageData.author || appAuthor,
    appDescription: packageData.description,
    appVersion: packageData.version,
    appLicense: packageData.license,
    appRepository:
      typeof packageData.repository === "string"
        ? packageData.repository
        : packageData.repository?.url,
    framework,
    packageManager: "bun",
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
      importSymbol: [
        {
          from: "~/utils/console",
          to: "@/utils/console",
          description: "Update import path to use @/ instead of ~/",
        },
      ],
    },
    features: {
      i18n: true,
      pwa: false,
      seo: true,
      analytics: false,
      darkMode: true,
      authentication: true,
      authorization: true,
      api: true,
      database: true,
      testing: false,
      storybook: false,
      docker: false,
      ci: false,
    },
  };
}
