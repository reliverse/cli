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

      // Rules revalidation
      rulesLastRevalidate:
        rules.rulesLastRevalidate || new Date().toISOString(),
      rulesRevalidateFrequency: rules.rulesRevalidateFrequency || "1d",

      // Technical stack
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
      // Inject section comments
      .replace('"appName":', '// Project metadata\n  "appName":')
      .replace(
        '"rulesLastRevalidate":',
        '\n  // Rules revalidation\n  "rulesLastRevalidate":',
      )
      .replace('"framework":', '\n  // Technical stack\n  "framework":')
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
    rulesLastRevalidate: new Date().toISOString(),
    rulesRevalidateFrequency: "1d", // Default to daily revalidation
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
    const rulesPath = path.join(cwd, ".reliverserules");

    // Check if .reliverserules exists
    if (!(await fs.pathExists(rulesPath))) {
      return;
    }

    // Read current rules
    const content = await fs.readFile(rulesPath, "utf-8");
    let parsedContent;

    try {
      parsedContent = parseJSONC(content);
    } catch {
      try {
        parsedContent = parseJSON5(content);
      } catch {
        parsedContent = safeDestr(content);
      }
    }

    if (!parsedContent || typeof parsedContent !== "object") {
      return;
    }

    // Check if we need to revalidate based on frequency
    if (
      !shouldRevalidate(
        parsedContent.rulesLastRevalidate,
        parsedContent.rulesRevalidateFrequency,
      )
    ) {
      return;
    }

    // Get default rules based on project type
    const projectType = await detectProjectType(cwd);
    const defaultRules = projectType
      ? await generateDefaultRulesForProject(cwd)
      : await getDefaultRules(
          path.basename(cwd),
          "user",
          "nextjs", // fallback default
        );

    if (defaultRules) {
      // Parse code style from existing config files
      const configRules = await parseCodeStyleFromConfigs(cwd);

      // Always merge with defaults to ensure all fields exist
      const mergedRules = {
        appName: defaultRules.appName,
        appAuthor: defaultRules.appAuthor,
        framework: defaultRules.framework,
        packageManager: defaultRules.packageManager,
        ...parsedContent,
        rulesLastRevalidate: new Date().toISOString(), // Update last revalidation time
        features: {
          ...defaultRules.features,
          ...(parsedContent.features || {}),
        },
        preferredLibraries: {
          ...defaultRules.preferredLibraries,
          ...(parsedContent.preferredLibraries || {}),
        },
        codeStyle: {
          ...defaultRules.codeStyle,
          ...(configRules?.codeStyle || {}),
          ...(parsedContent.codeStyle || {}),
        },
      };

      // Only write if there were missing fields or different values
      if (JSON.stringify(mergedRules) !== JSON.stringify(parsedContent)) {
        const hasNewFields = !Object.keys(parsedContent).every(
          (key) =>
            JSON.stringify(mergedRules[key]) ===
            JSON.stringify(parsedContent[key]),
        );

        if (hasNewFields) {
          await writeReliverseRules(cwd, mergedRules);
          relinka(
            "info",
            "Updated .reliverserules with missing configurations. Please review and adjust as needed.",
          );
        }
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error validating .reliverserules:",
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

  const rules = await getDefaultRules(
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
