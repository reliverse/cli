import type { TSchema } from "@sinclair/typebox";
import type { PackageJson } from "pkg-types";

import { relinka, confirmPrompt } from "@reliverse/prompts";
import { getUserPkgManager, isBunPM, runtimeInfo } from "@reliverse/runtime";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { parseJSONC } from "confbox";
import { safeDestr } from "destr";
import { execaCommand } from "execa";
import fs from "fs-extra";
import { jsonrepair } from "jsonrepair";
import MagicString from "magic-string";
import { pathToFileURL } from "node:url";
import path from "pathe";
import {
  readPackageJSON,
  readTSConfig,
  writePackageJSON,
  writeTSConfig,
} from "pkg-types";

import type { DeploymentService } from "~/types.js";

import { askReliverseConfigType } from "~/app/prompts/askReliverseConfigType.js";
import {
  reliverseConfigSchema,
  type ProjectFramework,
  type ReliverseConfig,
} from "~/libs/config/config-main.js";
import {
  DEFAULT_DOMAIN,
  UNKNOWN_VALUE,
  RELIVERSE_SCHEMA_URL,
  RELIVERSE_SCHEMA_DEV,
  cliName,
  cliDomainDocs,
  cliConfigJsonc,
  cliConfigTs,
  cliConfigJsoncTmp,
  cliConfigJsoncBak,
  cliConfigTsTmp,
  cliConfigTsBak,
  cliVersion,
  tsconfigJson,
} from "~/libs/sdk/constants.js";
import { getBiomeConfig } from "~/utils/configHandler.js";

/* ------------------------------------------------------------------
* Helper Function: Repair and Parse JSON
------------------------------------------------------------------ */

// Uses jsonrepair to fix broken JSON then parses it.
function repairAndParseJSON(raw: string): any {
  try {
    const repaired = jsonrepair(raw);
    return JSON.parse(repaired);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null;
  }
}

/* ------------------------------------------------------------------
* Constants
------------------------------------------------------------------ */

// Cache the result per project path so the prompt is only shown once.
const configPathCache = new Map<
  string,
  { configPath: string; isTS: boolean }
>();

/* ------------------------------------------------------------------
 * Helper Functions
 * ------------------------------------------------------------------
 */

/**
 * Returns the proper config file path and its type (TS or JSONC).
 * This function determines which config file to use based on existing files.
 * It does not contain UI prompts directly - those are delegated to a separate function.
 *
 * @param projectPath - Path to the project directory
 * @param skipPrompt - If true, will default to JSONC without prompting (optional)
 * @returns Object containing the config path and whether it's a TypeScript config
 */
export async function getReliverseConfigPath(
  projectPath: string,
  skipPrompt = false,
): Promise<{ configPath: string; isTS: boolean }> {
  // Check cache first to avoid redundant file system checks and prompts
  if (configPathCache.has(projectPath)) {
    return configPathCache.get(projectPath)!;
  }

  // Define paths for all possible config files
  const tsconfigPath = path.join(projectPath, tsconfigJson);
  const reliverseJsoncPath = path.join(projectPath, cliConfigJsonc);
  const reliverseTsPath = path.join(projectPath, cliConfigTs);

  // Check which files exist
  const tsconfigExists = await fs.pathExists(tsconfigPath);
  const reliverseJsoncExists = await fs.pathExists(reliverseJsoncPath);
  const reliverseTsExists = await fs.pathExists(reliverseTsPath);

  let result: { configPath: string; isTS: boolean };

  // Decision logic for which config file to use:

  // Case 1: TS config already exists - use it
  if (reliverseTsExists) {
    result = { configPath: reliverseTsPath, isTS: true };
  }
  // Case 2: Neither config exists but tsconfig.json is present - ask user (unless skipPrompt is true)
  else if (tsconfigExists && !reliverseJsoncExists && !skipPrompt) {
    const choice = await askReliverseConfigType();
    result =
      choice === "ts"
        ? { configPath: reliverseTsPath, isTS: true }
        : { configPath: reliverseJsoncPath, isTS: false };
  }
  // Case 3: Default to JSONC for all other cases
  else {
    result = { configPath: reliverseJsoncPath, isTS: false };
  }

  // Cache the result for this project
  configPathCache.set(projectPath, result);
  return result;
}

/**
 * Returns the backup and temporary file paths for a given config file.
 */
function getBackupAndTempPaths(configPath: string): {
  backupPath: string;
  tempPath: string;
} {
  const configDir = path.dirname(configPath);
  if (configPath.endsWith(".ts")) {
    return {
      backupPath: path.join(configDir, cliConfigTsBak),
      tempPath: path.join(configDir, cliConfigTsTmp),
    };
  }
  return {
    backupPath: path.join(configDir, cliConfigJsoncBak),
    tempPath: path.join(configDir, cliConfigJsoncTmp),
  };
}

/**
 * Helper to atomically write a file with backup and temporary file handling.
 */
async function atomicWriteFile(
  filePath: string,
  content: string,
  backupPath: string,
  tempPath: string,
): Promise<void> {
  if (await fs.pathExists(filePath)) {
    await fs.copy(filePath, backupPath);
  }
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, filePath);
  if (await fs.pathExists(backupPath)) {
    await fs.remove(backupPath);
  }
}

/* ------------------------------------------------------------------
 * Detecting Project Framework
 * ------------------------------------------------------------------
 */

export const PROJECT_FRAMEWORK_FILES: Record<ProjectFramework, string[]> = {
  unknown: [],
  "npm-jsr": ["jsr.json", "jsr.jsonc", "build.publish.ts"],
  astro: ["astro.config.js", "astro.config.ts", "astro.config.mjs"],
  nextjs: ["next.config.js", "next.config.ts", "next.config.mjs"],
  vite: ["vite.config.js", "vite.config.ts", "react.config.js"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
  vue: ["vue.config.js", "vite.config.ts"],
  wxt: ["wxt.config.js", "wxt.config.ts"],
  vscode: ["vscode.config.js", "vscode.config.ts"],
};

export async function detectProjectFramework(
  projectPath: string,
): Promise<ProjectFramework | null> {
  for (const [type, files] of Object.entries(PROJECT_FRAMEWORK_FILES)) {
    for (const file of files) {
      if (await fs.pathExists(path.join(projectPath, file))) {
        return type as ProjectFramework;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------
 * Update Project Config
 * ------------------------------------------------------------------
 */

/**
 * Deep merges two objects recursively while preserving nested structures.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const sourceValue = source[key];
    const targetValue = target[key];
    if (sourceValue !== undefined) {
      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

/**
 * Updates project configuration by merging new updates with the existing config.
 * Creates a backup before overwriting and attempts to restore from backup on error.
 */
export async function updateReliverseConfig(
  projectPath: string,
  updates: Partial<ReliverseConfig>,
  isDev: boolean,
): Promise<boolean> {
  const { configPath } = await getReliverseConfigPath(projectPath);
  const { backupPath, tempPath } = getBackupAndTempPaths(configPath);

  try {
    let existingConfig: ReliverseConfig = {} as ReliverseConfig;
    if (await fs.pathExists(configPath)) {
      const existingContent = await fs.readFile(configPath, "utf-8");
      const parsed = parseJSONC(existingContent);
      if (Value.Check(reliverseConfigSchema, parsed)) {
        existingConfig = parsed;
      } else {
        relinka("warn", "Invalid config schema, starting fresh");
      }
    }

    const mergedConfig = deepMerge(existingConfig, updates);
    if (!Value.Check(reliverseConfigSchema, mergedConfig)) {
      const issues = [...Value.Errors(reliverseConfigSchema, mergedConfig)].map(
        (err) => `Path "${err.path}": ${err.message}`,
      );
      relinka("error", "Invalid config after merge:", issues.join("; "));
      return false;
    }

    // Backup current config (if exists) and write merged config
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }
    await writeReliverseConfig(configPath, mergedConfig, isDev);
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }
    relinka("success", "Reliverse config updated successfully");
    return true;
  } catch (error) {
    relinka("error", "Failed to update config:", String(error));
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      try {
        await fs.copy(backupPath, configPath);
        relinka("warn", "Restored config from backup after failed update");
      } catch (restoreError) {
        relinka(
          "error",
          "Failed to restore config from backup:",
          String(restoreError),
        );
      }
    }
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }
    return false;
  }
}

/**
 * Migrates an external reliverse config file into the current project config.
 * Only migrates fields that exist in the current schema.
 */
export async function migrateReliverseConfig(
  externalReliverseFilePath: string,
  projectPath: string,
  isDev: boolean,
) {
  try {
    const content = await fs.readFile(externalReliverseFilePath, "utf-8");
    const parsed = parseJSONC(content);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSONC format in external config file");
    }

    const tempConfig = parsed as Partial<ReliverseConfig>;
    const migratedFields: string[] = [];
    const validConfig: Partial<Record<keyof ReliverseConfig, unknown>> = {};

    const keysToMigrate: (keyof ReliverseConfig)[] = [
      "projectDescription",
      "version",
      "projectLicense",
      "projectRepository",
      "projectCategory",
      "projectSubcategory",
      "projectFramework",
      "projectTemplate",
      "projectArchitecture",
      "deployBehavior",
      "depsBehavior",
      "gitBehavior",
      "i18nBehavior",
      "scriptsBehavior",
      "existingRepoBehavior",
      "repoPrivacy",
      "features",
      "preferredLibraries",
      "codeStyle",
      "monorepo",
      "ignoreDependencies",
      "customRules",
      "skipPromptsUseAutoBehavior",
    ];

    for (const key of keysToMigrate) {
      if (tempConfig[key] !== undefined) {
        validConfig[key] = tempConfig[key];
        migratedFields.push(String(key));
      }
    }

    const success = await updateReliverseConfig(
      projectPath,
      validConfig as Partial<ReliverseConfig>,
      isDev,
    );

    if (success) {
      relinka("success", "Successfully migrated config");
      relinka("success-verbose", "Migrated fields:", migratedFields.join(", "));
    }

    await fs.remove(externalReliverseFilePath);
  } catch (error) {
    relinka("warn", "Failed to migrate external config:", String(error));
  }
}

