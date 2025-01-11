import { parseJSONC } from "confbox";
import destr, { safeDestr } from "destr";
import { detect } from "detect-package-manager";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON, type PackageJson } from "pkg-types";
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

/* ------------------------------------------------------------------
 * Detecting Project Type
 * ------------------------------------------------------------------ */
export const PROJECT_TYPE_FILES = {
  "": [],
  library: ["jsr.json", "jsr.jsonc"],
  nextjs: ["next.config.js", "next.config.ts", "next.config.mjs"],
  astro: ["astro.config.js", "astro.config.ts", "astro.config.mjs"],
  react: ["vite.config.js", "vite.config.ts", "react.config.js"],
  vue: ["vue.config.js", "vite.config.ts"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
} satisfies Record<ProjectTypeOptions, string[]>;

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

/* ------------------------------------------------------------------
 * Zod Schema and ReliverseConfig
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
  projectVersion: z.string(),
  projectLicense: z.string(),
  projectRepository: z.string().optional(),
  projectDomain: z.string().optional(),
  projectDeployService: z
    .enum(["vercel", "netlify", "railway", "deno", "none"])
    .optional(),
  projectDisplayName: z.string().optional(),
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
 * ReliverseConfig Type
 * ------------------------------------------------------------------ */
export type ReliverseConfig = z.infer<typeof reliverseConfigSchema>;

/* ------------------------------------------------------------------
 * Default + Merging Logic
 * ------------------------------------------------------------------ */
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

/**
 * Safely merges a partial config with the global `DEFAULT_CONFIG`
 */
function mergeWithDefaults(partial: Partial<ReliverseConfig>): ReliverseConfig {
  const merged: ReliverseConfig = {
    ...DEFAULT_CONFIG,
    ...partial,
    features: {
      ...DEFAULT_CONFIG.features,
      ...(partial.features ?? {}),
    },
    codeStyle: {
      ...DEFAULT_CONFIG.codeStyle,
      ...(partial.codeStyle ?? {}),
    },
    preferredLibraries: {
      ...DEFAULT_CONFIG.preferredLibraries,
      ...(partial.preferredLibraries ?? {}),
    },
    monorepo: {
      ...DEFAULT_CONFIG.monorepo,
      ...(partial.monorepo ?? {}),
    },
    customRules: {
      ...DEFAULT_CONFIG.customRules,
      ...(partial.customRules ?? {}),
    },
    ignoreDependencies:
      partial.ignoreDependencies ?? DEFAULT_CONFIG.ignoreDependencies,
  };
  return merged;
}

/* ------------------------------------------------------------------
 * Comment Injection
 * ------------------------------------------------------------------ */
type CommentSections = Partial<Record<keyof ReliverseConfig, string[]>>;

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

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------ */
const BACKUP_EXTENSION = ".backup";
const TEMP_EXTENSION = ".tmp";

/* ------------------------------------------------------------------
 * Config Read/Write
 * ------------------------------------------------------------------ */

/**
 * Writes a ReliverseConfig to `.reliverse` with backup + atomic writes.
 * If validation fails, we gather all problematic fields and messages.
 */
export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
): Promise<void> {
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    // Validate with Zod
    const validationResult = reliverseConfigSchema.safeParse(config);
    if (!validationResult.success) {
      // Collect all field issues
      const fieldErrors = validationResult.error.issues.map((issue) => {
        const fieldPath = issue.path.join(".");
        return `Field "${fieldPath}": ${issue.message}`;
      });
      // Log them for clarity
      relinka("error", "Invalid .reliverse config:", fieldErrors.join("; "));
      throw new Error(`Invalid .reliverse config: ${fieldErrors.join("; ")}`);
    }

    // JSONify and inject comments
    let fileContent = JSON.stringify(validationResult.data, null, 2);
    fileContent = injectSectionComments(fileContent);

    // Backup if original exists
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
    // Restore backup if write fails
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      await fs.copy(backupPath, configPath);
      relinka("warn", "Restored config from backup after failed write");
    }
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }
    throw error;
  }
}

/**
 * Reads `.reliverse` from disk and returns a valid ReliverseConfig if possible.
 * DOES NOT regenerate from scratch if invalid — returns null if it can't fix/restore.
 * If validation fails, logs each problematic field for clarity.
 */
