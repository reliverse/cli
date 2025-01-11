import type { Static, TSchema } from "@sinclair/typebox";
import type { PackageJson } from "pkg-types";

import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { parseJSONC } from "confbox";
import destr, { safeDestr } from "destr";
import { detect } from "detect-package-manager";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON } from "pkg-types";

import type { DeploymentService, ProjectTypeOptions } from "~/types.js";

import { getBiomeConfig } from "~/utils/configHandler.js";

import { relinka } from "./loggerRelinka.js";

/* ------------------------------------------------------------------
 * Types and Interfaces
 * ------------------------------------------------------------------ */

/**
 * CLI options for generating a Reliverse config.
 */
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

/**
 * Files used to detect a specific project type.
 */
export const PROJECT_TYPE_FILES: Record<ProjectTypeOptions, string[]> = {
  "": [],
  astro: ["astro.config.js", "astro.config.ts", "astro.config.mjs"],
  library: ["jsr.json", "jsr.jsonc"],
  nextjs: ["next.config.js", "next.config.ts", "next.config.mjs"],
  react: ["vite.config.js", "vite.config.ts", "react.config.js"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["vue.config.js", "vite.config.ts"],
};

/**
 * Tries to detect the project type by looking for known config files.
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

/* ------------------------------------------------------------------
 * TypeBox Schemas
 * ------------------------------------------------------------------ */

// 1) Features schema
const featuresSchema = Type.Object({
  i18n: Type.Boolean(),
  analytics: Type.Boolean(),
  themeMode: Type.Union([
    Type.Literal("light"),
    Type.Literal("dark"),
    Type.Literal("dark-light"),
  ]),
  authentication: Type.Boolean(),
  api: Type.Boolean(),
  database: Type.Boolean(),
  testing: Type.Boolean(),
  docker: Type.Boolean(),
  ci: Type.Boolean(),
  commands: Type.Array(Type.String()),
  webview: Type.Array(Type.String()),
  language: Type.Array(Type.String()),
  themes: Type.Array(Type.String()),
});

// 2) Code style schema
const codeStyleSchema = Type.Object({
  lineWidth: Type.Number(),
  indentSize: Type.Number(),
  indentStyle: Type.Union([Type.Literal("space"), Type.Literal("tab")]),
  quoteMark: Type.Union([Type.Literal("single"), Type.Literal("double")]),
  semicolons: Type.Boolean(),
  trailingComma: Type.Union([
    Type.Literal("none"),
    Type.Literal("es5"),
    Type.Literal("all"),
  ]),
  bracketSpacing: Type.Boolean(),
  arrowParens: Type.Union([Type.Literal("always"), Type.Literal("avoid")]),
  tabWidth: Type.Number(),
  jsToTs: Type.Boolean(),
  dontRemoveComments: Type.Boolean(),
  shouldAddComments: Type.Boolean(),
  typeOrInterface: Type.Union([
    Type.Literal("type"),
    Type.Literal("interface"),
    Type.Literal("mixed"),
  ]),
  importOrRequire: Type.Union([
    Type.Literal("import"),
    Type.Literal("require"),
    Type.Literal("mixed"),
  ]),
  cjsToEsm: Type.Boolean(),
  modernize: Type.Object({
    replaceFs: Type.Boolean(),
    replacePath: Type.Boolean(),
    replaceHttp: Type.Boolean(),
    replaceProcess: Type.Boolean(),
    replaceConsole: Type.Boolean(),
    replaceEvents: Type.Boolean(),
  }),
  importSymbol: Type.String(),
});

// 3) Monorepo schema
const monorepoSchema = Type.Object({
  type: Type.Union([
    Type.Literal("none"),
    Type.Literal("turborepo"),
    Type.Literal("nx"),
    Type.Literal("pnpm"),
  ]),
  packages: Type.Array(Type.String()),
  sharedPackages: Type.Array(Type.String()),
});

// 4) Full Reliverse config schema
export const reliverseConfigSchema = Type.Object({
  projectName: Type.String({ minLength: 1 }),
  projectAuthor: Type.String({ minLength: 1 }),
  projectDescription: Type.String(),
  projectVersion: Type.String(),
  projectLicense: Type.String(),

  projectRepository: Type.Optional(Type.String()),
  projectDomain: Type.Optional(Type.String()),

  projectDeployService: Type.Optional(
    Type.Union([
      Type.Literal("vercel"),
      Type.Literal("netlify"),
      Type.Literal("railway"),
      Type.Literal("deno"),
      Type.Literal("none"),
    ]),
  ),

  projectDisplayName: Type.Optional(Type.String()),
  projectType: Type.Optional(Type.String()),
  projectFramework: Type.String(),
  projectPackageManager: Type.Union([
    Type.Literal("npm"),
    Type.Literal("pnpm"),
    Type.Literal("yarn"),
    Type.Literal("bun"),
  ]),
  projectFrameworkVersion: Type.Optional(Type.String()),
  projectState: Type.Optional(Type.String()),
  projectCategory: Type.Optional(Type.String()),
  projectSubcategory: Type.Optional(Type.String()),
  projectTemplate: Type.Optional(
    Type.Union([
      Type.Literal("blefnk/relivator"),
      Type.Literal("blefnk/next-react-ts-src-minimal"),
      Type.Literal("blefnk/all-in-one-nextjs-template"),
      Type.Literal("blefnk/create-t3-app"),
      Type.Literal("blefnk/create-next-app"),
      Type.Literal("blefnk/astro-starlight-template"),
      Type.Literal("blefnk/versator"),
      Type.Literal("reliverse/template-browser-extension"),
      Type.Literal("microsoft/vscode-extension-samples"),
      Type.Literal("microsoft/vscode-extension-template"),
    ]),
  ),
  projectActivation: Type.Optional(
    Type.Union([Type.Literal("auto"), Type.Literal("manual")]),
  ),
  nodeVersion: Type.Optional(Type.String()),
  runtime: Type.Optional(Type.String()),
  deployUrl: Type.Optional(Type.String()),

  features: featuresSchema,
  preferredLibraries: Type.Record(Type.String(), Type.String()),
  codeStyle: codeStyleSchema,
  monorepo: monorepoSchema,
  ignoreDependencies: Type.Array(Type.String()),
  customRules: Type.Record(Type.String(), Type.Unknown()),

  skipPromptsUseAutoBehavior: Type.Boolean(),
  deployBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  depsBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  gitBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  i18nBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  scriptsBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),

  productionBranch: Type.Optional(Type.String()),
});