/* ------------------------------------------------------------------
 * Default Config and Merging Logic
 * ------------------------------------------------------------------
 */

export const DEFAULT_CONFIG: ReliverseConfig = {
  $schema: RELIVERSE_SCHEMA_URL,
  projectName: UNKNOWN_VALUE,
  projectAuthor: UNKNOWN_VALUE,
  projectDescription: UNKNOWN_VALUE,
  version: "0.1.0",
  projectLicense: "MIT",
  projectState: "creating",
  projectRepository: DEFAULT_DOMAIN,
  projectDomain: DEFAULT_DOMAIN,
  projectCategory: UNKNOWN_VALUE,
  projectSubcategory: UNKNOWN_VALUE,
  projectTemplate: UNKNOWN_VALUE,
  projectTemplateDate: UNKNOWN_VALUE,
  projectArchitecture: UNKNOWN_VALUE,
  repoPrivacy: UNKNOWN_VALUE,
  projectGitService: "github",
  projectDeployService: "vercel",
  repoBranch: "main",
  projectFramework: "nextjs",
  projectPackageManager: (await isBunPM()) ? "bun" : "npm",
  projectRuntime: runtimeInfo?.name || "node",
  preferredLibraries: {
    stateManagement: UNKNOWN_VALUE,
    formManagement: UNKNOWN_VALUE,
    styling: UNKNOWN_VALUE,
    uiComponents: UNKNOWN_VALUE,
    testing: UNKNOWN_VALUE,
    authentication: UNKNOWN_VALUE,
    databaseLibrary: UNKNOWN_VALUE,
    databaseProvider: UNKNOWN_VALUE,
    api: UNKNOWN_VALUE,
    linting: UNKNOWN_VALUE,
    formatting: UNKNOWN_VALUE,
    payment: UNKNOWN_VALUE,
    analytics: UNKNOWN_VALUE,
    monitoring: UNKNOWN_VALUE,
    logging: UNKNOWN_VALUE,
    forms: UNKNOWN_VALUE,
    notifications: UNKNOWN_VALUE,
    search: UNKNOWN_VALUE,
    uploads: UNKNOWN_VALUE,
    validation: UNKNOWN_VALUE,
    documentation: UNKNOWN_VALUE,
    icons: UNKNOWN_VALUE,
    mail: UNKNOWN_VALUE,
    cache: UNKNOWN_VALUE,
    storage: UNKNOWN_VALUE,
    cdn: UNKNOWN_VALUE,
    cms: UNKNOWN_VALUE,
    i18n: UNKNOWN_VALUE,
    seo: UNKNOWN_VALUE,
    motion: UNKNOWN_VALUE,
    charts: UNKNOWN_VALUE,
    dates: UNKNOWN_VALUE,
    markdown: UNKNOWN_VALUE,
    security: UNKNOWN_VALUE,
    routing: UNKNOWN_VALUE,
  },
  monorepo: {
    type: "none",
    packages: [],
    sharedPackages: [],
  },
  ignoreDependencies: [],
  customRules: {},
  features: {
    i18n: false,
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
  multipleRepoCloneMode: false,
  customUserFocusedRepos: [],
  customDevsFocusedRepos: [],
  hideRepoSuggestions: false,
  customReposOnNewProject: false,
  envComposerOpenBrowser: true,
  skipPromptsUseAutoBehavior: false,
  deployBehavior: "prompt",
  depsBehavior: "prompt",
  gitBehavior: "prompt",
  i18nBehavior: "prompt",
  scriptsBehavior: "prompt",
  existingRepoBehavior: "prompt",
};

/**
 * Merges a partial config with the default config.
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
 * Fixing Config Line-by-Line
 * ------------------------------------------------------------------
 */

/**
 * Creates a schema for a single property so that it can be validated in isolation.
 */
function createSinglePropertySchema(key: string, subSchema: TSchema): TSchema {
  return Type.Object({ [key]: subSchema } as Record<string, TSchema>, {
    additionalProperties: false,
    required: [key],
  });
}

/**
 * Validates a single property against its schema.
 */
function fixSingleProperty(
  schema: TSchema,
  propName: string,
  userValue: unknown,
  defaultValue: unknown,
): unknown {
  const singlePropertySchema = createSinglePropertySchema(propName, schema);
  const testObject = { [propName]: userValue };
  return Value.Check(singlePropertySchema, testObject)
    ? userValue
    : defaultValue;
}

/**
 * Recursively fixes each property in the object. Returns the fixed config and
 * an array of property paths that were changed.
 */
export function fixLineByLine(
  userConfig: unknown,
  defaultConfig: unknown,
  schema: TSchema,
): { fixedConfig: unknown; changedKeys: string[] } {
  const isObjectSchema =
    (schema as any).type === "object" && (schema as any).properties;

  if (
    !isObjectSchema ||
    typeof userConfig !== "object" ||
    userConfig === null
  ) {
    const isValid = Value.Check(schema, userConfig);
    return {
      fixedConfig: isValid ? userConfig : defaultConfig,
      changedKeys: isValid ? [] : ["<entire_object>"],
    };
  }

  const properties = (schema as any).properties as Record<string, TSchema>;
  const result: Record<string, unknown> = { ...((defaultConfig as any) ?? {}) };
  const changedKeys: string[] = [];
  const missingKeys: string[] = [];

  for (const propName of Object.keys(properties)) {
    const subSchema = properties[propName];
    const userValue = (userConfig as any)[propName];
    const defaultValue = (defaultConfig as any)[propName];

    if (userValue === undefined && !(propName in userConfig)) {
      missingKeys.push(propName);
      result[propName] = defaultValue;
      continue;
    }

    // Special handling for GitHub URL arrays
    if (
      propName === "customUserFocusedRepos" ||
      propName === "customDevsFocusedRepos"
    ) {
      if (Array.isArray(userValue)) {
        result[propName] = userValue.map((url) => cleanGitHubUrl(String(url)));
        continue;
      }
    }

    const isValidStructure = Value.Check(
      createSinglePropertySchema(propName, subSchema!),
      { [propName]: userValue },
    );
    if (!isValidStructure) {
      result[propName] = defaultValue;
      changedKeys.push(propName);
    } else if (
      subSchema &&
      typeof subSchema === "object" &&
      "type" in subSchema &&
      subSchema["type"] === "object"
    ) {
      const { fixedConfig, changedKeys: nestedChanges } = fixLineByLine(
        userValue,
        defaultValue,
        subSchema,
      );
      result[propName] = fixedConfig;
      if (nestedChanges.length > 0) {
        changedKeys.push(...nestedChanges.map((nc) => `${propName}.${nc}`));
      }
    } else {
      const originalValue = userValue;
      const validatedValue = fixSingleProperty(
        subSchema!,
        propName,
        userValue,
        defaultValue,
      );
      result[propName] = validatedValue;
      if (originalValue !== undefined && validatedValue !== originalValue) {
        changedKeys.push(propName);
      }
    }
  }

  if (missingKeys.length > 0) {
    relinka(
      "info-verbose",
      "Missing fields injected from default config:",
      missingKeys.join(", "),
    );
  }

  return { fixedConfig: result, changedKeys };
}

/* ------------------------------------------------------------------
 * Comment Injection
 * ------------------------------------------------------------------
 */

export function injectSectionComments(fileContent: string): string {
  const ms = new MagicString(fileContent);
  const comment = (text: string) => (text ? `// ${text}` : "");
  const commentSections: Partial<Record<keyof ReliverseConfig, string[]>> = {
    $schema: [
      comment(`RELIVERSE CONFIG (${cliDomainDocs})`),
      comment(`This config file is generated by ${cliName}`),
      comment("Restart the CLI to apply your config changes"),
    ],
    projectName: [comment("General project information")],
    skipPromptsUseAutoBehavior: [
      comment(
        "Enable auto-answering for prompts to skip manual confirmations.",
      ),
      comment("Make sure you have unknown values configured above."),
    ],
    features: [comment("Project features")],
    projectFramework: [comment("Primary tech stack/framework")],
    codeStyle: [comment("Code style preferences")],
    multipleRepoCloneMode: [comment("Settings for cloning an existing repo")],
    envComposerOpenBrowser: [
      comment(
        "Set to false to disable opening the browser during env composing",
      ),
    ],
    ignoreDependencies: [comment("List dependencies to exclude from checks")],
    customRules: [comment("Custom rules for Reliverse AI")],
    deployBehavior: [
      comment("Prompt behavior for deployment"),
      comment("Options: prompt | autoYes | autoNo"),
    ],
    existingRepoBehavior: [
      comment("Behavior for existing GitHub repos during project creation"),
      comment("Options: prompt | autoYes | autoYesSkipCommit | autoNo"),
    ],
  };

  // For each section, find matches in the original file content
  for (const [section, lines] of Object.entries(commentSections)) {
    if (!lines?.length) continue;
    const combinedComments = lines
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join("\n");
    const regex = new RegExp(
      `(\\s+)(["']?)${section.replace("$", "\\$")}(\\2):`,
      "g",
    );
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      const insertPos = match.index;
      // Insert a newline before the comment block
      const insertion = `\n\n  ${combinedComments}`;
      ms.prependLeft(insertPos, insertion);
    }
  }

  let result = ms.toString();
  result = result
    .replace(/\n{3,}/g, "\n\n")
    .replace(/{\n\n/g, "{\n")
    .replace(/\n\n}/g, "\n}");
  return result.trim().concat("\n");
}