export async function readReliverseConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  const backupPath = configPath + BACKUP_EXTENSION;

  // If file doesn't exist, bail out immediately
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");

    // If empty or just "{}" => no actual config
    if (!content.trim() || content.trim() === "{}") {
      return null; // triggers "generate from scratch" logic outside
    }

    const parsed = destr(content);
    if (!parsed || typeof parsed !== "object") {
      return null; // triggers parse/fix outside
    }

    const validationResult = reliverseConfigSchema.safeParse(parsed);
    if (validationResult.success) {
      return validationResult.data; // All good
    }

    // If not successful, gather errors
    const fieldErrors = validationResult.error.issues.map((issue) => {
      const fieldPath = issue.path.join(".");
      return `Field "${fieldPath}": ${issue.message}`;
    });
    relinka(
      "warn",
      "Detected invalid fields in .reliverse:",
      fieldErrors.join("; "),
    );

    // Attempt partial fix if there are missing fields
    const hasMissingFields = validationResult.error.errors.some(
      (e) => e.code === "invalid_type" && e.received === "undefined",
    );
    if (hasMissingFields) {
      const merged = mergeWithDefaults(parsed as Partial<ReliverseConfig>);
      const mergedResult = reliverseConfigSchema.safeParse(merged);
      if (mergedResult.success) {
        // Overwrite .reliverse with merged
        await writeReliverseConfig(configPath, mergedResult.data);
        relinka("info", "Merged missing fields into config");
        return mergedResult.data;
      } else {
        // If merged also fails, show errors
        const mergeFieldErrors = mergedResult.error.issues.map((issue) => {
          const fieldPath = issue.path.join(".");
          return `Field "${fieldPath}": ${issue.message}`;
        });
        relinka(
          "warn",
          "Merged config is still invalid:",
          mergeFieldErrors.join("; "),
        );
      }
    }

    // If partial fix also fails, attempt backup
    if (await fs.pathExists(backupPath)) {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      const backupParsed = destr(backupContent);
      const backupResult = reliverseConfigSchema.safeParse(backupParsed);
      if (backupResult.success) {
        // Restore from backup
        await fs.copy(backupPath, configPath);
        relinka("info", "Restored config from backup");
        return backupResult.data;
      } else {
        // Show backup errors too
        const backupErrors = backupResult.error.issues.map((issue) => {
          const fieldPath = issue.path.join(".");
          return `Field "${fieldPath}": ${issue.message}`;
        });
        relinka("warn", "Backup also invalid:", backupErrors.join("; "));
      }
    }

    // If we reach here, nothing could fix it
    return null;
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
 * Attempts to parse existing `.reliverse` + fix lines by merging with defaults.
 * If fix fails, logs each invalid field.
 */
