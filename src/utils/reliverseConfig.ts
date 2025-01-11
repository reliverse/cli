import { parseJSONC } from "confbox";
import destr, { safeDestr } from "destr";
import { detect } from "detect-package-manager";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON, type PackageJson, type TSConfig } from "pkg-types";
import { z } from "zod";

import type { DeploymentService, ProjectTypeOptions } from "~/types.js";

import { getBiomeConfig } from "~/utils/configHandler.js";

import { relinka } from "./loggerRelinka.js";

/* ------------------------------------------------------------------
 * Types and Interfaces
 * ------------------------------------------------------------------ */
export type GenerateReliverseConfigOptions = {
  projectName: string;
  frontendUsername: string;
  deployService: DeploymentService;
  primaryDomain: string;
  projectPath: string;
  i18nShouldBeEnabled: boolean;
  overwrite?: boolean;
  githubUsername: string;
};

export type ProjectFeatures = {
  i18n: boolean;
  analytics: boolean;
  themeMode: "light" | "dark" | "dark-light";
  authentication: boolean;
  api: boolean;
  database: boolean;
  testing: boolean;
  docker: boolean;
  ci: boolean;
  commands: string[];
  webview: string[];
  language: string[];
  themes: string[];
};

export type ReliverseConfig = z.infer<typeof reliverseConfigSchema>;

export const PROJECT_TYPE_FILES = {
  "": [],
  library: ["jsr.json", "jsr.jsonc"],
  nextjs: ["next.config.js", "next.config.ts", "next.config.mjs"],
  astro: ["astro.config.js", "astro.config.ts", "astro.config.mjs"],
  react: ["vite.config.js", "vite.config.ts", "react.config.js"],
  vue: ["vue.config.js", "vite.config.ts"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
} satisfies Record<ProjectTypeOptions, string[]>;

/**
 * Detects the project type based on certain config files
 * @param cwd Current working directory
 * @returns A `ProjectTypeOptions` key or `null` if not found
 */
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

/**
 * Creates a base config with defaults for a given project
 * @param cwd Current working directory
 * @param projectName Name of the project
 * @param projectAuthor Author of the project
 * @param projectFramework Framework (e.g. nextjs)
 * @returns A partial or complete `ReliverseConfig`
 */
export async function getDefaultReliverseConfig(
  cwd: string,
  projectName: string,
  projectAuthor: string,
  projectFramework = "nextjs",
): Promise<ReliverseConfig> {
  const biomeConfig = await getBiomeConfig(cwd);
  const detectedPkgManager = await detect();

  // Read package.json or fallback to default
  let packageData: PackageJson = { name: projectName, author: projectAuthor };
  try {
    packageData = await readPackageJSON();
  } catch {
    // Use defaults if no package.json
  }

  return {
    projectName: packageData.name ?? projectName,
    projectAuthor:
      typeof packageData.author === "object"
        ? (packageData.author?.name ?? projectAuthor)
        : (packageData.author ?? projectAuthor),
    projectDescription: packageData.description ?? "",
    projectVersion: packageData.version ?? "0.1.0",
    projectLicense: packageData.license ?? "MIT",
    projectRepository:
      typeof packageData.repository === "string"
        ? packageData.repository
        : (packageData.repository?.url ?? undefined),
    projectFramework,
    projectPackageManager: detectedPkgManager,
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
      tabWidth: biomeConfig?.indentWidth ?? 2,
      jsToTs: false,
      dontRemoveComments: true,
      shouldAddComments: true,
      typeOrInterface: "type",
      importOrRequire: "import",
      cjsToEsm: false,
      modernize: {
        replaceFs: false,
        replacePath: false,
        replaceHttp: false,
        replaceProcess: false,
        replaceConsole: false,
        replaceEvents: false,
      },
      importSymbol: "",
    },
    monorepo: {
      type: "none",
      packages: [],
      sharedPackages: [],
    },
    ignoreDependencies: [],
    customRules: {},
    skipPromptsUseAutoBehavior: false,
    deployBehavior: "prompt",
    depsBehavior: "prompt",
    gitBehavior: "prompt",
    i18nBehavior: "prompt",
    scriptsBehavior: "prompt",
  };
}

export type DetectedProject = {
  name: string;
  path: string;
  config: ReliverseConfig;
  gitStatus?: {
    uncommittedChanges: number;
    unpushedCommits: number;
  };
  needsDepsInstall?: boolean;
  hasGit?: boolean;
};

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------ */
const BACKUP_EXTENSION = ".backup";
const TEMP_EXTENSION = ".tmp";

/**
 * Default config for newly created or fallback usage.
 */
export const DEFAULT_CONFIG: ReliverseConfig = {
  projectName: "",
  projectAuthor: "",
  projectDescription: "",
  projectVersion: "0.1.0",
  projectLicense: "MIT",
  projectRepository: "",
  projectState: "",
  projectDomain: "",
  projectType: "",
  projectCategory: "",
  projectSubcategory: "",
  projectFramework: "nextjs",
  projectPackageManager: "npm",
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
  monorepo: {
    type: "none",
    packages: [],
    sharedPackages: [],
  },
  ignoreDependencies: [],
  customRules: {},
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
  codeStyle: {
    dontRemoveComments: true,
    shouldAddComments: true,
    typeOrInterface: "type",
    importOrRequire: "import",
    quoteMark: "double",
    semicolons: true,
    lineWidth: 80,
    indentStyle: "space",
    indentSize: 2,
    importSymbol: "~",
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    tabWidth: 2,
    jsToTs: false,
    cjsToEsm: false,
    modernize: {
      replaceFs: false,
      replacePath: false,
      replaceHttp: false,
      replaceProcess: false,
      replaceConsole: false,
      replaceEvents: false,
    },
  },
  skipPromptsUseAutoBehavior: false,
  deployBehavior: "prompt",
  depsBehavior: "prompt",
  gitBehavior: "prompt",
  i18nBehavior: "prompt",
  scriptsBehavior: "prompt",
};