/* ------------------------------------------------------------------
 * Config Read/Write (TypeBox)
 * ------------------------------------------------------------------
 */

type IterableError = Iterable<{
  schema: unknown;
  path: string;
  value: unknown;
  message: string;
}>;

/**
 * Parses the config file and validates it against the schema.
 * Returns both the parsed object and any errors (if present).
 */
async function parseReliverseFile(configPath: string): Promise<{
  parsed: unknown;
  errors: IterableError | null;
} | null> {
  try {
    const content = (await fs.readFile(configPath, "utf-8")).trim();
    if (!content || content === "{}") return null;
    let parsed = parseJSONC(content);
    if (!parsed || typeof parsed !== "object") {
      const repaired = repairAndParseJSON(content);
      if (!repaired) return null;
      parsed = repaired;
      relinka("info", "Config JSON was repaired.");
      relinka("info-verbose", "Used tool: jsonrepair.");
    }
    const isValid = Value.Check(reliverseConfigSchema, parsed);
    return isValid
      ? { parsed, errors: null }
      : { parsed, errors: Value.Errors(reliverseConfigSchema, parsed) };
  } catch {
    return null;
  }
}

// Checks if a key is a valid JavaScript identifier.
function isValidIdentifier(key: string): boolean {
  // Precompiled regex for performance.
  const identifierRegex = /^[A-Za-z_$][0-9A-Za-z_$]*$/;
  return identifierRegex.test(key);
}

// Recursively converts an object to a code string for an object literal.
function objectToCodeString(obj: any, indentLevel = 0): string {
  const indent = "  ".repeat(indentLevel);
  const indentNext = "  ".repeat(indentLevel + 1);

  if (obj === null) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const items = obj.map((item) => objectToCodeString(item, indentLevel + 1));
    return `[\n${items.map((item) => `${indentNext}${item}`).join(",\n")}\n${indent}]`;
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    const lines = keys.map((key) => {
      const formattedKey = isValidIdentifier(key) ? key : JSON.stringify(key);
      const valueStr = objectToCodeString(obj[key], indentLevel + 1);
      return `${indentNext}${formattedKey}: ${valueStr}`;
    });
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return String(obj);
}