async function parseAndFixConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = parseJSONC(raw);

    if (parsed && typeof parsed === "object") {
      const merged = mergeWithDefaults(parsed as Partial<ReliverseConfig>);
      // Validate
      const mergedResult = reliverseConfigSchema.safeParse(merged);
      if (mergedResult.success) {
        await writeReliverseConfig(configPath, mergedResult.data);
        relinka(
          "info",
          "Fixed .reliverse configuration lines via parseAndFix.",
        );
        return mergedResult.data;
      } else {
        // Show which fields are invalid after merging
        const fieldErrors = mergedResult.error.issues.map((issue) => {
          const fieldPath = issue.path.join(".");
          return `Field "${fieldPath}": ${issue.message}`;
        });
        relinka(
          "warn",
          "Could not fix all lines in .reliverse:",
          fieldErrors.join("; "),
        );
      }
    }
  } catch (error) {
    relinka(
      "warn",
      "Failed to parse/fix .reliverse:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

/* ------------------------------------------------------------------
 * Generating a Default Config
 * ------------------------------------------------------------------ */

export async function getDefaultReliverseConfig(
  cwd: string,
  projectName: string,
  projectAuthor: string,
  projectFramework = "nextjs",
): Promise<ReliverseConfig> {
  const biomeConfig = await getBiomeConfig(cwd);
  const detectedPkgManager = await detect();

  let packageData: PackageJson = { name: projectName, author: projectAuthor };
  try {
    packageData = await readPackageJSON();
  } catch {
    // fallback
  }

  const newConfig: ReliverseConfig = {
    ...DEFAULT_CONFIG,
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
        : (packageData.repository?.url ?? ""),
    projectFramework,
    projectPackageManager: detectedPkgManager,
    codeStyle: {
      ...DEFAULT_CONFIG.codeStyle,
      lineWidth: biomeConfig?.lineWidth ?? 80,
      indentSize: biomeConfig?.indentWidth ?? 2,
      tabWidth: biomeConfig?.indentWidth ?? 2,
    },
  };

  return newConfig;
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

/* ------------------------------------------------------------------
 * Project Detection
 * ------------------------------------------------------------------ */
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

export async function detectProject(
  projectPath: string,
): Promise<DetectedProject | null> {
  try {
    const { hasReliverse, hasPackageJson, hasNodeModules, hasGit } =
      await checkProjectFiles(projectPath);

    if (!hasReliverse || !hasPackageJson) return null;

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
 * Feature Detection
 * ------------------------------------------------------------------ */
export async function detectFeatures(
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
 * Creating or Updating a Config
 * ------------------------------------------------------------------ */
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
  // Read package.json
  const packageJson = await getPackageJson(projectPath);

  // Create base config
  const baseRules = await getDefaultReliverseConfig(
    projectPath,
    projectName,
    frontendUsername,
    packageJson?.type === "module" ? "nextjs" : "nextjs",
  );

  // Override with user-provided details
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

  // Detect features
  baseRules.features = await detectFeatures(
    projectPath,
    packageJson,
    i18nShouldBeEnabled,
  );

  // Adjust default behaviors
  baseRules.gitBehavior = "prompt";
  baseRules.deployBehavior = "prompt";
  baseRules.depsBehavior = "prompt";
  baseRules.i18nBehavior = "prompt";
  baseRules.scriptsBehavior = "prompt";
  baseRules.skipPromptsUseAutoBehavior = false;

  // Code style final overrides
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

  // Check existing config (if not overwriting)
  const configPath = path.join(projectPath, ".reliverse");
  let existingContent: ReliverseConfig | null = null;
  if (!overwrite && (await fs.pathExists(configPath))) {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      existingContent = destr<ReliverseConfig>(content);
    } catch {
      // ignore
    }
  }

  // Merge final
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...existingContent,
    ...baseRules,
  };

  // Write
  await writeReliverseConfig(configPath, finalConfig);
}

/**
 * Creates a `.reliverse` config if none exists, based on detected features.
 */
async function createReliverseConfig(
  cwd: string,
  githubUsername: string,
): Promise<void> {
  const defaultRules = await generateDefaultRulesForProject(cwd);

  const finalProjectName = defaultRules?.projectName ?? path.basename(cwd);
  const finalAuthorName = defaultRules?.projectAuthor ?? "user";
  const finalDomain = defaultRules?.projectDomain ?? "";

  await generateReliverseConfig({
    projectName: finalProjectName,
    frontendUsername: finalAuthorName,
    deployService: "vercel",
    primaryDomain: finalDomain,
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
 * The Core Logic: Handle or Verify .reliverse
 * ------------------------------------------------------------------ */
/**
 * Main entry point: ensures `.reliverse` is present/valid,
 * generating from scratch ONLY if the file is missing, empty, or equals `{}`.
 * Otherwise, tries to fix lines in-place.
 */
export async function handleReliverseConfig(
  cwd: string,
  githubUsername = "user",
): Promise<ReliverseConfig> {
  const configPath = path.join(cwd, ".reliverse");

  // 1. Check if `.reliverse` file exists
  const exists = await fs.pathExists(configPath);
  if (!exists) {
    // (a) DOES NOT EXIST => generate from scratch
    await createReliverseConfig(cwd, githubUsername);
  } else {
    // (b) EXISTS: read it
    const content = (await fs.readFile(configPath, "utf-8")).trim();
    // (b.1) If empty or "{}" => treat as missing
    if (!content || content === "{}") {
      await createReliverseConfig(cwd, githubUsername);
    } else {
      // (b.2) Attempt to read normally
      const validConfig = await readReliverseConfig(configPath);
      if (!validConfig) {
        // If invalid => parse & fix lines
        const fixed = await parseAndFixConfig(configPath);
        if (!fixed) {
          // If still not fixable, log an error, but do NOT regenerate
          relinka(
            "error",
            "Failed to fix existing .reliverse config lines; leaving file as-is.",
          );
        }
      }
    }
  }

  // Finally, read the result again
  const final = await readReliverseConfig(configPath);
  if (!final) {
    throw new Error("Unable to produce a valid .reliverse configuration.");
  }
  return final;
}