/**
 * The resulting TypeBox static type for the full Reliverse config.
 */
export type ReliverseConfig = Static<typeof reliverseConfigSchema>;

/* ------------------------------------------------------------------
 * Default + Merging Logic
 * ------------------------------------------------------------------ */

/**
 * Default Reliverse config object (starting template).
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

/**
 * Merges a partial config with defaults, preserving nested objects.
 */
function mergeWithDefaults(partial: Partial<ReliverseConfig>): ReliverseConfig {
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    features: {
      ...DEFAULT_CONFIG.features,
      ...(partial.features ?? {}),
    },
    codeStyle: {
      ...DEFAULT_CONFIG.codeStyle,
      ...(partial.codeStyle ?? {}),
      modernize: {
        ...DEFAULT_CONFIG.codeStyle.modernize,
        ...(partial.codeStyle?.modernize ?? {}),
      },
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
}

/* ------------------------------------------------------------------
 * fixLineByLine
 * ------------------------------------------------------------------ */

/**
 * Creates a *sub-schema* for a single property of an object, e.g.:
 * { projectPackageManager: Type.Union(...), ... } -> sub-schema for just that property.
 */
function createSinglePropertySchema(key: string, subSchema: TSchema): TSchema {
  return Type.Object({ [key]: subSchema } as Record<string, TSchema>, {
    additionalProperties: false,
    required: [key],
  });
}

/**
 * Fix a single property if it’s invalid (revert to default if needed).
 */
function fixSingleProperty(
  schema: TSchema,
  propName: string,
  userValue: unknown,
  defaultValue: unknown,
): unknown {
  const singlePropertySchema = createSinglePropertySchema(propName, schema);
  const testObject = { [propName]: userValue };

  const isValid = Value.Check(singlePropertySchema, testObject);
  return isValid ? userValue : defaultValue;
}

/**
 * Recursively fix each property in an object, falling back to defaults if invalid.
 */
export function fixLineByLine(
  userConfig: unknown,
  defaultConfig: unknown,
  schema: TSchema,
): unknown {
  const isObjectSchema =
    (schema as any).type === "object" && (schema as any).properties;

  // If schema is not an object or the user config is not an object, do a simple check.
  if (
    !isObjectSchema ||
    typeof userConfig !== "object" ||
    userConfig === null
  ) {
    // Validate once; if invalid, return default
    return Value.Check(schema, userConfig) ? userConfig : defaultConfig;
  }

  // For each property in the schema, validate/fix recursively
  const properties = (schema as any).properties as Record<string, TSchema>;
  const result: Record<string, unknown> = { ...((defaultConfig as any) ?? {}) };

  for (const propName of Object.keys(properties)) {
    const subSchema = properties[propName]!;
    if (!subSchema) continue;

    const userValue = (userConfig as any)[propName];
    const defaultValue = (defaultConfig as any)[propName];

    const isValidStructure = Value.Check(
      createSinglePropertySchema(propName, subSchema),
      { [propName]: userValue },
    );

    if (!isValidStructure) {
      result[propName] = defaultValue;
    } else if ((subSchema as any).type === "object") {
      // Recurse on nested objects
      result[propName] = fixLineByLine(userValue, defaultValue, subSchema);
    } else {
      // For simple types/unions, do a single property check
      result[propName] = fixSingleProperty(
        subSchema,
        propName,
        userValue,
        defaultValue,
      );
    }
  }

  return result;
}

/* ------------------------------------------------------------------
 * Comment Injection
 * ------------------------------------------------------------------ */

/**
 * Maps config keys to the lines of comments to inject above them.
 */
type CommentSections = Partial<Record<keyof ReliverseConfig, string[]>>;

/**
 * Inserts comment lines before specified keys in the JSON string.
 */
function injectSectionComments(fileContent: string): string {
  const comment = (text: string) => `// ${text}`;

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

  for (const [section, lines] of Object.entries(commentSections)) {
    if (!lines?.length) continue;
    const combinedComments = lines
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join("\n");

    // Insert the comments just before the property
    fileContent = fileContent.replace(
      new RegExp(`(\\s+)"${section}":`, "g"),
      `\n\n  ${combinedComments}\n  "${section}":`,
    );
  }

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
 * Config Read/Write (TypeBox)
 * ------------------------------------------------------------------ */

/**
 * Writes a ReliverseConfig to `.reliverse` with backup + atomic writes.
 * Will throw an error if validation fails.
 */
export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
): Promise<void> {
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    // Validate the config
    const valid = Value.Check(reliverseConfigSchema, config);
    if (!valid) {
      const issues = [...Value.Errors(reliverseConfigSchema, config)].map(
        (err) => `Path "${err.path}": ${err.message}`,
      );
      relinka("error", "Invalid .reliverse config:", issues.join("; "));
      throw new Error(`Invalid .reliverse config: ${issues.join("; ")}`);
    }

    // Convert to JSON + inject comments
    let fileContent = JSON.stringify(config, null, 2);
    fileContent = injectSectionComments(fileContent);

    // If original exists, back it up
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    // Atomic write: write to temp, then rename
    await fs.writeFile(tempPath, fileContent);
    await fs.rename(tempPath, configPath);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success-verbose", "Config written successfully");
  } catch (error) {
    // If write fails, restore backup if it exists
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
 * If repair or restore fails, returns null.
 */
export async function readReliverseConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  const backupPath = configPath + BACKUP_EXTENSION;

  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");
    if (!content.trim() || content.trim() === "{}") {
      return null;
    }

    const parsed = destr(content);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    // Validate the parsed config
    if (!Value.Check(reliverseConfigSchema, parsed)) {
      const errors = [...Value.Errors(reliverseConfigSchema, parsed)].map(
        (err) => `Path "${err.path}": ${err.message}`,
      );
      relinka(
        "warn",
        "Detected invalid fields in .reliverse:",
        errors.join("; "),
      );

      // Attempt partial fix if missing fields
      const hasMissingFields = errors.some((msg) => msg.includes("undefined"));
      if (hasMissingFields) {
        const merged = mergeWithDefaults(parsed as Partial<ReliverseConfig>);
        if (!Value.Check(reliverseConfigSchema, merged)) {
          const mergedErrs = [
            ...Value.Errors(reliverseConfigSchema, merged),
          ].map((err) => `Path "${err.path}": ${err.message}`);
          relinka(
            "warn",
            "Merged config is still invalid:",
            mergedErrs.join("; "),
          );

          // Attempt fallback to backup
          if (await fs.pathExists(backupPath)) {
            const backupContent = await fs.readFile(backupPath, "utf-8");
            const backupParsed = destr(backupContent);
            if (Value.Check(reliverseConfigSchema, backupParsed)) {
              await fs.copy(backupPath, configPath);
              relinka("info", "Restored config from backup");
              return backupParsed;
            }
            return null;
          }
          return null;
        } else {
          // Overwrite with the merged config
          await writeReliverseConfig(configPath, merged);
          relinka("info", "Merged missing fields into config");
          return merged;
        }
      }

      // If invalid for other reasons, fallback to backup
      if (await fs.pathExists(backupPath)) {
        const backupContent = await fs.readFile(backupPath, "utf-8");
        const backupParsed = destr(backupContent);
        if (Value.Check(reliverseConfigSchema, backupParsed)) {
          await fs.copy(backupPath, configPath);
          relinka("info", "Restored config from backup");
          return backupParsed;
        } else {
          relinka("warn", "Backup also invalid. Returning null.");
          return null;
        }
      }
      return null;
    }

    // Valid config
    return parsed;
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
 */
async function parseAndFixConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = parseJSONC(raw);

    if (parsed && typeof parsed === "object") {
      // Line-by-line fix
      const lineByLineFixed = fixLineByLine(
        parsed,
        DEFAULT_CONFIG,
        reliverseConfigSchema,
      );

      if (Value.Check(reliverseConfigSchema, lineByLineFixed)) {
        await writeReliverseConfig(configPath, lineByLineFixed);
        relinka(
          "info",
          "Fixed .reliverse configuration lines via parseAndFix (line-by-line).",
        );
        return lineByLineFixed;
      } else {
        const errs = [
          ...Value.Errors(reliverseConfigSchema, lineByLineFixed),
        ].map((err) => `Path "${err.path}": ${err.message}`);
        relinka(
          "warn",
          "Could not fix all lines with line-by-line approach:",
          errs.join("; "),
        );
        return null;
      }
    }
  } catch (error) {
    relinka(
      "warn",
      "Failed to parse/fix .reliverse line-by-line:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

/* ------------------------------------------------------------------
 * Generating a Default Config
 * ------------------------------------------------------------------ */

/**
 * Generates a new default Reliverse config using package.json info and Biome config.
 */
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
    // fallback to minimal package data
  }

  return {
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
}

/* ------------------------------------------------------------------
 * Safely reading package.json
 * ------------------------------------------------------------------ */
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
 * Project Detection & Additional Logic
 * ------------------------------------------------------------------ */

/**
 * Attempts to generate a default Reliverse config for a given project type.
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

  const rules = await getDefaultReliverseConfig(
    cwd,
    (packageJson.name as string) ?? path.basename(cwd),
    (packageJson.author as string) ?? "user",
    projectType,
  );

  // Additional feature detection
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

/**
 * Structure representing a detected project with `.reliverse` config.
 */
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

/**
 * Checks for key files/folders in a given project path.
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
 * Detects if a project at `projectPath` has a `.reliverse` config.
 */
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

/**
 * Recursively detect projects (root + subdirectories) that contain `.reliverse` configs.
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
 * Feature Detection
 * ------------------------------------------------------------------ */

/**
 * Detects features based on file existence, dependency usage, etc.
 */
export async function detectFeatures(
  projectPath: string,
  packageJson: PackageJson | null,
  i18nShouldBeEnabled: boolean,
): Promise<ProjectFeatures> {
  const deps = {
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

/**
 * Generates a `.reliverse` config based on user options and detected features.
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
  const packageJson = await getPackageJson(projectPath);

  // Base config
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

  // Adjust defaults
  baseRules.gitBehavior = "prompt";
  baseRules.deployBehavior = "prompt";
  baseRules.depsBehavior = "prompt";
  baseRules.i18nBehavior = "prompt";
  baseRules.scriptsBehavior = "prompt";
  baseRules.skipPromptsUseAutoBehavior = false;

  // Code style overrides
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

  // Merge with existing config if not overwriting
  const configPath = path.join(projectPath, ".reliverse");
  let existingContent: ReliverseConfig | null = null;
  if (!overwrite && (await fs.pathExists(configPath))) {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      existingContent = destr<ReliverseConfig>(content);
    } catch {
      // ignore and proceed
    }
  }

  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...existingContent,
    ...baseRules,
  };

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
 * The Core Logic: Handle or Verify `.reliverse`
 * ------------------------------------------------------------------ */

/**
 * Creates (or updates) and returns a `.reliverse` config,
 * never throwing an error if it cannot produce a valid config.
 * Returns a default fallback if reading fails or a partial fix is not possible.
 */
export async function handleReliverseConfig(
  cwd: string,
  githubUsername = "user",
): Promise<ReliverseConfig> {
  const configPath = path.join(cwd, ".reliverse");

  // 1) If missing => generate
  if (!(await fs.pathExists(configPath))) {
    await createReliverseConfig(cwd, githubUsername);
  } else {
    // 2) If empty => treat as missing
    const content = (await fs.readFile(configPath, "utf-8")).trim();
    if (!content || content === "{}") {
      await createReliverseConfig(cwd, githubUsername);
    } else {
      // 3) Attempt normal read
      const validConfig = await readReliverseConfig(configPath);
      if (!validConfig) {
        // 4) If invalid => parse & fix
        const fixed = await parseAndFixConfig(configPath);
        if (!fixed) {
          relinka(
            "warn",
            "Could not fix existing .reliverse config. Using fallback defaults.",
          );
        }
      }
    }
  }

  // 5) Finally, read again
  const final = await readReliverseConfig(configPath);
  if (!final) {
    relinka(
      "warn",
      "Returning fallback default config because .reliverse could not be validated.",
    );
    return { ...DEFAULT_CONFIG };
  }

  return final;
}
