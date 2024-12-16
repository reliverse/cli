import { parseJSONC } from "confbox";
import destr, { safeDestr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON, readTSConfig } from "pkg-types";

import type { ReliverseConfig } from "~/types/config.js";
import type { ReliverseRules } from "~/types/rules.js";

import { DEFAULT_CONFIG } from "~/types/config.js";

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

type TSConfig = {
  compilerOptions?: {
    strict?: boolean;
    noImplicitAny?: boolean;
    strictNullChecks?: boolean;
    module?: string;
  };
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

      // Config revalidation
      configLastRevalidate:
        rules.configLastRevalidate || new Date().toISOString(),
      configRevalidateFrequency: rules.configRevalidateFrequency || "2d",

      // Technical stack
      framework: rules.framework,
      packageManager: rules.packageManager,
      frameworkVersion: rules.frameworkVersion,
      nodeVersion: rules.nodeVersion,
      runtime: rules.runtime,
      monorepo: rules.monorepo,

      // Development Preferences
      preferredLibraries: rules.preferredLibraries,
      codeStyle: rules.codeStyle,

      // Project Features
      features: rules.features,

      // Dependencies Management
      ignoreDependencies: rules.ignoreDependencies,

      // Custom Extensions
      customRules: rules.customRules,
    };

    // Format with 2 spaces indentation and add section comments
    const content = JSON.stringify(config, null, 2)
      // Inject section comments
      .replace('"projectName":', '// Project metadata\n  "projectName":')
      .replace(
        '"configLastRevalidate":',
        '\n  // Config revalidation (1h | 1d | 2d | 7d)\n  "configLastRevalidate":',
      )
      .replace('"framework":', '\n  // Technical stack\n  "framework":')
      .replace(
        '"preferredLibraries":',
        '\n  // Development Preferences\n  "preferredLibraries":',
      )
      .replace('"features":', '\n  // Project Features\n  "features":');

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