/* ------------------------------------------------------------------
 * Zod Schemas
 * ------------------------------------------------------------------ */
const featuresSchema = z
  .object({
    i18n: z.boolean(),
    analytics: z.boolean(),
    themeMode: z.enum(["light", "dark", "dark-light"]),
    authentication: z.boolean(),
    api: z.boolean(),
    database: z.boolean(),
    testing: z.boolean(),
    docker: z.boolean(),
    ci: z.boolean(),
    commands: z.array(z.string()),
    webview: z.array(z.string()),
    language: z.array(z.string()),
    themes: z.array(z.string()),
  })
  .required();

const codeStyleSchema = z
  .object({
    lineWidth: z.number(),
    indentSize: z.number(),
    indentStyle: z.enum(["space", "tab"]),
    quoteMark: z.enum(["single", "double"]),
    semicolons: z.boolean(),
    trailingComma: z.enum(["none", "es5", "all"]),
    bracketSpacing: z.boolean(),
    arrowParens: z.enum(["always", "avoid"]),
    tabWidth: z.number(),
    jsToTs: z.boolean(),
    dontRemoveComments: z.boolean(),
    shouldAddComments: z.boolean(),
    typeOrInterface: z.enum(["type", "interface", "mixed"]),
    importOrRequire: z.enum(["import", "require", "mixed"]),
    cjsToEsm: z.boolean(),
    modernize: z.object({
      replaceFs: z.boolean(),
      replacePath: z.boolean(),
      replaceHttp: z.boolean(),
      replaceProcess: z.boolean(),
      replaceConsole: z.boolean(),
      replaceEvents: z.boolean(),
    }),
    importSymbol: z.string(),
  })
  .required();

const monorepoSchema = z
  .object({
    type: z.enum(["none", "turborepo", "nx", "pnpm"]),
    packages: z.array(z.string()),
    sharedPackages: z.array(z.string()),
  })
  .required();

export const reliverseConfigSchema = z.object({
  projectName: z.string().min(1),
  projectAuthor: z.string().min(1),
  projectDescription: z.string(),
  projectVersion: z.string().regex(/^\d+\.\d+\.\d+/),
  projectLicense: z.string(),
  projectRepository: z.string().url().optional(),
  projectDeployService: z
    .enum(["vercel", "netlify", "railway", "deno", "none"])
    .optional(),
  projectDisplayName: z.string().optional(),
  projectDomain: z.string().url().optional(),
  projectType: z.string().optional(),
  projectFramework: z.string(),
  projectPackageManager: z.enum(["npm", "pnpm", "yarn", "bun"]),
  projectFrameworkVersion: z.string().optional(),
  projectState: z.string().optional(),
  projectCategory: z.string().optional(),
  projectSubcategory: z.string().optional(),
  projectTemplate: z
    .enum([
      "blefnk/relivator",
      "blefnk/next-react-ts-src-minimal",
      "blefnk/all-in-one-nextjs-template",
      "blefnk/create-t3-app",
      "blefnk/create-next-app",
      "blefnk/astro-starlight-template",
      "blefnk/versator",
      "reliverse/template-browser-extension",
      "microsoft/vscode-extension-samples",
      "microsoft/vscode-extension-template",
    ])
    .optional(),
  projectActivation: z.enum(["auto", "manual"]).optional(),
  nodeVersion: z.string().optional(),
  runtime: z.string().optional(),
  deployUrl: z.string().optional(),
  features: featuresSchema,
  preferredLibraries: z.record(z.string()),
  codeStyle: codeStyleSchema,
  monorepo: monorepoSchema,
  ignoreDependencies: z.array(z.string()),
  customRules: z.record(z.unknown()),
  skipPromptsUseAutoBehavior: z.boolean(),
  deployBehavior: z.enum(["prompt", "autoYes", "autoNo"]),
  depsBehavior: z.enum(["prompt", "autoYes", "autoNo"]),
  gitBehavior: z.enum(["prompt", "autoYes", "autoNo"]),
  i18nBehavior: z.enum(["prompt", "autoYes", "autoNo"]),
  scriptsBehavior: z.enum(["prompt", "autoYes", "autoNo"]),
  productionBranch: z.string().optional(),
});

/* ------------------------------------------------------------------
 * Config Read/Write Utilities
 * ------------------------------------------------------------------ */

/**
 * Helper type to hold comment sections for writing .reliverse
 */
type CommentSections = Partial<Record<keyof ReliverseConfig, string[]>>;

/**
 * Injects section comments into the JSON content
 * @param fileContent The stringified JSON content
 * @returns The JSON content with injected comments
 */
function injectSectionComments(fileContent: string): string {
  // Minimal comment function
  const comment = (text: string) => `// ${text}`;

  // Define short comment sections
  const commentSections: CommentSections = {
    skipPromptsUseAutoBehavior: [
      comment("Enable auto-answering for prompts?"),
      comment("Set to true to skip manual confirmations."),
    ],
    features: [comment("Project features")],
    projectFramework: [comment("Primary tech stack/framework")],
    codeStyle: [comment("Code style preferences")],
    ignoreDependencies: [comment("Dependencies to be excluded from checks")],
    customRules: [comment("Custom rules for Reliverse AI")],
    deployBehavior: [comment("Behavior for deployment prompts")],
  };

  // Insert section comments
  for (const [section, lines] of Object.entries(commentSections)) {
    if (!lines?.length) continue;
    const combinedComments = lines
      .map((ln, index) => (index > 0 ? `  ${ln}` : ln))
      .join("\n");
    fileContent = fileContent.replace(
      new RegExp(`(\\s+)"${section}":`, "g"),
      `\n\n  ${combinedComments}\n  "${section}":`,
    );
  }

  // Clean up spacing and ensure trailing newline
  return fileContent
    .replace(/\n{3,}/g, "\n\n")
    .replace(/{\n\n/g, "{\n")
    .replace(/\n\n}/g, "\n}")
    .trim()
    .concat("\n");
}