// Updates tsconfig.json's "include" array to ensure "reliverse.ts" is present.
async function updateTsConfigInclude(projectPath: string): Promise<void> {
  const tsconfigPath = path.join(projectPath, tsconfigJson);
  if (!(await fs.pathExists(tsconfigPath))) return;
  try {
    const tsconfig = await readTSConfig(projectPath);
    tsconfig.include = Array.isArray(tsconfig.include) ? tsconfig.include : [];
    if (!tsconfig.include.includes(cliConfigTs)) {
      tsconfig.include.push(cliConfigTs);
      await writeTSConfig(tsconfigPath, tsconfig);
      relinka(
        "success-verbose",
        "Updated tsconfig.json to include reliverse.ts",
      );
    }
  } catch (err) {
    relinka(
      "warn",
      "Failed to update tsconfig.json:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// Adds a dependency to the package.json devDependencies.
async function addDevDependency(
  projectPath: string,
  depName: string,
  version: string,
): Promise<void> {
  const pkgJsonPath = path.join(projectPath, "package.json");
  try {
    const pkg = await readPackageJSON(projectPath);
    pkg.devDependencies = pkg.devDependencies || {};
    if (!pkg.devDependencies[depName]) {
      pkg.devDependencies[depName] = version;
      await writePackageJSON(pkgJsonPath, pkg);
      relinka(
        "success-verbose",
        `Added ${depName}@${version} to devDependencies`,
      );
    }
  } catch (err) {
    relinka(
      "error",
      "Failed to update package.json devDependencies:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Writes the given ReliverseConfig to the config file.
 * Uses an atomic write (via a temporary file) and creates a backup.
 */
export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
  isDev: boolean,
  skipInstallPrompt = false,
  customPathToTypes?: string,
): Promise<void> {
  if (configPath.endsWith(".ts")) {
    const { backupPath, tempPath } = getBackupAndTempPaths(configPath);
    try {
      // Backup if the config exists
      if (await fs.pathExists(configPath)) {
        await fs.copy(configPath, backupPath);
      }
      const objectLiteral = objectToCodeString(config, 0);
      const objectLiteralWithComments = injectSectionComments(objectLiteral);
      const isTestsRuntimeDir = path.dirname(configPath) === process.cwd();

      // Determine the import path - using customPathToTypes if provided
      let importPath: string;
      if (customPathToTypes) {
        importPath = customPathToTypes;
      } else {
        importPath = isDev
          ? isTestsRuntimeDir
            ? "../../src/libs/config/config-main.js"
            : "./src/libs/config/config-main.js"
          : "@reliverse/config";
      }

      // Create the TypeScript config file content with proper import statement
      // We are separating the import statement from the configuration
      const fileContent = `import { defineConfig } from "${importPath}";

export default defineConfig(${objectLiteralWithComments});
`;

      await atomicWriteFile(configPath, fileContent, backupPath, tempPath);
      // Update tsconfig.json to include "reliverse.ts"
      await updateTsConfigInclude(path.dirname(configPath));
      // Add "@reliverse/config" to devDependencies if !isDev
      if (!isDev && !skipInstallPrompt) {
        await addDevDependency(
          path.dirname(configPath),
          "@reliverse/config",
          cliVersion,
        );
        relinka("success-verbose", "TS config written successfully");

        const shouldRunInstall = await confirmPrompt({
          title: "Run `bun install` now to install '@reliverse/config'?",
          defaultValue: true,
        });
        if (shouldRunInstall) {
          await execaCommand("bun install", {
            cwd: path.dirname(configPath),
            stdio: "inherit",
          });
        } else {
          relinka(
            "success",
            "Please run `bun install` at your convenience, then use `reliverse cli` again to continue.",
          );
          process.exit(0);
        }
      } else {
        relinka("success-verbose", "TS config written successfully");
      }

      return;
    } catch (error) {
      relinka("error", "Failed to write TS config:", String(error));
      if (
        (await fs.pathExists(backupPath)) &&
        !(await fs.pathExists(configPath))
      ) {
        try {
          await fs.copy(backupPath, configPath);
          relinka("warn", "Restored TS config from backup after failed write");
        } catch (restoreError) {
          relinka(
            "error",
            "Failed to restore TS config from backup:",
            String(restoreError),
          );
        }
      }
      if (await fs.pathExists(tempPath)) {
        await fs.remove(tempPath);
      }
      throw error;
    }
  }

  // JSONC branch
  if (!Value.Check(reliverseConfigSchema, config)) {
    const issues = [...Value.Errors(reliverseConfigSchema, config)].map(
      (err) => `Path "${err.path}": ${err.message}`,
    );
    relinka("error", "Invalid config:", issues.join("; "));
    throw new Error(`Invalid config: ${issues.join("; ")}`);
  }
  let fileContent = JSON.stringify(config, null, 2);
  fileContent = injectSectionComments(fileContent);
  const { backupPath, tempPath } = getBackupAndTempPaths(configPath);
  if (await fs.pathExists(configPath)) {
    await fs.copy(configPath, backupPath);
  }
  await atomicWriteFile(configPath, fileContent, backupPath, tempPath);
  relinka("success-verbose", "Config written successfully");
}

/**
 * Helper for TS config reading.
 * Uses a query parameter to bust the module cache.
 */
export async function readReliverseConfigTs(
  configPath: string,
): Promise<ReliverseConfig | null> {
  try {
    const moduleUrl = `${pathToFileURL(configPath).href}?update=${Date.now()}`;
    const configModule = await import(moduleUrl);
    const config = configModule.default;
    if (Value.Check(reliverseConfigSchema, config)) {
      return config;
    } else {
      relinka("warn", "TS config does not match the schema.");
      return null;
    }
  } catch (error) {
    relinka(
      "error",
      "Failed to import TS config:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Reads and validates the config file.
 * If errors are detected, it attempts to merge missing or invalid fields with defaults.
 */
export async function readReliverseConfig(
  configPath: string,
  isDev: boolean,
): Promise<ReliverseConfig | null> {
  if (configPath.endsWith(".ts")) {
    return await readReliverseConfigTs(configPath);
  }
  if (!(await fs.pathExists(configPath))) return null;
  const { backupPath } = getBackupAndTempPaths(configPath);
  const parseResult = await parseReliverseFile(configPath);
  if (!parseResult) return null;
  if (!parseResult.errors) return parseResult.parsed as ReliverseConfig;

  const errors = [...parseResult.errors].map(
    (err) => `Path "${err.path}": ${err.message}`,
  );
  relinka(
    "warn-verbose",
    "Detected invalid fields in config:",
    errors.join("; "),
  );

  const merged = mergeWithDefaults(
    parseResult.parsed as Partial<ReliverseConfig>,
  );
  if (Value.Check(reliverseConfigSchema, merged)) {
    await writeReliverseConfig(configPath, merged, isDev);
    relinka("info", "Merged missing or invalid fields into config");
    return merged;
  } else {
    if (await fs.pathExists(backupPath)) {
      const backupResult = await parseReliverseFile(backupPath);
      if (backupResult && !backupResult.errors) {
        await fs.copy(backupPath, configPath);
        relinka("info", "Restored config from backup");
        return backupResult.parsed as ReliverseConfig;
      }
      relinka("warn", "Backup also invalid. Returning null.");
      return null;
    }
    return null;
  }
}

/* ------------------------------------------------------------------
 * parseAndFixConfig (Line-by-Line)
 * ------------------------------------------------------------------
 */

/**
 * Reads the config file, fixes invalid lines based on the schema,
 * writes back the fixed config, and returns the fixed config.
 */
async function parseAndFixConfig(
  configPath: string,
  isDev: boolean,
): Promise<ReliverseConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    let parsed = parseJSONC(raw);
    if (!parsed || typeof parsed !== "object") {
      const repaired = repairAndParseJSON(raw);
      if (repaired) {
        relinka("info", "Config JSON was repaired.");
        relinka("info-verbose", "Used tool: jsonrepair.");
      }
      parsed = repaired;
    }
    if (parsed && typeof parsed === "object") {
      const originalErrors = [...Value.Errors(reliverseConfigSchema, parsed)];
      if (originalErrors.length === 0) return parsed as ReliverseConfig;

      const { fixedConfig, changedKeys } = fixLineByLine(
        parsed,
        DEFAULT_CONFIG,
        reliverseConfigSchema,
      );
      if (Value.Check(reliverseConfigSchema, fixedConfig)) {
        await writeReliverseConfig(configPath, fixedConfig, isDev);
        const originalInvalidPaths = originalErrors.map((err) => err.path);
        relinka(
          "info",
          "Your config has been fixed. Please ensure it aligns with your project.",
          `Changed keys: ${changedKeys.join(", ") || "(none)"}`,
        );
        relinka(
          "info-verbose",
          `Originally invalid paths were: ${originalInvalidPaths.join(", ") || "(none)"}`,
        );
        return fixedConfig;
      } else {
        const newErrs = [
          ...Value.Errors(reliverseConfigSchema, fixedConfig),
        ].map((e) => `Path "${e.path}": ${e.message}`);
        relinka(
          "warn",
          "Could not fix all invalid config lines:",
          newErrs.join("; "),
        );
        return null;
      }
    }
  } catch (error) {
    relinka(
      "warn",
      "Failed to parse/fix config line-by-line:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

/* ------------------------------------------------------------------
 * Generating a Default Config and Merging with Detected Data
 * ------------------------------------------------------------------
 */

export async function getDefaultReliverseConfig(
  projectPath: string,
  isDev: boolean,
  projectName?: string,
  projectAuthor?: string,
): Promise<ReliverseConfig> {
  const packageJson = await getPackageJsonSafe(projectPath);
  const effectiveProjectName =
    packageJson?.name ?? projectName ?? UNKNOWN_VALUE;

  let effectiveAuthorName =
    typeof packageJson?.author === "object"
      ? (packageJson.author?.name ?? projectAuthor)
      : (packageJson?.author ?? projectAuthor ?? UNKNOWN_VALUE);

  if (effectiveAuthorName === "blefnk" && isDev) {
    effectiveAuthorName = "reliverse";
  }

  const biomeConfig = await getBiomeConfig(projectPath);
  const detectedPkgManager = await getUserPkgManager(projectPath);

  const packageJsonPath = path.join(projectPath, "package.json");
  let packageData: PackageJson = {
    name: effectiveProjectName,
    author: effectiveAuthorName,
  };

  if (await fs.pathExists(packageJsonPath)) {
    try {
      packageData = await readPackageJSON(projectPath);
    } catch {
      // fallback if reading fails
    }
  }

  const detectedProjectFramework = await detectProjectFramework(projectPath);

  return {
    ...DEFAULT_CONFIG,
    projectName: effectiveProjectName,
    projectAuthor: effectiveAuthorName,
    projectDescription: packageData.description ?? UNKNOWN_VALUE,
    version: packageData.version ?? "0.1.0",
    projectLicense: packageData.license ?? "MIT",
    projectState: "creating",
    projectRepository:
      typeof packageData.repository === "string"
        ? packageData.repository
        : (packageData.repository?.url ?? DEFAULT_DOMAIN),
    projectDomain:
      effectiveProjectName === cliName ? cliDomainDocs : DEFAULT_DOMAIN,
    projectGitService: "github",
    projectDeployService: "vercel",
    repoBranch: "main",
    projectFramework: detectedProjectFramework ?? UNKNOWN_VALUE,
    projectPackageManager: detectedPkgManager.packageManager,
    projectRuntime: runtimeInfo?.name || "node",
    codeStyle: {
      ...DEFAULT_CONFIG.codeStyle,
      lineWidth: biomeConfig?.lineWidth ?? 80,
      indentSize: biomeConfig?.indentWidth ?? 2,
      tabWidth: biomeConfig?.indentWidth ?? 2,
    },
  };
}

/* ------------------------------------------------------------------
 * Project Detection and Additional Logic
 * ------------------------------------------------------------------
 */

/**
 * Gets information about the project content, separating required and optional elements.
 *
 * @param projectPath - Path to the project directory
 * @returns Object containing required and optional content status
 */
export async function getProjectContent(projectPath: string): Promise<{
  requiredContent: {
    fileReliverse: boolean; // Whether reliverse config file exists
    filePackageJson: boolean; // Whether package.json exists
  };
  optionalContent: {
    dirNodeModules: boolean; // Whether node_modules directory exists
    dirGit: boolean; // Whether .git directory exists
  };
}> {
  // Check for reliverse config files
  const configJSONC = path.join(projectPath, cliConfigJsonc);
  const configTS = path.join(projectPath, cliConfigTs);
  const fileReliverse =
    (await fs.pathExists(configJSONC)) || (await fs.pathExists(configTS));

  // Check for package.json
  const filePackageJson = await fs.pathExists(
    path.join(projectPath, "package.json"),
  );

  // Check for node_modules directory
  const dirNodeModules = await fs.pathExists(
    path.join(projectPath, "node_modules"),
  );

  // Check for .git directory
  const dirGit = await fs.pathExists(path.join(projectPath, ".git"));

  return {
    requiredContent: { fileReliverse, filePackageJson },
    optionalContent: { dirNodeModules, dirGit },
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
 * Reliverse Config Creation (wrapper around config generator and fixer)
 * ------------------------------------------------------------------
 */

async function createReliverseConfig(
  projectPath: string,
  githubUsername: string,
  isDev: boolean,
): Promise<void> {
  const defaultRules = await generateDefaultRulesForProject(projectPath, isDev);
  const effectiveProjectName =
    defaultRules?.projectName ?? path.basename(projectPath);
  let effectiveAuthorName = defaultRules?.projectAuthor ?? UNKNOWN_VALUE;
  const effectiveDomain =
    defaultRules?.projectDomain ??
    (effectiveProjectName === cliName ? cliDomainDocs : DEFAULT_DOMAIN);

  if (effectiveAuthorName === "blefnk" && isDev) {
    effectiveAuthorName = "reliverse";
  }

  await generateReliverseConfig({
    projectName: effectiveProjectName,
    frontendUsername: effectiveAuthorName,
    deployService: "vercel",
    primaryDomain: effectiveDomain,
    projectPath,
    githubUsername,
    isDev,
  });

  relinka(
    "info-verbose",
    defaultRules
      ? "Created config based on detected project settings."
      : "Created initial config. Please review and adjust as needed.",
  );
}

/* ------------------------------------------------------------------
 * Clean GitHub URL
 * ------------------------------------------------------------------
 */

/**
 * Cleans GitHub repository URLs by removing git+ prefix and .git suffix.
 */
export function cleanGitHubUrl(url: string): string {
  return url
    .trim()
    .replace(/^git\+/, "")
    .replace(
      /^https?:\/\/(www\.)?(github|gitlab|bitbucket|sourcehut)\.com\//i,
      "",
    )
    .replace(/^(github|gitlab|bitbucket|sourcehut)\.com\//i, "")
    .replace(/\.git$/i, "");
}

/* ------------------------------------------------------------------
 * Generating Default Rules for Project
 * ------------------------------------------------------------------
 */

export async function generateDefaultRulesForProject(
  projectPath: string,
  isDev: boolean,
): Promise<ReliverseConfig | null> {
  const projectCategory = await detectProjectFramework(projectPath);

  const packageJsonPath = path.join(projectPath, "package.json");
  let packageJson: any = {};
  if (await fs.pathExists(packageJsonPath)) {
    try {
      packageJson = safeDestr(await fs.readFile(packageJsonPath, "utf-8"));
    } catch {
      // ignore errors
    }
  }
  const rules = await getDefaultReliverseConfig(projectPath, isDev);
  if (!projectCategory) {
    rules.features = {
      ...DEFAULT_CONFIG.features,
      language: ["typescript"],
      themes: ["default"],
    };
    rules.preferredLibraries = {
      ...DEFAULT_CONFIG.preferredLibraries,
      databaseLibrary: "drizzle",
      authentication: "better-auth",
    };
    return rules;
  }

  const deps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };

  // File-based detection
  const hasPrismaFile = await fs.pathExists(
    path.join(projectPath, "prisma/schema.prisma"),
  );
  const hasDrizzleFile = await fs.pathExists(
    path.join(projectPath, "drizzle.config.ts"),
  );
  const hasNextAuthDir = await fs.pathExists(
    path.join(projectPath, "src/app/api/auth/[...nextauth]"),
  );
  const hasBetterAuthFile = await fs.pathExists(
    path.join(projectPath, "src/app/api/auth/[...all]/route.ts"),
  );
  const hasShadcnUi = await fs.pathExists(
    path.join(projectPath, "components/ui"),
  );

  // Dependency-based detection
  const hasClerk = "@clerk/nextjs" in deps;
  const hasBetterAuth = "better-auth" in deps && hasBetterAuthFile;
  const hasAuth0 = "@auth0/nextjs-auth0" in deps;
  const hasSupabase = "@supabase/supabase-js" in deps;
  const hasPrisma = "@prisma/client" in deps || hasPrismaFile;
  const hasDrizzle = "drizzle-orm" in deps || hasDrizzleFile;

  // State management
  const hasZustand = "zustand" in deps;
  const hasJotai = "jotai" in deps;
  const hasRedux = "@reduxjs/toolkit" in deps || "redux" in deps;

  // Form libraries
  const hasReactHookForm = "react-hook-form" in deps;
  const hasFormik = "formik" in deps;

  // Styling libraries
  const hasTailwind = "tailwindcss" in deps;
  const hasStyledComponents = "styled-components" in deps;
  const hasCssModules =
    packageJson?.dependencies &&
    Object.keys(deps).some(
      (key) => key.includes("css-loader") || key.includes("css-modules"),
    );
  const hasSass = "sass" in deps || "node-sass" in deps;

  // UI libraries
  const _hasChakraUi = "@chakra-ui/react" in deps;
  const _hasMaterialUi = "@mui/material" in deps;

  // Testing
  const _hasBunTest =
    packageJson?.scripts &&
    Object.values(packageJson.scripts).some(
      (script) =>
        script && typeof script === "string" && script.includes("bun test"),
    );
  const _hasVitest = "vitest" in deps;
  const hasJest = "jest" in deps;
  const _hasPlaywright = "@playwright/test" in deps;
  const _hasCypress = "cypress" in deps;

  // API frameworks
  const hasHono = "hono" in deps;
  const hasTrpc = "@trpc/server" in deps;
  const hasGraphql = "graphql" in deps || "apollo-server" in deps;
  const hasRest =
    (await fs.pathExists(path.join(projectPath, "src/api"))) ||
    (await fs.pathExists(path.join(projectPath, "src/app/api")));

  // Database providers
  const hasPg = "pg" in deps || "@neondatabase/serverless" in deps;
  const hasMysql = "mysql" in deps || "mysql2" in deps;
  const hasSqlite =
    "sqlite" in deps || "sqlite3" in deps || "better-sqlite3" in deps;
  const hasMongo = "mongodb" in deps || "mongoose" in deps;

  // Other libraries to detect
  const hasZod = "zod" in deps;
  const hasTypebox = "@sinclair/typebox" in deps;
  const hasValibot = "valibot" in deps;

  // Features detection
  rules.features = await detectFeatures(projectPath, packageJson);

  // If no preferredLibraries object, create one
  if (!rules.preferredLibraries) {
    rules.preferredLibraries = { ...DEFAULT_CONFIG.preferredLibraries };
  }

  // Set specific libraries based on detection
  // Database
  if (hasPrisma) {
    rules.preferredLibraries.databaseLibrary = "prisma";
  } else if (hasDrizzle) {
    rules.preferredLibraries.databaseLibrary = "drizzle";
  } else if (hasSupabase) {
    rules.preferredLibraries.databaseLibrary = "supabase";
  }

  // Database provider
  if (hasPg) {
    rules.preferredLibraries.databaseProvider = "pg";
  } else if (hasMysql) {
    rules.preferredLibraries.databaseProvider = "mysql";
  } else if (hasSqlite) {
    rules.preferredLibraries.databaseProvider = "sqlite";
  } else if (hasMongo) {
    rules.preferredLibraries.databaseProvider = "mongodb";
  }

  // Authentication
  if (hasNextAuthDir) {
    rules.preferredLibraries.authentication = "next-auth";
  } else if (hasClerk) {
    rules.preferredLibraries.authentication = "clerk";
  } else if (hasBetterAuth) {
    rules.preferredLibraries.authentication = "better-auth";
  } else if (hasAuth0) {
    rules.preferredLibraries.authentication = "auth0";
  } else if (hasSupabase) {
    rules.preferredLibraries.authentication = "supabase-auth";
  }

  // State management
  if (hasZustand) {
    rules.preferredLibraries.stateManagement = "zustand";
  } else if (hasJotai) {
    rules.preferredLibraries.stateManagement = "jotai";
  } else if (hasRedux) {
    rules.preferredLibraries.stateManagement = "redux-toolkit";
  }

  // Form management
  if (hasReactHookForm) {
    rules.preferredLibraries.formManagement = "react-hook-form";
    rules.preferredLibraries.forms = "react-hook-form";
  } else if (hasFormik) {
    rules.preferredLibraries.formManagement = "formik";
  }

  // Styling
  if (hasTailwind) {
    rules.preferredLibraries.styling = "tailwind";
  } else if (hasStyledComponents) {
    rules.preferredLibraries.styling = "styled-components";
  } else if (hasCssModules) {
    rules.preferredLibraries.styling = "css-modules";
  } else if (hasSass) {
    rules.preferredLibraries.styling = "sass";
  }

  // UI components
  if (hasShadcnUi) {
    rules.preferredLibraries.uiComponents = "shadcn-ui";
  } else if (_hasChakraUi) {
    rules.preferredLibraries.uiComponents = "chakra-ui";
  } else if (_hasMaterialUi) {
    rules.preferredLibraries.uiComponents = "material-ui";
  }

  // Testing
  if (_hasBunTest) {
    rules.preferredLibraries.testing = "bun";
  } else if (_hasVitest) {
    rules.preferredLibraries.testing = "vitest";
  } else if (hasJest) {
    rules.preferredLibraries.testing = "jest";
  } else if (_hasPlaywright) {
    rules.preferredLibraries.testing = "playwright";
  } else if (_hasCypress) {
    rules.preferredLibraries.testing = "cypress";
  }

  // API
  if (hasHono) {
    rules.preferredLibraries.api = "hono";
  } else if (hasTrpc) {
    rules.preferredLibraries.api = "trpc";
  } else if (hasGraphql) {
    rules.preferredLibraries.api = "graphql";
  } else if (hasRest) {
    rules.preferredLibraries.api = "rest";
  }

  // Validation
  if (hasZod) {
    rules.preferredLibraries.validation = "zod";
  } else if (hasTypebox) {
    rules.preferredLibraries.validation = "typebox";
  } else if (hasValibot) {
    rules.preferredLibraries.validation = "valibot";
  }

  // Add more specific library detections for other categories

  return rules;
}

/* ------------------------------------------------------------------
 * Project Detection & Additional Logic
 * ------------------------------------------------------------------
 */

async function getPackageJson(
  projectPath: string,
): Promise<PackageJson | null> {
  try {
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(packageJsonPath))) return null;
    return await readPackageJSON(projectPath);
  } catch (error) {
    const packageJsonPath = path.join(projectPath, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      relinka(
        "warn",
        "Could not read package.json:",
        error instanceof Error ? error.message : String(error),
      );
    }
    return null;
  }
}

export async function getPackageJsonSafe(
  projectPath: string,
): Promise<PackageJson | null> {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) return null;
  return await readPackageJSON(projectPath);
}

export async function detectProject(
  projectPath: string,
  isDev: boolean,
): Promise<DetectedProject | null> {
  try {
    const { requiredContent, optionalContent } =
      await getProjectContent(projectPath);
    if (!requiredContent.fileReliverse || !requiredContent.filePackageJson)
      return null;
    const { configPath } = await getReliverseConfigPath(projectPath);
    if (!(await fs.pathExists(configPath))) return null;
    const config = await readReliverseConfig(configPath, isDev);
    if (!config) return null;
    return {
      name: path.basename(projectPath),
      path: projectPath,
      config,
      needsDepsInstall: !optionalContent.dirNodeModules,
      hasGit: optionalContent.dirGit,
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
  projectPath: string,
  isDev: boolean,
): Promise<DetectedProject[]> {
  const detected: DetectedProject[] = [];
  const rootProject = await detectProject(projectPath, isDev);
  if (rootProject) detected.push(rootProject);

  try {
    const items = await fs.readdir(projectPath, { withFileTypes: true });
    const subProjects = await Promise.all(
      items
        .filter((item) => item.isDirectory())
        .map(async (item) => {
          const effectiveProjectPath = path.join(projectPath, item.name);
          return await detectProject(effectiveProjectPath, isDev);
        }),
    );
    for (const project of subProjects) {
      if (project) detected.push(project);
    }
  } catch (error) {
    relinka(
      "warn",
      `Error reading directory ${projectPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return detected;
}

/* ------------------------------------------------------------------
 * Feature Detection
 * ------------------------------------------------------------------
 */

export async function detectFeatures(
  projectPath: string,
  packageJson: PackageJson | null,
): Promise<{
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
}> {
  const deps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };

  // Authentication libraries
  const hasNextAuth = "next-auth" in deps;
  const hasClerk = "@clerk/nextjs" in deps;
  const hasBetterAuth = "better-auth" in deps;
  const hasAuth0 = "@auth0/nextjs-auth0" in deps;

  // Database libraries
  const hasPrisma = "@prisma/client" in deps;
  const hasDrizzle = "drizzle-orm" in deps;
  const hasSupabase = "@supabase/supabase-js" in deps;
  const hasMongoose = "mongoose" in deps;

  // Database providers
  const hasPg = "pg" in deps || "@neondatabase/serverless" in deps;
  const hasMysql = "mysql" in deps || "mysql2" in deps;
  const hasSqlite =
    "sqlite" in deps || "sqlite3" in deps || "better-sqlite3" in deps;
  const hasMongo = "mongodb" in deps || "mongoose" in deps;

  // Analytics
  const hasVercelAnalytics = "@vercel/analytics" in deps;
  const hasSegmentAnalytics = "@segment/analytics-next" in deps;
  const hasGoogleAnalytics = "ga-4-react" in deps || "react-ga" in deps;
  const hasPlausible = "next-plausible" in deps;
  const hasFathom = "fathom-client" in deps;

  // State management
  const hasZustand = "zustand" in deps;
  const hasJotai = "jotai" in deps;
  const hasRedux = "@reduxjs/toolkit" in deps || "redux" in deps;

  // Form management
  const hasReactHookForm = "react-hook-form" in deps;
  const hasFormik = "formik" in deps;

  // Styling
  const hasTailwind = "tailwindcss" in deps;
  const hasStyledComponents = "styled-components" in deps;
  const hasCssModules =
    packageJson?.dependencies &&
    Object.keys(deps).some(
      (key) => key.includes("css-loader") || key.includes("css-modules"),
    );
  const hasSass = "sass" in deps || "node-sass" in deps;

  // UI Components
  const hasShadcnUi = await fs.pathExists(
    path.join(projectPath, "components/ui"),
  );
  const hasChakraUi = "@chakra-ui/react" in deps;
  const hasMaterialUi = "@mui/material" in deps;

  // Testing
  const hasBunTest =
    packageJson?.scripts &&
    Object.values(packageJson.scripts).some(
      (script) =>
        script && typeof script === "string" && script.includes("bun test"),
    );
  const hasVitest = "vitest" in deps;
  const hasJest = "jest" in deps;
  const hasPlaywright = "@playwright/test" in deps;
  const hasCypress = "cypress" in deps;

  // API
  const hasHono = "hono" in deps;
  const hasTrpc = "@trpc/server" in deps;
  const hasGraphql = "graphql" in deps || "apollo-server" in deps;
  const hasRest =
    (await fs.pathExists(path.join(projectPath, "src/api"))) ||
    (await fs.pathExists(path.join(projectPath, "src/app/api")));

  // Linting and formatting
  const hasEslint = "eslint" in deps;
  const hasBiome = "@biomejs/biome" in deps;

  // Payments
  const hasStripe = "stripe" in deps || "@stripe/stripe-js" in deps;

  // Monitoring
  const hasSentry = "@sentry/nextjs" in deps || "@sentry/react" in deps;

  // Logging
  const hasAxiom = "next-axiom" in deps;

  // Notifications
  const hasSonner = "sonner" in deps;

  // Search
  const hasAlgolia = "algoliasearch" in deps || "react-instantsearch" in deps;

  // Uploads
  const hasUploadthing = "uploadthing" in deps;

  // Validation
  const hasZod = "zod" in deps;
  const hasTypebox = "@sinclair/typebox" in deps;
  const hasValibot = "valibot" in deps;

  // Documentation
  const hasStarlight = "@astrojs/starlight" in deps;
  const hasNextra = "nextra" in deps;

  // Icons
  const hasLucide = "lucide-react" in deps;

  // Mail
  const hasResend = "resend" in deps;

  // Cache
  const hasRedis = "redis" in deps || "@upstash/redis" in deps;

  // Storage & CDN
  const hasCloudflare =
    "cloudflare" in deps || "@cloudflare/workers-types" in deps;

  // CMS
  const hasContentlayer = "contentlayer" in deps;

  // i18n
  const hasNextIntl = "next-intl" in deps;
  const hasI18next = "i18next" in deps || "react-i18next" in deps;
  const hasRosetta = "rosetta" in deps;

  // SEO
  const hasNextSeo = "next-seo" in deps;

  // Motion
  const hasFramer = "framer-motion" in deps;

  // Charts
  const hasRecharts = "recharts" in deps;

  // Dates
  const hasDayjs = "dayjs" in deps;

  // Markdown
  const hasMdx = "mdx" in deps || "@next/mdx" in deps;

  // Project infra
  const hasDocker = await fs.pathExists(path.join(projectPath, "Dockerfile"));
  const hasCI =
    (await fs.pathExists(path.join(projectPath, ".github/workflows"))) ||
    (await fs.pathExists(path.join(projectPath, ".gitlab-ci.yml")));

  // Detect languages
  const languages: string[] = ["typescript"];
  if (
    "python" in deps ||
    (await fs.pathExists(path.join(projectPath, "requirements.txt")))
  ) {
    languages.push("python");
  }
  if (await fs.pathExists(path.join(projectPath, "go.mod"))) {
    languages.push("go");
  }
  if (await fs.pathExists(path.join(projectPath, "Cargo.toml"))) {
    languages.push("rust");
  }

  // Detect themes and libraries
  const themes: string[] = ["default"];
  if (hasTailwind) {
    themes.push("tailwind");
  }
  if (hasChakraUi) {
    themes.push("chakra");
  }
  if (hasMaterialUi) {
    themes.push("material");
  }
  if (hasStyledComponents) {
    themes.push("styled-components");
  }
  if (hasCssModules) {
    themes.push("css-modules");
  }
  if (hasSass) {
    themes.push("sass");
  }
  if (hasShadcnUi) {
    themes.push("shadcn");
  }

  // Detect state management
  if (hasZustand) {
    themes.push("zustand");
  }
  if (hasJotai) {
    themes.push("jotai");
  }
  if (hasRedux) {
    themes.push("redux");
  }

  // Detect form libraries
  if (hasReactHookForm) {
    themes.push("react-hook-form");
  }
  if (hasFormik) {
    themes.push("formik");
  }

  // Detect linting and formatting
  if (hasEslint) {
    themes.push("eslint");
  }
  if (hasBiome) {
    themes.push("biome");
  }

  // Detect payment providers
  if (hasStripe) {
    themes.push("stripe");
  }

  // Detect monitoring tools
  if (hasSentry) {
    themes.push("sentry");
  }

  // Detect logging
  if (hasAxiom) {
    themes.push("axiom");
  }

  // Detect notifications
  if (hasSonner) {
    themes.push("sonner");
  }

  // Detect search
  if (hasAlgolia) {
    themes.push("algolia");
  }

  // Detect upload providers
  if (hasUploadthing) {
    themes.push("uploadthing");
  }

  // Detect validation libraries
  if (hasZod) {
    themes.push("zod");
  }
  if (hasTypebox) {
    themes.push("typebox");
  }
  if (hasValibot) {
    themes.push("valibot");
  }

  // Detect documentation
  if (hasStarlight) {
    themes.push("starlight");
  }
  if (hasNextra) {
    themes.push("nextra");
  }

  // Detect icons
  if (hasLucide) {
    themes.push("lucide");
  }

  // Detect mail providers
  if (hasResend) {
    themes.push("resend");
  }

  // Detect cache providers
  if (hasRedis) {
    themes.push("redis");
  }

  // Detect CDN/Storage
  if (hasCloudflare) {
    themes.push("cloudflare");
  }

  // Detect CMS
  if (hasContentlayer) {
    themes.push("contentlayer");
  }

  // Detect SEO
  if (hasNextSeo) {
    themes.push("next-seo");
  }

  // Detect motion
  if (hasFramer) {
    themes.push("framer-motion");
  }

  // Detect charts
  if (hasRecharts) {
    themes.push("recharts");
  }

  // Detect date libraries
  if (hasDayjs) {
    themes.push("dayjs");
  }

  // Detect markdown
  if (hasMdx) {
    themes.push("mdx");
  }

  // Detect webview technologies
  const webviews: string[] = [];
  if ("electron" in deps) {
    webviews.push("electron");
  }
  if ("tauri" in deps) {
    webviews.push("tauri");
  }
  if ("capacitor" in deps) {
    webviews.push("capacitor");
  }
  if ("react-native" in deps) {
    webviews.push("react-native");
  }

  // Detect custom commands from package.json
  const commands: string[] = [];
  if (packageJson?.scripts) {
    for (const [name, _script] of Object.entries(packageJson.scripts)) {
      if (
        name !== "start" &&
        name !== "build" &&
        name !== "dev" &&
        name !== "test"
      ) {
        commands.push(name);
      }
    }
  }

  // Detect testing frameworks
  const hasTestingFramework = !!(
    hasJest ||
    hasVitest ||
    hasPlaywright ||
    hasCypress ||
    hasBunTest
  );

  // Return the features object
  return {
    i18n: hasNextIntl || hasI18next || hasRosetta,
    analytics:
      hasVercelAnalytics ||
      hasSegmentAnalytics ||
      hasGoogleAnalytics ||
      hasPlausible ||
      hasFathom,
    themeMode: "dark-light",
    authentication:
      hasNextAuth || hasClerk || hasBetterAuth || hasAuth0 || hasSupabase,
    api: hasHono || hasTrpc || hasGraphql || hasRest,
    database:
      hasPrisma ||
      hasDrizzle ||
      hasSupabase ||
      hasMongoose ||
      hasPg ||
      hasMysql ||
      hasSqlite ||
      hasMongo,
    testing: hasTestingFramework,
    docker: hasDocker,
    ci: hasCI,
    commands: commands.slice(0, 10), // Limit to 10 commands to avoid overly large configs
    webview: webviews,
    language: languages,
    themes: themes.slice(0, 20), // Limit to 20 themes to avoid overly large configs
  };
}

/* ------------------------------------------------------------------
 * Creating or Updating a Config
 * ------------------------------------------------------------------
 */

export async function generateReliverseConfig({
  projectName,
  frontendUsername,
  deployService,
  primaryDomain,
  projectPath,
  githubUsername,
  enableI18n = false,
  overwrite = false,
  isDev,
  configInfo,
  customOutputPath,
  customFilename,
  skipInstallPrompt = false,
  customPathToTypes,
}: {
  projectName: string;
  frontendUsername: string;
  deployService: DeploymentService;
  primaryDomain: string;
  projectPath: string;
  githubUsername: string;
  enableI18n?: boolean;
  overwrite?: boolean;
  isDev: boolean;
  configInfo?: { configPath: string; isTS: boolean };
  customOutputPath?: string;
  customFilename?: string;
  skipInstallPrompt?: boolean;
  customPathToTypes?: string;
}): Promise<void> {
  const packageJson = await getPackageJson(projectPath);
  if (frontendUsername === "blefnk" && isDev) {
    frontendUsername = "reliverse";
  }
  const baseRules = await getDefaultReliverseConfig(
    projectPath,
    isDev,
    projectName,
    frontendUsername,
  );
  baseRules.projectName = projectName;
  baseRules.projectAuthor = frontendUsername;
  baseRules.projectDescription =
    packageJson?.description ?? baseRules.projectDescription ?? UNKNOWN_VALUE;
  baseRules.version = packageJson?.version ?? baseRules.version;
  baseRules.projectLicense = packageJson?.license ?? baseRules.projectLicense;

  const projectNameWithoutAt = projectName?.replace("@", "");
  baseRules.projectRepository = packageJson?.repository
    ? typeof packageJson.repository === "string"
      ? cleanGitHubUrl(packageJson.repository)
      : cleanGitHubUrl(packageJson.repository.url)
    : githubUsername && projectName
      ? `https://github.com/${projectNameWithoutAt}`
      : DEFAULT_DOMAIN;

  baseRules.projectGitService = "github";
  baseRules.projectDeployService = deployService;
  baseRules.projectDomain = primaryDomain
    ? `https://${primaryDomain.replace(/^https?:\/\//, "")}`
    : projectName
      ? `https://${projectName}.vercel.app`
      : UNKNOWN_VALUE;

  baseRules.features = await detectFeatures(projectPath, packageJson);
  baseRules.features.i18n = enableI18n ?? false;
  baseRules.multipleRepoCloneMode = false;
  baseRules.customUserFocusedRepos = [];
  baseRules.customDevsFocusedRepos = [];
  baseRules.hideRepoSuggestions = false;
  baseRules.customReposOnNewProject = false;
  baseRules.envComposerOpenBrowser = true;
  baseRules.gitBehavior = "prompt";
  baseRules.deployBehavior = "prompt";
  baseRules.depsBehavior = "prompt";
  baseRules.i18nBehavior = "prompt";
  baseRules.scriptsBehavior = "prompt";
  baseRules.skipPromptsUseAutoBehavior = false;
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

  // Determine where to write the config file
  let effectiveConfigPath: string;

  if (customOutputPath && customFilename) {
    // Use custom path and filename when provided
    effectiveConfigPath = path.join(customOutputPath, customFilename);
  } else {
    // Use standard path determination with skipPrompt parameter
    const configPathInfo =
      configInfo ??
      (await getReliverseConfigPath(projectPath, skipInstallPrompt));
    effectiveConfigPath = configPathInfo.configPath;
  }

  let existingContent: ReliverseConfig | null = null;
  if (!overwrite && (await fs.pathExists(effectiveConfigPath))) {
    try {
      existingContent = await readReliverseConfig(effectiveConfigPath, isDev);
    } catch {
      // fallback if reading fails
    }
  }
  const effectiveConfig = {
    ...DEFAULT_CONFIG,
    ...existingContent,
    ...baseRules,
  };
  if (isDev) {
    effectiveConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }
  await writeReliverseConfig(
    effectiveConfigPath,
    effectiveConfig,
    isDev,
    skipInstallPrompt,
    customPathToTypes,
  );
}

/* ------------------------------------------------------------------
 * The Core Logic: Handle or Verify Config + MULTI-CONFIG
 * ------------------------------------------------------------------
 */

export async function getReliverseConfig(
  projectPath: string,
  isDev: boolean,
): Promise<{ config: ReliverseConfig; multireli: ReliverseConfig[] }> {
  const githubUsername = UNKNOWN_VALUE;
  const multireliFolderPath = path.join(projectPath, "multireli");
  const results: ReliverseConfig[] = [];
  if (await fs.pathExists(multireliFolderPath)) {
    const dirItems = await fs.readdir(multireliFolderPath);
    const reliverseFiles = dirItems.filter(
      (item) => item === cliConfigJsonc || item === cliConfigTs,
    );
    const configs = await Promise.all(
      reliverseFiles.map(async (file) => {
        const filePath = path.join(multireliFolderPath, file);
        let config = await readReliverseConfig(filePath, isDev);
        if (!config) {
          config = await parseAndFixConfig(filePath, isDev);
        }
        if (!config) {
          relinka("warn", `Skipping invalid config file: ${filePath}`);
        }
        return config;
      }),
    );
    results.push(
      ...configs.filter((cfg): cfg is ReliverseConfig => cfg !== null),
    );
  }

  const { configPath } = await getReliverseConfigPath(projectPath);
  if (!(await fs.pathExists(configPath))) {
    await createReliverseConfig(projectPath, githubUsername, isDev);
  } else {
    const content = (await fs.readFile(configPath, "utf-8")).trim();
    if (!content || content === "{}") {
      await createReliverseConfig(projectPath, githubUsername, isDev);
    } else {
      const validConfig = await readReliverseConfig(configPath, isDev);
      if (!validConfig) {
        const fixed = await parseAndFixConfig(configPath, isDev);
        if (!fixed) {
          relinka(
            "warn",
            "Could not fix existing config. Using fallback defaults.",
          );
        }
      }
    }
  }
  const mainConfig = await readReliverseConfig(configPath, isDev);
  if (!mainConfig) {
    relinka(
      "warn",
      "Using fallback default config because the config could not be validated.",
    );
    return { config: { ...DEFAULT_CONFIG }, multireli: results };
  }
  if (isDev) {
    mainConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }
  return { config: mainConfig, multireli: results };
}
