import { parseJSONC } from "confbox";
import destr from "destr";
import { safeDestr } from "destr";
import { detect } from "detect-package-manager";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON, type PackageJson, type TSConfig } from "pkg-types";
import { z } from "zod";

import type {
  Behavior,
  CodeStylePreferences,
  DeploymentService,
  ProjectSubcategory,
  PreferredLibraries,
  ProjectCategory,
  ProjectState,
  ProjectTypeOptions,
  TemplateOption,
  PackageManagerName,
} from "~/types.js";

import { getBiomeConfig } from "~/utils/configHandler.js";

import { relinka } from "./loggerRelinka.js";

type GenerateReliverseConfigOptions = {
  projectName: string;
  frontendUsername: string;
  deployService: DeploymentService;
  primaryDomain: string;
  projectPath: string;
  i18nShouldBeEnabled: boolean;
  overwrite?: boolean;
  githubUsername: string;
};

type ProjectFeatures = {
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

export type ReliverseConfig = {
  // Do you want autoYes/autoNo below?
  // Set to true to activate auto-answering.
  // This is to ensure there is no unexpected behavior.
  skipPromptsUseAutoBehavior?: boolean | undefined;

  // Generation preferences
  deployBehavior?: Behavior | undefined;
  depsBehavior?: Behavior | undefined;
  gitBehavior?: Behavior | undefined;
  i18nBehavior?: Behavior | undefined;
  scriptsBehavior?: Behavior | undefined;

  // Project details
  projectName?: string | undefined;
  projectAuthor?: string | undefined;
  projectDescription?: string | undefined;
  projectVersion?: string | undefined;
  projectLicense?: string | undefined;
  projectRepository?: string | undefined;
  projectState?: ProjectState | undefined;
  projectDomain?: string | undefined;
  projectType?: ProjectTypeOptions | undefined;
  projectCategory?: ProjectCategory | undefined;
  projectSubcategory?: ProjectSubcategory | undefined;
  projectTemplate?: TemplateOption | undefined;
  projectDeployService?: DeploymentService | undefined;
  projectActivation?: string | undefined;
  projectFramework?: string | undefined;
  projectPackageManager?: PackageManagerName | undefined;
  projectFrameworkVersion?: string | undefined;
  projectDisplayName?: string | undefined;
  nodeVersion?: string | undefined;
  runtime?: string | undefined;
  productionBranch?: string | undefined;
  deployUrl?: string | undefined;
  monorepo?:
    | {
        type: string;
        packages: string[];
        sharedPackages: string[];
      }
    | undefined;

  // Project features
  features?:
    | {
        i18n?: boolean | undefined;
        analytics?: boolean | undefined;
        themeMode?: "dark-light" | "dark" | "light" | undefined;
        authentication?: boolean | undefined;
        api?: boolean | undefined;
        database?: boolean | undefined;
        testing?: boolean | undefined;
        docker?: boolean | undefined;
        ci?: boolean | undefined;
        commands?: string[] | undefined;
        webview?: string[] | undefined;
        language?: string[] | undefined;
        themes?: string[] | undefined;
      }
    | undefined;

  // Development preferences
  preferredLibraries?: PreferredLibraries | undefined;
  codeStyle?: CodeStylePreferences | undefined;

  // Dependencies management
  ignoreDependencies?: string[] | undefined;

  // Custom rules
  customRules?: Record<string, unknown> | undefined;
};

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

const BACKUP_EXTENSION = ".backup";
const TEMP_EXTENSION = ".tmp";

export const DEFAULT_CONFIG: ReliverseConfig = {
  // Project details
  projectAuthor: "",
  projectState: "",
  projectDomain: "",
  projectType: "",
  projectCategory: "",
  projectSubcategory: "",

  // Development preferences
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

  // Code style preferences
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

  // Generation preferences
  skipPromptsUseAutoBehavior: false,
  deployBehavior: "prompt",
  depsBehavior: "prompt",
  gitBehavior: "prompt",
  i18nBehavior: "prompt",
  scriptsBehavior: "prompt",
};

// Feature schema
const featuresSchema = z.object({
  i18n: z.boolean().default(true),
  analytics: z.boolean().default(false),
  themeMode: z.enum(["light", "dark", "dark-light"]).default("dark-light"),
  authentication: z.boolean().default(true),
  api: z.boolean().default(true),
  database: z.boolean().default(true),
  testing: z.boolean().default(false),
  docker: z.boolean().default(false),
  ci: z.boolean().default(false),
  commands: z.array(z.string()).default([]),
  webview: z.array(z.string()).default([]),
  language: z.array(z.string()).default(["typescript"]),
  themes: z.array(z.string()).default(["default"]),
});

// Code style schema
const codeStyleSchema = z
  .object({
    lineWidth: z.number().min(1).max(200),
    indentSize: z.union([z.literal(2), z.literal(4), z.literal(8)]),
    indentStyle: z.enum(["space", "tab"]),
    quoteMark: z.enum(["single", "double"]),
    semicolons: z.boolean(),
    trailingComma: z.enum(["none", "es5", "all"]),
    bracketSpacing: z.boolean(),
    arrowParens: z.enum(["always", "as-needed", "never"]),
    tabWidth: z.union([z.literal(2), z.literal(4), z.literal(8)]),
    jsToTs: z.boolean(),
    dontRemoveComments: z.boolean(),
    shouldAddComments: z.boolean(),
    typeOrInterface: z.enum(["type", "interface"]),
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
  .default({
    lineWidth: 80,
    indentSize: 2,
    indentStyle: "space",
    quoteMark: "double",
    semicolons: true,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    tabWidth: 2,
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
  });

const monorepoSchema = z
  .object({
    type: z.enum(["none", "turborepo", "nx", "pnpm"]),
    packages: z.array(z.string()),
    sharedPackages: z.array(z.string()),
  })
  .default({
    type: "none",
    packages: [],
    sharedPackages: [],
  });

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

  // Detect additional features
  const hasI18n = await fs.pathExists(path.join(cwd, "src/app/[locale]"));
  const hasPrisma = await fs.pathExists(path.join(cwd, "prisma/schema.prisma"));
  const hasDrizzle = await fs.pathExists(path.join(cwd, "drizzle.config.ts"));
  const hasNextAuth = await fs.pathExists(
    path.join(cwd, "src/app/api/auth/[...nextauth]"),
  );
  const hasClerk = packageJson.dependencies?.["@clerk/nextjs"];

  // Configure features
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

  // Configure preferred libraries
  if (!rules.preferredLibraries) {
    rules.preferredLibraries = {};
  }

  // Set database preference based on project type
  if (projectType === "nextjs") {
    rules.preferredLibraries.database = "prisma";
  } else {
    rules.preferredLibraries.database = "drizzle";
  }

  // Set auth preference based on project type
  if (projectType === "nextjs") {
    rules.preferredLibraries.authentication = "next-auth";
  } else {
    rules.preferredLibraries.authentication = "clerk";
  }

  return rules;
}

export async function getDefaultReliverseConfig(
  cwd: string,
  projectName: string,
  projectAuthor: string,
  projectFramework = "nextjs",
): Promise<ReliverseConfig> {
  const biomeConfig = await getBiomeConfig(cwd);
  const detectedPkgManager = await detect();

  // Read package.json
  let packageData: PackageJson = { name: projectName, author: projectAuthor };

  try {
    packageData = await readPackageJSON();
  } catch {
    // Use default values if package.json doesn't exist
  }

  return {
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
    projectPackageManager: detectedPkgManager,
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
  };
}

export const reliverseConfigSchema: z.ZodType<ReliverseConfig> = z.object({
  // Project details
  projectName: z.string().min(1),
  projectAuthor: z.string().min(1),
  projectDescription: z.string().default(""),
  projectVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+/)
    .default("0.1.0"),
  projectLicense: z.string().default("MIT"),
  projectRepository: z.string().url().optional(),
  projectDeployService: z.enum(["vercel", "netlify", "railway"]).optional(),
  projectDomain: z.string().url().optional(),

  // Project features
  features: featuresSchema.default({}),

  // Development preferences
  projectFramework: z.string().default("nextjs"),
  projectPackageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).default("bun"),
  projectFrameworkVersion: z.string().optional(),
  nodeVersion: z.string().optional(),
  runtime: z.string().optional(),
  monorepo: monorepoSchema,
  preferredLibraries: z.record(z.string()).default({}),
  codeStyle: codeStyleSchema,

  // Dependencies management
  ignoreDependencies: z.array(z.string()).default([]),

  // Custom rules
  customRules: z.record(z.unknown()).default({}),

  // Generation preferences
  skipPromptsUseAutoBehavior: z.boolean().default(false),
  deployBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  depsBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  gitBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  i18nBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  scriptsBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
});