/**
 * Safely writes a Reliverse config to disk with backup & atomic operations
 * @param configPath Target config path (usually `.reliverse`)
 * @param config ReliverseConfig to write
 */
export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
): Promise<void> {
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    // Validate config with Zod
    const validationResult = reliverseConfigSchema.safeParse(config);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(`Invalid config: ${errors}`);
    }

    // Convert validated data to JSON and inject comments
    let fileContent = JSON.stringify(validationResult.data, null, 2);
    fileContent = injectSectionComments(fileContent);

    // Create backup if original file exists
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    // Write to temp, then rename
    await fs.writeFile(tempPath, fileContent);
    await fs.rename(tempPath, configPath);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success-verbose", "Config written successfully");
  } catch (error) {
    // In case of error, restore backup
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      await fs.copy(backupPath, configPath);
      relinka("warn", "Restored config from backup after failed write");
    }

    // Remove temp file
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }

    throw error;
  }
}

/**
 * Reads, validates, and returns the Reliverse config from disk
 * @param projectName Name of the project
 * @param configPath Full path to `.reliverse`
 * @param cwd Current working directory
 */
export async function readReliverseConfig(
  projectName: string,
  configPath: string,
  cwd: string,
): Promise<ReliverseConfig | null> {
  const backupPath = configPath + BACKUP_EXTENSION;

  try {
    // If main file exists, try reading
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, "utf-8");

      // If empty or just '{}', write defaults
      if (!content.trim() || content.trim() === "{}") {
        const defaultCfg = await getDefaultReliverseConfig(
          cwd,
          projectName,
          "user",
        );
        await writeReliverseConfig(configPath, defaultCfg);
        return defaultCfg;
      }

      const parsed = destr(content);
      if (!parsed || typeof parsed !== "object") {
        const defaultCfg = await getDefaultReliverseConfig(
          cwd,
          projectName,
          "user",
        );
        await writeReliverseConfig(configPath, defaultCfg);
        return defaultCfg;
      }

      const validationResult = reliverseConfigSchema.safeParse(parsed);
      if (validationResult.success) {
        // Valid config
        return validationResult.data;
      }

      // If errors are specifically about missing fields, do a merge with defaults
      const hasMissingFields = validationResult.error.errors.some(
        (e) => e.code === "invalid_type" && e.received === "undefined",
      );

      if (hasMissingFields) {
        const defaultCfg = await getDefaultReliverseConfig(
          cwd,
          projectName,
          "user",
        );

        // Deep merge existing with default
        const merged = {
          ...defaultCfg,
          ...parsed,
          // Start of Selection
          features: {
            ...defaultCfg.features,
            ...(parsed as ReliverseConfig).features,
          },
          codeStyle: {
            ...defaultCfg.codeStyle,
            ...(parsed as ReliverseConfig).codeStyle,
          },
          preferredLibraries: {
            ...defaultCfg.preferredLibraries,
            ...(parsed as ReliverseConfig).preferredLibraries,
          },
          customRules: {
            ...defaultCfg.customRules,
            ...(parsed as ReliverseConfig).customRules,
          },
        } as ReliverseConfig;

        const mergedValidation = reliverseConfigSchema.safeParse(merged);
        if (mergedValidation.success) {
          await writeReliverseConfig(configPath, mergedValidation.data);
          relinka("info", "Merged missing fields into config");
          return mergedValidation.data;
        }

        // If still invalid, try backup below
        relinka("warn", "Merged config is still invalid. Attempting backup...");
      }
    }

    // If main file is invalid or missing, try backup
    if (await fs.pathExists(backupPath)) {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      const parsedBackup = destr(backupContent);

      const validationResult = reliverseConfigSchema.safeParse(parsedBackup);
      if (validationResult.success) {
        await fs.copy(backupPath, configPath);
        relinka("info", "Restored config from backup");
        return validationResult.data;
      }
    }

    // If no valid config found, create a default one
    const defaultConfig = await getDefaultReliverseConfig(
      cwd,
      projectName,
      "user",
    );
    await writeReliverseConfig(configPath, defaultConfig);
    return defaultConfig;
  } catch (error) {
    relinka(
      "error",
      "Error reading config:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Safely updates specific fields in the `.reliverse` config
 * @param projectName Name of the project
 * @param configPath Full path to `.reliverse`
 * @param updates Partial config updates
 * @param cwd Current working directory
 */
export async function updateReliverseConfig(
  projectName: string,
  configPath: string,
  updates: Partial<ReliverseConfig>,
  cwd: string,
): Promise<boolean> {
  try {
    const current = await readReliverseConfig(projectName, configPath, cwd);
    if (!current) return false;

    const updated = { ...current, ...updates };
    await writeReliverseConfig(configPath, updated);
    return true;
  } catch (error) {
    relinka(
      "error",
      "Error updating config:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/* ------------------------------------------------------------------
 * Project Detection & Configuration Generation
 * ------------------------------------------------------------------ */

/**
 * Generates a default config based on a detected project type, if found.
 * @param cwd Current working directory
 * @returns A partial ReliverseConfig or null if type can't be detected
 */
export async function generateDefaultRulesForProject(
  cwd: string,
): Promise<ReliverseConfig | null> {
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
    relinka(
      "error",
      "Error reading package.json:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Get base config
  const rules = await getDefaultReliverseConfig(
    cwd,
    (packageJson.name as string) ?? path.basename(cwd),
    (packageJson.author as string) ?? "user",
    projectType,
  );

  // Detect additional features by scanning filesystem
  const hasI18n = await fs.pathExists(path.join(cwd, "src/app/[locale]"));
  const hasPrisma = await fs.pathExists(path.join(cwd, "prisma/schema.prisma"));
  const hasDrizzle = await fs.pathExists(path.join(cwd, "drizzle.config.ts"));
  const hasNextAuth = await fs.pathExists(
    path.join(cwd, "src/app/api/auth/[...nextauth]"),
  );
  const hasClerk = packageJson.dependencies?.["@clerk/nextjs"];

  // Update features
  rules.features = {
    ...rules.features,
    i18n: hasI18n,
    database: hasPrisma || hasDrizzle,
    authentication: hasNextAuth || hasClerk,
    analytics: false,
    themeMode: "dark-light",
    api: true,
    testing: false,
    docker: false,
    ci: false,
    commands: [],
    webview: [],
    language: ["typescript"],
    themes: ["default"],
  };

  // Update library prefs
  if (!rules.preferredLibraries) {
    rules.preferredLibraries = {};
  }

  if (projectType === "nextjs") {
    rules.preferredLibraries["database"] = "prisma";
    rules.preferredLibraries["authentication"] = "next-auth";
  } else {
    rules.preferredLibraries["database"] = "drizzle";
    rules.preferredLibraries["authentication"] = "clerk";
  }

  return rules;
}

/**
 * Creates or merges a Reliverse config in the current workspace
 * @param projectName Name of the project
 * @param frontendUsername Author or main dev's username
 * @param deployService Deployment service (vercel, netlify, etc.)
 * @param primaryDomain The main domain for the project (if any)
 * @param projectPath Full path to the project
 * @param i18nShouldBeEnabled Whether i18n is or should be enabled
 * @param overwrite Whether to force overwriting the config
 * @param githubUsername GitHub username for repository defaults
 */
export async function generateReliverseConfig({
  projectName,
  frontendUsername,
  deployService,
  primaryDomain,
  projectPath,
  i18nShouldBeEnabled,
  overwrite = false,
  githubUsername,
}: GenerateReliverseConfigOptions): Promise<void> {
  // Attempt to read package.json
  const packageJson = await getPackageJson(projectPath);

  // Start with a default config
  const baseRules = await getDefaultReliverseConfig(
    projectPath,
    projectName,
    frontendUsername,
    packageJson?.type === "module" ? "nextjs" : "nextjs",
  );

  // Fill in project details
  baseRules.projectName = projectName;
  baseRules.projectAuthor = frontendUsername;
  baseRules.projectDescription =
    packageJson?.description ?? baseRules.projectDescription;
  baseRules.projectVersion = packageJson?.version ?? baseRules.projectVersion;
  baseRules.projectLicense = packageJson?.license ?? baseRules.projectLicense;
  baseRules.projectRepository = packageJson?.repository
    ? typeof packageJson.repository === "string"
      ? packageJson.repository
      : packageJson.repository.url
    : `https://github.com/${githubUsername}/${projectName}`;
  baseRules.projectDeployService = deployService;
  baseRules.projectDomain = primaryDomain
    ? `https://${primaryDomain}`
    : `https://${projectName}.vercel.app`;

  // Detect features from dependencies and project structure
  baseRules.features = await detectFeatures(
    projectPath,
    packageJson,
    i18nShouldBeEnabled,
  );

  // Adjust behaviors
  baseRules.gitBehavior = "prompt";
  baseRules.deployBehavior = "prompt";
  baseRules.depsBehavior = "prompt";
  baseRules.i18nBehavior = "prompt";
  baseRules.scriptsBehavior = "prompt";
  baseRules.skipPromptsUseAutoBehavior = false;

  // Fill/override codeStyle with known defaults
  baseRules.codeStyle = {
    ...baseRules.codeStyle,
    dontRemoveComments: true,
    shouldAddComments: true,
    typeOrInterface: "type",
    importOrRequire: "import",
    quoteMark: "double",
    semicolons: true,
    lineWidth: 80,
    indentStyle: "space",
    indentSize: 2,
    importSymbol: "~",
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    tabWidth: 2,
    jsToTs: false,
    cjsToEsm: false,
    modernize: {
      replaceFs: false,
      replacePath: false,
      replaceHttp: false,
      replaceProcess: false,
      replaceConsole: false,
      replaceEvents: false,
    },
  };

  // Merge with any existing config if not overwriting
  const configPath = path.join(projectPath, ".reliverse");
  let existingContent: ReliverseConfig | null = null;

  if (!overwrite && (await fs.pathExists(configPath))) {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      existingContent = destr<ReliverseConfig>(content);
    } catch {
      // Ignore
    }
  }

  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...existingContent,
    ...baseRules,
  };

  // Finally, write .reliverse
  await writeReliverseConfig(configPath, finalConfig);
}

/**
 * Reads package.json safely
 */
async function getPackageJson(
  projectPath: string,
): Promise<PackageJson | null> {
  try {
    return await readPackageJSON(projectPath);
  } catch (error) {
    relinka(
      "warn",
      "Could not read package.json:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Detect features from dependencies and certain known project files
 */
async function detectFeatures(
  projectPath: string,
  packageJson: PackageJson | null,
  i18nShouldBeEnabled: boolean,
): Promise<ProjectFeatures> {
  const deps: Record<string, string> = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };

  const hasNextAuth = "next-auth" in deps;
  const hasClerk = "@clerk/nextjs" in deps;
  const hasPrisma = "@prisma/client" in deps;
  const hasDrizzle = "drizzle-orm" in deps;
  const hasI18n =
    "next-intl" in deps || "react-i18next" in deps || i18nShouldBeEnabled;
  const hasAnalytics =
    "@vercel/analytics" in deps || "@segment/analytics-next" in deps;
  const hasDocker = await fs.pathExists(path.join(projectPath, "Dockerfile"));
  const hasCI =
    (await fs.pathExists(path.join(projectPath, ".github/workflows"))) ||
    (await fs.pathExists(path.join(projectPath, ".gitlab-ci.yml")));
  const hasTesting =
    "jest" in deps || "vitest" in deps || "@testing-library/react" in deps;

  return {
    i18n: hasI18n,
    analytics: hasAnalytics,
    themeMode: "dark-light",
    authentication: hasNextAuth || hasClerk,
    api: true,
    database: hasPrisma || hasDrizzle,
    testing: hasTesting,
    docker: hasDocker,
    ci: hasCI,
    commands: [],
    webview: [],
    language: ["typescript"],
    themes: ["default"],
  };
}

/* ------------------------------------------------------------------
 * Additional Project Detection
 * ------------------------------------------------------------------ */

/**
 * Checks for presence of key files/folders
 */
async function checkProjectFiles(projectPath: string): Promise<{
  hasReliverse: boolean;
  hasPackageJson: boolean;
  hasNodeModules: boolean;
  hasGit: boolean;
}> {
  const [hasReliverse, hasPackageJson, hasNodeModules, hasGit] =
    await Promise.all([
      fs.pathExists(path.join(projectPath, ".reliverse")),
      fs.pathExists(path.join(projectPath, "package.json")),
      fs.pathExists(path.join(projectPath, "node_modules")),
      fs.pathExists(path.join(projectPath, ".git")),
    ]);

  return { hasReliverse, hasPackageJson, hasNodeModules, hasGit };
}

/**
 * Returns a DetectedProject if `.reliverse` and `package.json` exist
 */
export async function detectProject(
  projectPath: string,
): Promise<DetectedProject | null> {
  try {
    const { hasReliverse, hasPackageJson, hasNodeModules, hasGit } =
      await checkProjectFiles(projectPath);

    if (!hasReliverse || !hasPackageJson) {
      return null;
    }

    const configContent = await fs.readFile(
      path.join(projectPath, ".reliverse"),
      "utf-8",
    );
    const parsedConfig = parseJSONC(configContent);
    const config = destr<ReliverseConfig>(parsedConfig);

    return {
      name: path.basename(projectPath),
      path: projectPath,
      config,
      needsDepsInstall: !hasNodeModules,
      hasGit,
    };
  } catch (error) {
    relinka(
      "warn",
      `Error processing ${projectPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/**
 * Detects all sub-projects (and root) that contain a `.reliverse` file
 */
export async function detectProjectsWithReliverse(
  cwd: string,
): Promise<DetectedProject[]> {
  const detected: DetectedProject[] = [];

  // Check root
  const rootProject = await detectProject(cwd);
  if (rootProject) {
    detected.push(rootProject);
  }

  // Check subdirectories
  try {
    const items = await fs.readdir(cwd, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const projectPath = path.join(cwd, item.name);
        const project = await detectProject(projectPath);
        if (project) {
          detected.push(project);
        }
      }
    }
  } catch (error) {
    relinka(
      "warn",
      `Error reading directory ${cwd}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return detected;
}

/* ------------------------------------------------------------------
 * Higher-level Config Verification
 * ------------------------------------------------------------------ */

/**
 * Attempts to parse an existing `.reliverse` file as JSONC
 * and merge with defaults
 */
async function parseAndFixConfig(
  projectName: string,
  configPath: string,
  cwd: string,
): Promise<ReliverseConfig | null> {
  const raw = await fs.readFile(configPath, "utf-8");

  try {
    const parsed = parseJSONC(raw);
    if (parsed && typeof parsed === "object") {
      const merged = mergeWithDefaults(parsed as Partial<ReliverseConfig>);
      const success = await updateReliverseConfig(
        projectName,
        configPath,
        merged,
        cwd,
      );
      if (success) {
        relinka("info", "Fixed .reliverse configuration.");
        return await readReliverseConfig(projectName, configPath, cwd);
      }
    }
  } catch (error) {
    relinka(
      "warn",
      "Failed to parse .reliverse config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return null;
}

/**
 * Removes the invalid `.reliverse` file and regenerates a fresh one
 */
async function regenerateConfig(
  projectName: string,
  configPath: string,
  cwd: string,
  githubUsername: string,
): Promise<ReliverseConfig | null> {
  await fs.remove(configPath);
  relinka("warn", "Found invalid .reliverse config, regenerating...");

  const defaultRules = await generateDefaultRulesForProject(cwd);
  await generateReliverseConfig({
    projectName: defaultRules?.projectName ?? path.basename(cwd),
    frontendUsername: defaultRules?.projectAuthor ?? "user",
    deployService: "vercel",
    primaryDomain: defaultRules?.projectDomain ?? "",
    projectPath: cwd,
    i18nShouldBeEnabled: defaultRules?.features?.i18n ?? false,
    githubUsername,
  });

  return readReliverseConfig(projectName, configPath, cwd);
}

/**
 * Verifies or regenerates `.reliverse`, returning a valid config
 */
export async function verifyReliverseConfig(
  cwd: string,
  configPath: string,
  githubUsername: string,
  projectName: string,
): Promise<ReliverseConfig | null> {
  try {
    let config = await readReliverseConfig(projectName, configPath, cwd);

    // If config is invalid, try to fix JSONC
    if (!config) {
      config = await parseAndFixConfig(projectName, configPath, cwd);
    }

    // If still invalid, regenerate from scratch
    if (!config) {
      config = await regenerateConfig(
        projectName,
        configPath,
        cwd,
        githubUsername,
      );
    }

    if (!config) {
      throw new Error("Failed to create valid .reliverse configuration");
    }

    return config;
  } catch (error) {
    relinka(
      "error",
      "Error reading .reliverse config:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Returns the path to `.reliverse` in the given directory
 */
export function findReliverseConfig(cwd: string) {
  return path.join(cwd, ".reliverse");
}

/**
 * Creates (or verifies) and returns a `.reliverse` config
 */
export async function handleReliverseConfig(
  cwd: string,
  projectName = "project",
  githubUsername = "user",
): Promise<ReliverseConfig> {
  try {
    const configPath = findReliverseConfig(cwd);

    // Ensure the file is created at least once
    await createReliverseConfig(cwd, githubUsername);

    // Verify/fix the config if needed
    const cfg = await verifyReliverseConfig(
      cwd,
      configPath,
      githubUsername,
      projectName,
    );
    if (!cfg) {
      throw new Error("Failed to create valid .reliverse configuration");
    }
    return cfg;
  } catch (error) {
    relinka(
      "error",
      "Failed to handle .reliverse config:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Creates a `.reliverse` config file in the current workspace if one doesn't exist
 */
async function createReliverseConfig(
  cwd: string,
  githubUsername: string,
): Promise<void> {
  const defaultRules = await generateDefaultRulesForProject(cwd);

  await generateReliverseConfig({
    projectName: defaultRules?.projectName ?? path.basename(cwd),
    frontendUsername: defaultRules?.projectAuthor ?? "user",
    deployService: "vercel",
    primaryDomain: defaultRules?.projectDomain ?? "",
    projectPath: cwd,
    i18nShouldBeEnabled: defaultRules?.features?.i18n ?? false,
    githubUsername,
  });

  relinka(
    "info",
    defaultRules
      ? "Created .reliverse configuration based on detected project settings."
      : "Created initial .reliverse configuration. Please review and adjust as needed.",
  );
}

/* ------------------------------------------------------------------
 * Merging Logic for Defaults
 * ------------------------------------------------------------------ */

/**
 * Safely merges a partial config with the global `DEFAULT_CONFIG`
 */
function mergeWithDefaults(partial: Partial<ReliverseConfig>): ReliverseConfig {
  const merged: ReliverseConfig = {
    projectName: partial.projectName ?? DEFAULT_CONFIG.projectName ?? "",
    projectAuthor: partial.projectAuthor ?? DEFAULT_CONFIG.projectAuthor ?? "",
    projectDescription:
      partial.projectDescription ?? DEFAULT_CONFIG.projectDescription ?? "",
    projectVersion:
      partial.projectVersion ?? DEFAULT_CONFIG.projectVersion ?? "0.1.0",
    projectLicense:
      partial.projectLicense ?? DEFAULT_CONFIG.projectLicense ?? "MIT",
    projectRepository: partial.projectRepository,
    projectDeployService: partial.projectDeployService,
    projectDomain: partial.projectDomain,
    projectType: partial.projectType,
    projectFramework:
      partial.projectFramework ?? DEFAULT_CONFIG.projectFramework ?? "nextjs",
    projectPackageManager:
      partial.projectPackageManager ??
      DEFAULT_CONFIG.projectPackageManager ??
      "npm",
    projectFrameworkVersion: partial.projectFrameworkVersion,
    nodeVersion: partial.nodeVersion,
    runtime: partial.runtime,
    deployUrl: partial.deployUrl,
    features: {
      i18n: partial.features?.i18n ?? DEFAULT_CONFIG.features.i18n ?? false,
      analytics:
        partial.features?.analytics ??
        DEFAULT_CONFIG.features.analytics ??
        false,
      themeMode:
        partial.features?.themeMode ??
        DEFAULT_CONFIG.features.themeMode ??
        "dark-light",
      authentication:
        partial.features?.authentication ??
        DEFAULT_CONFIG.features.authentication ??
        false,
      api: partial.features?.api ?? DEFAULT_CONFIG.features.api ?? false,
      database:
        partial.features?.database ?? DEFAULT_CONFIG.features.database ?? false,
      testing:
        partial.features?.testing ?? DEFAULT_CONFIG.features.testing ?? false,
      docker:
        partial.features?.docker ?? DEFAULT_CONFIG.features.docker ?? false,
      ci: partial.features?.ci ?? DEFAULT_CONFIG.features.ci ?? false,
      commands:
        partial.features?.commands ?? DEFAULT_CONFIG.features.commands ?? [],
      webview:
        partial.features?.webview ?? DEFAULT_CONFIG.features.webview ?? [],
      language:
        partial.features?.language ?? DEFAULT_CONFIG.features.language ?? [],
      themes: partial.features?.themes ?? DEFAULT_CONFIG.features.themes ?? [],
    },
    preferredLibraries:
      partial.preferredLibraries ?? DEFAULT_CONFIG.preferredLibraries ?? {},
    codeStyle: {
      lineWidth:
        partial.codeStyle?.lineWidth ??
        DEFAULT_CONFIG.codeStyle.lineWidth ??
        80,
      indentSize:
        partial.codeStyle?.indentSize ??
        DEFAULT_CONFIG.codeStyle.indentSize ??
        2,
      indentStyle:
        partial.codeStyle?.indentStyle ??
        DEFAULT_CONFIG.codeStyle.indentStyle ??
        "space",
      quoteMark:
        partial.codeStyle?.quoteMark ??
        DEFAULT_CONFIG.codeStyle.quoteMark ??
        "double",
      semicolons:
        partial.codeStyle?.semicolons ??
        DEFAULT_CONFIG.codeStyle.semicolons ??
        true,
      trailingComma:
        partial.codeStyle?.trailingComma ??
        DEFAULT_CONFIG.codeStyle.trailingComma ??
        "all",
      bracketSpacing:
        partial.codeStyle?.bracketSpacing ??
        DEFAULT_CONFIG.codeStyle.bracketSpacing ??
        true,
      arrowParens:
        partial.codeStyle?.arrowParens ??
        DEFAULT_CONFIG.codeStyle.arrowParens ??
        "always",
      tabWidth:
        partial.codeStyle?.tabWidth ?? DEFAULT_CONFIG.codeStyle.tabWidth ?? 2,
      jsToTs:
        partial.codeStyle?.jsToTs ?? DEFAULT_CONFIG.codeStyle.jsToTs ?? false,
      dontRemoveComments:
        partial.codeStyle?.dontRemoveComments ??
        DEFAULT_CONFIG.codeStyle.dontRemoveComments ??
        true,
      shouldAddComments:
        partial.codeStyle?.shouldAddComments ??
        DEFAULT_CONFIG.codeStyle.shouldAddComments ??
        true,
      typeOrInterface:
        partial.codeStyle?.typeOrInterface ??
        DEFAULT_CONFIG.codeStyle.typeOrInterface ??
        "type",
      importOrRequire:
        partial.codeStyle?.importOrRequire ??
        DEFAULT_CONFIG.codeStyle.importOrRequire ??
        "import",
      cjsToEsm:
        partial.codeStyle?.cjsToEsm ??
        DEFAULT_CONFIG.codeStyle.cjsToEsm ??
        false,
      modernize: {
        replaceFs:
          partial.codeStyle?.modernize?.replaceFs ??
          DEFAULT_CONFIG.codeStyle.modernize.replaceFs ??
          false,
        replacePath:
          partial.codeStyle?.modernize?.replacePath ??
          DEFAULT_CONFIG.codeStyle.modernize.replacePath ??
          false,
        replaceHttp:
          partial.codeStyle?.modernize?.replaceHttp ??
          DEFAULT_CONFIG.codeStyle.modernize.replaceHttp ??
          false,
        replaceProcess:
          partial.codeStyle?.modernize?.replaceProcess ??
          DEFAULT_CONFIG.codeStyle.modernize.replaceProcess ??
          false,
        replaceConsole:
          partial.codeStyle?.modernize?.replaceConsole ??
          DEFAULT_CONFIG.codeStyle.modernize.replaceConsole ??
          false,
        replaceEvents:
          partial.codeStyle?.modernize?.replaceEvents ??
          DEFAULT_CONFIG.codeStyle.modernize.replaceEvents ??
          false,
      },
      importSymbol:
        partial.codeStyle?.importSymbol ??
        DEFAULT_CONFIG.codeStyle.importSymbol ??
        "",
    },
    monorepo: {
      type: partial.monorepo?.type ?? DEFAULT_CONFIG.monorepo.type ?? "none",
      packages:
        partial.monorepo?.packages ?? DEFAULT_CONFIG.monorepo.packages ?? [],
      sharedPackages:
        partial.monorepo?.sharedPackages ??
        DEFAULT_CONFIG.monorepo.sharedPackages ??
        [],
    },
    ignoreDependencies:
      partial.ignoreDependencies ?? DEFAULT_CONFIG.ignoreDependencies ?? [],
    customRules: partial.customRules ?? DEFAULT_CONFIG.customRules ?? {},
    skipPromptsUseAutoBehavior:
      partial.skipPromptsUseAutoBehavior ??
      DEFAULT_CONFIG.skipPromptsUseAutoBehavior ??
      false,
    deployBehavior:
      partial.deployBehavior ?? DEFAULT_CONFIG.deployBehavior ?? "prompt",
    depsBehavior:
      partial.depsBehavior ?? DEFAULT_CONFIG.depsBehavior ?? "prompt",
    gitBehavior: partial.gitBehavior ?? DEFAULT_CONFIG.gitBehavior ?? "prompt",
    i18nBehavior:
      partial.i18nBehavior ?? DEFAULT_CONFIG.i18nBehavior ?? "prompt",
    scriptsBehavior:
      partial.scriptsBehavior ?? DEFAULT_CONFIG.scriptsBehavior ?? "prompt",
  };
  return merged;
}

/* ------------------------------------------------------------------
 * Reading Style from Prettier / TypeScript
 * ------------------------------------------------------------------ */

/**
 * Reads code style from local config files if present (.prettierrc, tsconfig.json)
 * and merges them into a partial ReliverseConfig
 */
export async function parseCodeStyleFromConfigs(
  cwd: string,
): Promise<Partial<ReliverseConfig>> {
  const codeStyle: Record<string, unknown> = {};

  // Attempt to read .prettierrc
  try {
    const prettierPath = path.join(cwd, ".prettierrc");
    if (await fs.pathExists(prettierPath)) {
      const fileContent = await fs.readFile(prettierPath, "utf-8");
      const prettierConfig =
        safeDestr<{
          printWidth?: number;
          tabWidth?: number;
          useTabs?: boolean;
          singleQuote?: boolean;
          semi?: boolean;
          trailingComma?: "none" | "es5" | "all";
          bracketSpacing?: boolean;
          arrowParens?: "always" | "avoid";
        }>(fileContent) ?? {};

      codeStyle["lineWidth"] = prettierConfig.printWidth ?? 80;
      codeStyle["indentSize"] = prettierConfig.tabWidth ?? 2;
      codeStyle["indentStyle"] = prettierConfig.useTabs ? "tab" : "space";
      codeStyle["quoteMark"] = prettierConfig.singleQuote ? "single" : "double";
      codeStyle["semicolons"] = prettierConfig.semi ?? true;
      codeStyle["trailingComma"] = prettierConfig.trailingComma ?? "all";
      codeStyle["bracketSpacing"] = prettierConfig.bracketSpacing ?? true;
      codeStyle["arrowParens"] = prettierConfig.arrowParens ?? "always";
      codeStyle["tabWidth"] = prettierConfig.tabWidth ?? 2;
      codeStyle["jsToTs"] = false;
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error parsing Prettier config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Attempt to read tsconfig.json
  try {
    const tsConfigPath = path.join(cwd, "tsconfig.json");
    if (await fs.pathExists(tsConfigPath)) {
      const tsContent = await fs.readFile(tsConfigPath, "utf-8");
      const tsConfig = safeDestr<TSConfig>(tsContent);

      if (tsConfig?.compilerOptions) {
        // Check TS strict settings
        codeStyle["strictMode"] = {
          enabled: tsConfig.compilerOptions.strict ?? false,
          noImplicitAny: tsConfig.compilerOptions.noImplicitAny ?? false,
          strictNullChecks: tsConfig.compilerOptions.strictNullChecks ?? false,
        };

        // Check module format for import/require
        if (
          (tsConfig.compilerOptions.module as string)
            ?.toLowerCase()
            .includes("node")
        ) {
          codeStyle["importOrRequire"] = "esm";
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
  return {
    ...codeStyle,
  };
}

/**
 * Revalidates and merges an existing .reliverse with default fields
 */
export async function revalidateReliverseJson(cwd: string, rulesPath: string) {
  const fileContent = await fs.readFile(rulesPath, "utf-8");
  const parsed = fileContent.trim()
    ? destr<Partial<ReliverseConfig>>(fileContent)
    : {};

  // If project type is detected, get default rules; else use fallback
  const projectType = await detectProjectType(cwd);
  const defaultRules = projectType
    ? await generateDefaultRulesForProject(cwd)
    : await getDefaultReliverseConfig(
        cwd,
        path.basename(cwd),
        "user",
        "nextjs", // Fallback
      );

  if (defaultRules) {
    // Merge with Prettier/TS config
    const configRules = await parseCodeStyleFromConfigs(cwd);

    // Build merged object
    const merged: ReliverseConfig = {
      ...defaultRules,
      ...parsed,
      features: {
        ...defaultRules.features,
        ...parsed.features,
      },
      projectName: parsed.projectName ?? defaultRules.projectName ?? "",
      projectAuthor: parsed.projectAuthor ?? defaultRules.projectAuthor ?? "",
      projectDescription:
        parsed.projectDescription ?? defaultRules.projectDescription ?? "",
      projectVersion:
        parsed.projectVersion ?? defaultRules.projectVersion ?? "0.1.0",
      projectLicense:
        parsed.projectLicense ?? defaultRules.projectLicense ?? "MIT",
      projectRepository:
        parsed.projectRepository ?? defaultRules.projectRepository ?? "",
      projectFramework:
        parsed.projectFramework ?? defaultRules.projectFramework,
      projectPackageManager:
        parsed.projectPackageManager ?? defaultRules.projectPackageManager,
      projectFrameworkVersion:
        parsed.projectFrameworkVersion ?? defaultRules.projectFrameworkVersion,
      nodeVersion: parsed.nodeVersion ?? defaultRules.nodeVersion,
      runtime: parsed.runtime ?? defaultRules.runtime,
      monorepo: parsed.monorepo ?? defaultRules.monorepo,
      preferredLibraries: {
        ...defaultRules.preferredLibraries,
        ...parsed.preferredLibraries,
      },
      codeStyle: {
        ...defaultRules.codeStyle,
        ...configRules?.codeStyle,
        ...parsed.codeStyle,
      },
      skipPromptsUseAutoBehavior:
        parsed.skipPromptsUseAutoBehavior ??
        defaultRules.skipPromptsUseAutoBehavior ??
        false,
      deployBehavior:
        parsed.deployBehavior ?? defaultRules.deployBehavior ?? "prompt",
      depsBehavior:
        parsed.depsBehavior ?? defaultRules.depsBehavior ?? "prompt",
      gitBehavior: parsed.gitBehavior ?? defaultRules.gitBehavior ?? "prompt",
      i18nBehavior:
        parsed.i18nBehavior ?? defaultRules.i18nBehavior ?? "prompt",
      scriptsBehavior:
        parsed.scriptsBehavior ?? defaultRules.scriptsBehavior ?? "prompt",
      ignoreDependencies:
        parsed.ignoreDependencies ?? defaultRules.ignoreDependencies,
      customRules: {
        ...defaultRules.customRules,
        ...parsed.customRules,
      },
    };

    // Check if new fields were actually merged
    const originalJson = JSON.stringify(parsed);
    const mergedJson = JSON.stringify(merged);

    if (originalJson !== mergedJson) {
      await writeReliverseConfig(rulesPath, merged);
      relinka(
        "info",
        "Updated .reliverse with missing configurations. Please review and adjust as needed.",
      );
    }
  }
}