export async function readReliverseRules(
  targetDir: string,
): Promise<ReliverseRules | null> {
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
        await writeReliverseRules(targetDir, defaultRules);
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
          await writeReliverseRules(targetDir, defaultRules);
          return defaultRules;
        }
        // Validate config before returning
        if (
          !config ||
          typeof config !== "object" ||
          !("projectName" in config) ||
          !("projectAuthor" in config) ||
          !("framework" in config) ||
          !("packageManager" in config)
        ) {
          const defaultRules = await getDefaultReliverseConfig(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseRules(targetDir, defaultRules);
          return defaultRules;
        }
        return config as ReliverseRules;
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
  framework: ReliverseRules["framework"] = "nextjs",
): Promise<ReliverseRules> {
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
    tsConfig = (await readTSConfig()) as TSConfig;
  } catch {
    // Ignore error if tsconfig.json doesn't exist
  }

  return {
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
    configLastRevalidate: new Date().toISOString(),
    configRevalidateFrequency: "2d",
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

// Helper function to check if revalidation is needed
function shouldRevalidate(
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

export async function validateAndInsertMissingKeys(cwd: string): Promise<void> {
  try {
    const configPath = path.join(cwd, "reliverse.json");

    // Check if reliverse.json exists
    if (!(await fs.pathExists(configPath))) {
      return;
    }

    // Read current config
    const content = await fs.readFile(configPath, "utf-8");
    let parsedContent;

    try {
      parsedContent = destr(content);
    } catch {
      relinka("error", "Failed to parse reliverse.json");
      return;
    }

    if (!parsedContent || typeof parsedContent !== "object") {
      return;
    }

    // Check if we need to revalidate based on frequency
    if (
      !shouldRevalidate(
        parsedContent.configLastRevalidate,
        parsedContent.configRevalidateFrequency,
      )
    ) {
      return;
    }

    // Get default rules based on project type
    const projectType = await detectProjectType(cwd);
    const defaultRules = projectType
      ? await generateDefaultRulesForProject(cwd)
      : await getDefaultReliverseConfig(
          path.basename(cwd),
          "user",
          "nextjs", // fallback default
        );

    if (defaultRules) {
      // Parse code style from existing config files
      const configRules = await parseCodeStyleFromConfigs(cwd);

      // Always merge with defaults to ensure all fields exist
      const mergedConfig: ReliverseConfig = {
        ...DEFAULT_CONFIG,
        ...parsedContent,
        // Project details
        projectName: defaultRules.projectName,
        projectAuthor: defaultRules.projectAuthor,
        projectDescription:
          defaultRules.projectDescription || parsedContent.projectDescription,
        projectVersion:
          defaultRules.projectVersion || parsedContent.projectVersion,
        projectLicense:
          defaultRules.projectLicense || parsedContent.projectLicense,
        projectRepository:
          defaultRules.projectRepository || parsedContent.projectRepository,

        // Config revalidation
        configLastRevalidate: new Date().toISOString(), // Update last revalidation time
        configRevalidateFrequency:
          parsedContent.configRevalidateFrequency || "2d",

        // Technical stack
        framework: defaultRules.framework,
        packageManager: defaultRules.packageManager,
        frameworkVersion:
          defaultRules.frameworkVersion || parsedContent.frameworkVersion,
        nodeVersion: defaultRules.nodeVersion || parsedContent.nodeVersion,
        runtime: defaultRules.runtime || parsedContent.runtime,
        monorepo: defaultRules.monorepo || parsedContent.monorepo,

        // Development Preferences
        preferredLibraries: {
          ...defaultRules.preferredLibraries,
          ...(parsedContent.preferredLibraries || {}),
        },
        codeStyle: {
          ...defaultRules.codeStyle,
          ...(configRules?.codeStyle || {}),
          ...(parsedContent.codeStyle || {}),
        },

        // Project Features
        features: {
          ...defaultRules.features,
          ...(parsedContent.features || {}),
        },

        // Dependencies Management
        ignoreDependencies:
          parsedContent.ignoreDependencies || defaultRules.ignoreDependencies,

        // Custom Extensions
        customRules: {
          ...(defaultRules.customRules || {}),
          ...(parsedContent.customRules || {}),
        },
      };

      // Only write if there were missing fields or different values
      if (JSON.stringify(mergedConfig) !== JSON.stringify(parsedContent)) {
        const hasNewFields = !Object.keys(parsedContent).every(
          (key) =>
            JSON.stringify(mergedConfig[key]) ===
            JSON.stringify(parsedContent[key]),
        );

        if (hasNewFields) {
          await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
          relinka(
            "info",
            "Updated reliverse.json with missing configurations. Please review and adjust as needed.",
          );
        }
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error validating reliverse.json:",
      error instanceof Error ? error.message : String(error),
    );
  }
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

export async function generateDefaultRulesForProject(
  cwd: string,
): Promise<ReliverseRules | null> {
  const projectType = await detectProjectType(cwd);
  if (!projectType) {
    return null;
  }

  const packageJsonPath = path.join(cwd, "package.json");
  let packageJson: any = {};
  try {
    if (await fs.pathExists(packageJsonPath)) {
      packageJson = safeDestr(await fs.readFile(packageJsonPath, "utf-8"));
    }
  } catch (error) {
    relinka("error", "Error reading package.json:", error.toString());
  }

  const rules = await getDefaultReliverseConfig(
    packageJson.name || path.basename(cwd),
    packageJson.author || "user",
    projectType,
  );

  // Detect additional features
  const hasI18n = await fs.pathExists(path.join(cwd, "src/app/[locale]"));
  const hasPrisma = await fs.pathExists(path.join(cwd, "prisma/schema.prisma"));
  const hasDrizzle = await fs.pathExists(path.join(cwd, "drizzle.config.ts"));
  const hasNextAuth = await fs.pathExists(
    path.join(cwd, "src/app/api/auth/[...nextauth]"),
  );
  const hasClerk = packageJson.dependencies?.["@clerk/nextjs"];

  rules.features = {
    ...rules.features,
    i18n: hasI18n,
    database: hasPrisma || hasDrizzle,
    authentication: hasNextAuth || !!hasClerk,
  };

  if (hasPrisma) {
    rules.preferredLibraries.database = "prisma";
  } else if (hasDrizzle) {
    rules.preferredLibraries.database = "drizzle";
  }

  if (hasNextAuth) {
    rules.preferredLibraries.authentication = "next-auth";
  } else if (hasClerk) {
    rules.preferredLibraries.authentication = "clerk";
  }

  return rules;
}

export async function parseCodeStyleFromConfigs(
  cwd: string,
): Promise<Partial<ReliverseRules>> {
  const codeStyle: any = {};

  // Try to read TypeScript config
  try {
    const tsConfigPath = path.join(cwd, "tsconfig.json");
    if (await fs.pathExists(tsConfigPath)) {
      const tsConfig = safeDestr<TSConfig>(
        await fs.readFile(tsConfigPath, "utf-8"),
      );

      if (tsConfig?.compilerOptions) {
        const { compilerOptions } = tsConfig;

        // Detect strict mode settings
        codeStyle.strictMode = {
          enabled: compilerOptions.strict ?? false,
          noImplicitAny: compilerOptions.noImplicitAny ?? false,
          strictNullChecks: compilerOptions.strictNullChecks ?? false,
        };

        // Detect module settings
        if (compilerOptions.module?.toLowerCase().includes("node")) {
          codeStyle.importOrRequire = "esm";
        }
      }
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error parsing TypeScript config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return { codeStyle };
}