// Types for comment sections
type CommentSections = Partial<Record<keyof ReliverseConfig, string[]>>;

/**
 * Safely writes config to file with backup and atomic operations
 */
export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
): Promise<void> {
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    // Validate config before writing
    const validationResult = reliverseConfigSchema.safeParse(config);
    if (!validationResult.success) {
      throw new Error(
        `Invalid config: ${validationResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      );
    }

    // Helper function to create comment
    const c = (text: string) => `// ${text}`;

    // Define comment sections with only essential comments
    const commentSections: CommentSections = {
      skipPromptsUseAutoBehavior: [
        c("Do you want autoYes/autoNo below?"),
        c("Set to true to activate auto-answering."),
        c("This is to ensure there is no unexpected behavior."),
      ],
      features: [c("Project capabilities")],
      projectFramework: [c("Tech stack of your project")],
      codeStyle: [c("Code style preferences")],
      ignoreDependencies: [c("Cleaner codemod will ignore these deps")],
      customRules: [c("Custom rules for Reliverse AI")],
      deployBehavior: [c("Prompts behavior (prompt | autoYes | autoNo)")],
    };

    // Format with 2 spaces indentation
    let content = JSON.stringify(validationResult.data, null, 2);

    // Add section comments
    Object.entries(commentSections).forEach(([section, comments]) => {
      // Add section title with proper spacing
      content = content.replace(
        `"${section}":`,
        `${comments}\n  "${section}":`,
      );

      const formattedComments = (Array.isArray(comments) ? comments : [])
        .map(
          (comment: string, index: number, array: string[]) =>
            index === array.length - 1
              ? `    ${comment}` // Last comment
              : `    ${comment}\n`, // Other comments
        )
        .join("");
      content = content.replace(
        new RegExp(`(\\s+)"${section}":`, "g"),
        `\n\n${formattedComments}\n    "${section}":`,
      );
    });

    // Clean up multiple empty lines and ensure final newline
    content = `${content
      .replace(/\n{3,}/g, "\n\n") // Replace 3 or more newlines with 2
      .replace(/{\n\n/g, "{\n") // Remove double newline after opening brace
      .replace(/\n\n}/g, "\n}") // Remove double newline before closing brace
      .trim()}\n`; // Ensure single newline at end

    // Create backup if file exists
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    // Write to temp file first
    await fs.writeFile(tempPath, content);

    // Atomically rename temp file to actual file
    await fs.rename(tempPath, configPath);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success-verbose", "Config written successfully");
  } catch (error) {
    // Restore from backup if write failed
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      await fs.copy(backupPath, configPath);
      relinka("warn", "Restored config from backup after failed write");
    }

    // Clean up temp file
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }

    throw error;
  }
}

/**
 * Safely reads and validates config from file
 */
export async function readReliverseConfig(
  projectName: string,
  configPath: string,
  cwd: string,
): Promise<ReliverseConfig | null> {
  const backupPath = configPath + BACKUP_EXTENSION;

  try {
    // Try reading main file
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, "utf-8");

      // Handle empty file or just {}
      if (!content.trim() || content.trim() === "{}") {
        const defaultConfig = await getDefaultReliverseConfig(
          cwd,
          projectName,
          "user",
        );
        await writeReliverseConfig(configPath, defaultConfig);
        return defaultConfig;
      }

      const parsed = destr(content);
      if (!parsed || typeof parsed !== "object") {
        const defaultConfig = await getDefaultReliverseConfig(
          cwd,
          path.basename(configPath),
          "user",
        );
        await writeReliverseConfig(configPath, defaultConfig);
        return defaultConfig;
      }

      // Validate parsed content
      const validationResult = reliverseConfigSchema.safeParse(parsed);
      if (validationResult.success) {
        // If config is valid, return it as is without any merging
        return validationResult.data;
      }

      // Only merge if there are missing required fields
      const missingFields = validationResult.error.errors.some(
        (e) => e.code === "invalid_type" && e.received === "undefined",
      );

      if (!missingFields) {
        // If errors are not about missing fields, return null to trigger backup/default
        relinka(
          "warn",
          `Invalid config format: ${validationResult.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`,
        );
        return null;
      }

      // If we have missing fields, merge with defaults
      const defaultConfig = await getDefaultReliverseConfig(
        cwd,
        path.basename(configPath),
        "user",
      );

      // Deep merge existing values with defaults
      const mergedConfig: ReliverseConfig = {
        ...defaultConfig,
        ...(parsed as Partial<ReliverseConfig>),
        features: {
          ...defaultConfig?.features,
          ...(parsed as Partial<ReliverseConfig>)?.features,
        },
        codeStyle: {
          ...defaultConfig?.codeStyle,
          ...(parsed as Partial<ReliverseConfig>)?.codeStyle,
        },
        preferredLibraries: {
          ...defaultConfig?.preferredLibraries,
          ...(parsed as Partial<ReliverseConfig>)?.preferredLibraries,
        },
        customRules: {
          ...defaultConfig?.customRules,
          ...(parsed as Partial<ReliverseConfig>)?.customRules,
        },
      };

      // Validate merged config
      const mergedValidation = reliverseConfigSchema.safeParse(mergedConfig);
      if (mergedValidation.success) {
        await writeReliverseConfig(configPath, mergedValidation.data);
        relinka(
          "info",
          "Updated config with missing fields while preserving existing values",
        );
        return mergedValidation.data;
      }

      // If merged config is invalid, warn and try backup
      relinka(
        "warn",
        `Invalid config format: ${validationResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      );
    }

    // Try reading backup if main file is invalid or missing
    if (await fs.pathExists(backupPath)) {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      const parsed = destr(backupContent);

      const validationResult = reliverseConfigSchema.safeParse(parsed);
      if (validationResult.success) {
        // Restore from backup
        await fs.copy(backupPath, configPath);
        relinka("info", "Restored config from backup");
        return validationResult.data;
      }
    }

    // If no valid config found, create default
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
 * Safely updates specific fields in the config
 */
export async function updateReliverseConfig(
  projectName: string,
  configPath: string,
  updates: Partial<ReliverseConfig>,
  cwd: string,
): Promise<boolean> {
  try {
    const currentConfig = await readReliverseConfig(
      projectName,
      configPath,
      cwd,
    );
    if (!currentConfig) {
      return false;
    }

    const updatedConfig = {
      ...currentConfig,
      ...updates,
    };

    await writeReliverseConfig(configPath, updatedConfig);
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

const DEFAULT_MONOREPO = {
  type: "none" as const,
  packages: [],
  sharedPackages: [],
};

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

function mergeWithDefaults(
  partialConfig: Partial<ReliverseConfig>,
): ReliverseConfig {
  return {
    ...DEFAULT_CONFIG,
    ...partialConfig,
    codeStyle: {
      ...DEFAULT_CONFIG.codeStyle,
      ...(partialConfig.codeStyle ?? {}),
    },
    features: {
      ...DEFAULT_CONFIG.features,
      ...(partialConfig.features ?? {}),
    },
    preferredLibraries: {
      ...DEFAULT_CONFIG.preferredLibraries,
      ...(partialConfig.preferredLibraries ?? {}),
    },
    monorepo: {
      type: (partialConfig.monorepo?.type ?? DEFAULT_MONOREPO.type) as
        | "none"
        | "turborepo"
        | "nx"
        | "pnpm",
      packages: partialConfig.monorepo?.packages ?? DEFAULT_MONOREPO.packages,
      sharedPackages:
        partialConfig.monorepo?.sharedPackages ??
        DEFAULT_MONOREPO.sharedPackages,
    },
  };
}

async function parseAndFixConfig(
  projectName: string,
  configPath: string,
  cwd: string,
): Promise<ReliverseConfig | null> {
  const rawConfig = await fs.readFile(configPath, "utf-8");

  try {
    const parsedConfig = parseJSONC(rawConfig);
    if (parsedConfig && typeof parsedConfig === "object") {
      const updatedConfig = mergeWithDefaults(
        parsedConfig as Partial<ReliverseConfig>,
      );
      const success = await updateReliverseConfig(
        projectName,
        configPath,
        updatedConfig,
        cwd,
      );

      if (success) {
        relinka("info", "Fixed .reliverse configuration.");
        return await readReliverseConfig(projectName, configPath, cwd);
      }
    }
  } catch (parseError) {
    relinka(
      "warn",
      "Failed to parse .reliverse config:",
      parseError instanceof Error ? parseError.message : String(parseError),
    );
  }

  return null;
}

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

  return await readReliverseConfig(projectName, configPath, cwd);
}

export async function verifyReliverseConfig(
  cwd: string,
  configPath: string,
  githubUsername: string,
  projectName: string,
): Promise<ReliverseConfig | null> {
  try {
    // Try to read existing config
    let config = await readReliverseConfig(projectName, configPath, cwd);

    // If config is invalid, try to fix it
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

export function getReliverseConfigPath(cwd: string) {
  return path.join(cwd, ".reliverse");
}

export async function getReliverseConfig(
  cwd: string,
  projectName = "project",
  githubUsername = "user",
): Promise<ReliverseConfig> {
  try {
    const configPath = getReliverseConfigPath(cwd);
    await createReliverseConfig(cwd, githubUsername);

    const config = await verifyReliverseConfig(
      cwd,
      configPath,
      githubUsername,
      projectName,
    );
    if (!config) {
      throw new Error("Failed to create valid .reliverse configuration");
    }
    return config;
  } catch (error) {
    relinka(
      "error",
      "Failed to handle .reliverse config:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export async function parseCodeStyleFromConfigs(
  cwd: string,
): Promise<Partial<ReliverseConfig>> {
  const codeStyle: any = {};

  // Try to read Prettier config
  let prettierConfig: any = {};
  try {
    const prettierPath = path.join(cwd, ".prettierrc");
    if (await fs.pathExists(prettierPath)) {
      prettierConfig = safeDestr(await fs.readFile(prettierPath, "utf-8"));
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error parsing Prettier config:",
      error instanceof Error ? error.message : String(error),
    );
  }

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
        if (
          (compilerOptions.module as string)?.toLowerCase().includes("node")
        ) {
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

  return {
    codeStyle: {
      lineWidth: prettierConfig?.printWidth ?? 80,
      indentSize: prettierConfig?.tabWidth ?? 2,
      indentStyle: prettierConfig?.useTabs ? "tab" : "space",
      quoteMark: prettierConfig?.singleQuote ? "single" : "double",
      semicolons: prettierConfig?.semi ?? true,
      trailingComma: prettierConfig?.trailingComma ?? "all",
      bracketSpacing: prettierConfig?.bracketSpacing ?? true,
      arrowParens: prettierConfig?.arrowParens ?? "always",
      tabWidth: prettierConfig?.tabWidth ?? 2,
      jsToTs: false,
    },
  };
}

export async function revalidateReliverseJson(cwd: string, rulesPath: string) {
  // Read file content and continue with the rest of the function...
  const fileContent = await fs.readFile(rulesPath, "utf-8");
  const parsedContent = fileContent.trim()
    ? destr<Partial<ReliverseConfig>>(fileContent)
    : {};

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
    const mergedRules = {
      // Start with user's values
      ...parsedContent,

      // Only add defaults for missing fields
      projectName: parsedContent.projectName ?? defaultRules.projectName ?? "",
      projectAuthor:
        parsedContent.projectAuthor ?? defaultRules.projectAuthor ?? "",
      projectDescription:
        parsedContent.projectDescription ??
        defaultRules.projectDescription ??
        "",
      projectVersion:
        parsedContent.projectVersion ?? defaultRules.projectVersion ?? "0.1.0",
      projectLicense:
        parsedContent.projectLicense ?? defaultRules.projectLicense ?? "MIT",
      projectRepository:
        parsedContent.projectRepository ?? defaultRules.projectRepository ?? "",

      // Project features - only merge if missing
      features: {
        ...defaultRules.features,
        ...parsedContent.features,
      },

      // Development preferences - only set if missing
      projectFramework:
        parsedContent.projectFramework ?? defaultRules.projectFramework,
      projectPackageManager:
        parsedContent.projectPackageManager ??
        defaultRules.projectPackageManager,
      projectFrameworkVersion:
        parsedContent.projectFrameworkVersion ??
        defaultRules.projectFrameworkVersion,
      nodeVersion: parsedContent.nodeVersion ?? defaultRules.nodeVersion,
      runtime: parsedContent.runtime ?? defaultRules.runtime,
      monorepo: parsedContent.monorepo ?? defaultRules.monorepo,

      // Merge nested objects only if missing
      preferredLibraries: {
        ...defaultRules.preferredLibraries,
        ...parsedContent.preferredLibraries,
      },
      codeStyle: parsedContent.codeStyle
        ? {
            ...defaultRules.codeStyle,
            ...configRules?.codeStyle,
            ...parsedContent.codeStyle,
          }
        : undefined,

      // Generation preferences - only set if missing
      skipPromptsUseAutoBehavior:
        parsedContent.skipPromptsUseAutoBehavior ??
        defaultRules.skipPromptsUseAutoBehavior ??
        false,
      deployBehavior:
        parsedContent.deployBehavior ?? defaultRules.deployBehavior ?? "prompt",
      depsBehavior:
        parsedContent.depsBehavior ?? defaultRules.depsBehavior ?? "prompt",
      gitBehavior:
        parsedContent.gitBehavior ?? defaultRules.gitBehavior ?? "prompt",
      i18nBehavior:
        parsedContent.i18nBehavior ?? defaultRules.i18nBehavior ?? "prompt",
      scriptsBehavior:
        parsedContent.scriptsBehavior ??
        defaultRules.scriptsBehavior ??
        "prompt",

      // Dependencies management
      ignoreDependencies:
        parsedContent.ignoreDependencies ?? defaultRules.ignoreDependencies,

      // Custom rules
      customRules: {
        ...defaultRules.customRules,
        ...parsedContent.customRules,
      },
    };

    // Only write if there were missing fields or different values
    const currentContent = JSON.stringify(mergedRules);
    const originalContent = JSON.stringify(parsedContent);

    if (currentContent !== originalContent) {
      // Check for new fields in the default config
      const hasNewFields = Object.keys(defaultRules).some((key) => {
        const typedKey = key as keyof ReliverseConfig;
        return (
          !(typedKey in mergedRules) && defaultRules[typedKey] !== undefined
        );
      });

      // Check for new fields in the merged config
      const hasChangedFields = Object.keys(mergedRules).some((key) => {
        const typedKey = key as keyof ReliverseConfig;
        return (
          typedKey in defaultRules &&
          defaultRules[typedKey] !== mergedRules[typedKey]
        );
      });

      if (hasNewFields || hasChangedFields) {
        await writeReliverseConfig(cwd, mergedRules);
        relinka(
          "info",
          "Updated .reliverse with missing configurations. Please review and adjust as needed.",
        );
      }
    }
  }
}

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

async function detectFeatures(
  projectPath: string,
  packageJson: PackageJson | null,
  i18nShouldBeEnabled: boolean,
): Promise<ProjectFeatures> {
  const deps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  } as Record<string, string>;

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
    themeMode: "dark-light" as const,
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
  // Read and process package.json
  const packageJson = await getPackageJson(projectPath);

  // Get base rules with detected project info
  const rules = await getDefaultReliverseConfig(
    projectName,
    frontendUsername,
    packageJson?.type === "module" ? "nextjs" : "nextjs",
  );

  // Configure project details with package.json data when available
  rules.projectName = projectName;
  rules.projectAuthor = frontendUsername;
  rules.projectDescription =
    packageJson?.description ?? rules.projectDescription;
  rules.projectVersion = packageJson?.version ?? rules.projectVersion;
  rules.projectLicense = packageJson?.license ?? rules.projectLicense;
  rules.projectRepository = packageJson?.repository
    ? typeof packageJson.repository === "string"
      ? packageJson.repository
      : packageJson.repository.url
    : `https://github.com/${githubUsername}/${projectName}`;
  rules.projectDeployService = deployService;
  rules.projectDomain = primaryDomain
    ? `https://${primaryDomain}`
    : `https://${projectName}.vercel.app`;

  // Configure features based on detected capabilities
  rules.features = await detectFeatures(
    projectPath,
    packageJson,
    i18nShouldBeEnabled,
  );

  // Configure behavior preferences
  rules.gitBehavior = "prompt";
  rules.deployBehavior = "prompt";
  rules.depsBehavior = "prompt";
  rules.i18nBehavior = "prompt";
  rules.scriptsBehavior = "prompt";
  rules.skipPromptsUseAutoBehavior = false;

  // Configure code style preferences
  rules.codeStyle = {
    ...rules.codeStyle,
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

  // Write config file
  const configPath = path.join(projectPath, ".reliverse");

  // Read existing content if any
  let existingContent: ReliverseConfig | null = null;
  if (!overwrite && (await fs.pathExists(configPath))) {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      existingContent = destr<ReliverseConfig>(content);
    } catch {
      // Ignore read errors
    }
  }

  // Merge with existing content if any
  const configContent = {
    ...DEFAULT_CONFIG,
    ...existingContent,
    ...rules,
  };

  await writeReliverseConfig(projectPath, configContent);
}

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
      `Error processing ${projectPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

export async function detectProjectsWithReliverse(
  cwd: string,
): Promise<DetectedProject[]> {
  const detectedProjects: DetectedProject[] = [];

  // First check the root directory
  const rootProject = await detectProject(cwd);
  if (rootProject) {
    detectedProjects.push(rootProject);
  }

  // Then check subdirectories
  try {
    const items = await fs.readdir(cwd, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const projectPath = path.join(cwd, item.name);
        const project = await detectProject(projectPath);
        if (project) {
          detectedProjects.push(project);
        }
      }
    }
  } catch (error) {
    relinka(
      "warn",
      `Error reading directory ${cwd}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return detectedProjects;
}
