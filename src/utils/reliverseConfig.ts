import type { TSchema } from "@sinclair/typebox";
import type { PackageJson } from "pkg-types";

import { relinka, selectPrompt, confirmPrompt } from "@reliverse/prompts";
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
} from "~/app/constants.js";
import { getBiomeConfig } from "~/utils/configHandler.js";
import {
  reliverseConfigSchema,
  type ProjectFramework,
  type ReliverseConfig,
} from "~/utils/libs/config/schemaConfig.js";

import { getCurrentWorkingDirectory } from "./terminalHelpers.js";

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
 */
export async function getReliverseConfigPath(
  projectPath: string,
): Promise<{ configPath: string; isTS: boolean }> {
  if (configPathCache.has(projectPath)) {
    return configPathCache.get(projectPath)!;
  }

  const tsconfigPath = path.join(projectPath, tsconfigJson);
  const reliverseJsoncPath = path.join(projectPath, cliConfigJsonc);
  const reliverseTsPath = path.join(projectPath, cliConfigTs);

  const tsconfigExists = await fs.pathExists(tsconfigPath);
  const reliverseJsoncExists = await fs.pathExists(reliverseJsoncPath);
  const reliverseTsExists = await fs.pathExists(reliverseTsPath);

  let result: { configPath: string; isTS: boolean };

  // If a TS config already exists, use it.
  if (reliverseTsExists) {
    result = { configPath: reliverseTsPath, isTS: true };
  }
  // If neither config exists and a tsconfig.json is present, prompt the user.
  else if (tsconfigExists && !reliverseJsoncExists) {
    const choice = await selectPrompt({
      title:
        "Please select a Reliverse CLI configuration file type. JSONC is recommended for most projects.",
      content:
        "A tsconfig.json file was detected. You can use the TypeScript config type for this project; however, it requires @reliverse/config to be installed; without it, the Reliverse CLI cannot run correctly when using the TS config type.",
      options: [
        { label: "JSONC (reliverse.jsonc)", value: "jsonc" },
        { label: "TypeScript (reliverse.ts)", value: "ts" },
      ],
      defaultValue: "jsonc",
    });
    result =
      choice === "ts"
        ? { configPath: reliverseTsPath, isTS: true }
        : { configPath: reliverseJsoncPath, isTS: false };
  } else {
    // Default to JSONC if nothing else applies.
    result = { configPath: reliverseJsoncPath, isTS: false };
  }

  // Cache the result for this project so subsequent calls don't prompt again.
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
 * Experimental Functions (not used yet)
 * ------------------------------------------------------------------
 */

/**
 * Attempts to re-read the reliverse config from the current working directory.
 * If the file is not valid, it attempts a line-by-line fix.
 */
export async function reReadReliverseConfig(
  isDev: boolean,
): Promise<ReliverseConfig | null> {
  const cwd = getCurrentWorkingDirectory();
  const { configPath } = await getReliverseConfigPath(cwd);

  // First try normal read
  let config = await readReliverseConfig(configPath, isDev);
  if (config) return config;

  // If not valid, attempt a line-by-line fix
  config = await parseAndFixConfig(configPath, isDev);
  return config;
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
  cwd: string,
): Promise<ProjectFramework | null> {
  for (const [type, files] of Object.entries(PROJECT_FRAMEWORK_FILES)) {
    for (const file of files) {
      if (await fs.pathExists(path.join(cwd, file))) {
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
  projectArchitecture: UNKNOWN_VALUE,
  repoPrivacy: UNKNOWN_VALUE,
  projectGitService: "github",
  projectDeployService: "vercel",
  repoBranch: "main",
  projectFramework: "nextjs",
  projectPackageManager: (await isBunPM()) ? "bun" : "npm",
  projectRuntime: runtimeInfo?.name || "node",
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

/**
 * Parses the config file and validates it against the schema.
 * Returns both the parsed object and any errors (if present).
 */
async function parseReliverseFile(configPath: string): Promise<{
  parsed: unknown;
  errors: Iterable<{
    schema: unknown;
    path: string;
    value: unknown;
    message: string;
  }> | null;
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
async function updateTsConfigInclude(projectDir: string): Promise<void> {
  const tsconfigPath = path.join(projectDir, tsconfigJson);
  if (!(await fs.pathExists(tsconfigPath))) return;
  try {
    const tsconfig = await readTSConfig(projectDir);
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
  projectDir: string,
  depName: string,
  version: string,
): Promise<void> {
  const pkgJsonPath = path.join(projectDir, "package.json");
  try {
    const pkg = await readPackageJSON(projectDir);
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
      const importPath = isDev
        ? isTestsRuntimeDir
          ? "../../src/utils/libs/config/schemaConfig.js"
          : "./src/utils/libs/config/schemaConfig.js"
        : "@reliverse/config";

      const fileContent = `import { defineConfig } from "${importPath}";

export default defineConfig(${objectLiteralWithComments});
`;

      await atomicWriteFile(configPath, fileContent, backupPath, tempPath);
      // Update tsconfig.json to include "reliverse.ts"
      await updateTsConfigInclude(path.dirname(configPath));
      // Add "@reliverse/config" to devDependencies if !isDev
      if (!isDev) {
        await addDevDependency(
          path.dirname(configPath),
          "@reliverse/config",
          cliVersion,
        );
      }
      relinka("success-verbose", "TS config written successfully");

      if (!isDev) {
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
          throw new Error(
            "Please run `bun install` at your convenience, then run `reliverse cli` again to continue.",
          );
        }
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
  cwd: string,
  isDev: boolean,
  projectName?: string,
  projectAuthor?: string,
): Promise<ReliverseConfig> {
  const packageJson = await getPackageJsonSafe(cwd);
  const effectiveProjectName =
    packageJson?.name ?? projectName ?? UNKNOWN_VALUE;

  let effectiveAuthorName =
    typeof packageJson?.author === "object"
      ? (packageJson.author?.name ?? projectAuthor)
      : (packageJson?.author ?? projectAuthor ?? UNKNOWN_VALUE);

  if (effectiveAuthorName === "blefnk" && isDev) {
    effectiveAuthorName = "reliverse";
  }

  const biomeConfig = await getBiomeConfig(cwd);
  const detectedPkgManager = await getUserPkgManager(cwd);

  const packageJsonPath = path.join(cwd, "package.json");
  let packageData: PackageJson = {
    name: effectiveProjectName,
    author: effectiveAuthorName,
  };

  if (await fs.pathExists(packageJsonPath)) {
    try {
      packageData = await readPackageJSON(cwd);
    } catch {
      // fallback if reading fails
    }
  }

  const detectedProjectFramework = await detectProjectFramework(cwd);

  return {
    ...DEFAULT_CONFIG,
    projectName: effectiveProjectName,
    projectAuthor: effectiveAuthorName,
    projectDescription: packageData.description ?? UNKNOWN_VALUE,
    version: packageData.version ?? "0.1.0",
    projectLicense: packageData.license ?? "MIT",
    projectRepository:
      typeof packageData.repository === "string"
        ? packageData.repository
        : (packageData.repository?.url ?? DEFAULT_DOMAIN),
    projectState: "creating",
    projectDomain:
      effectiveProjectName === cliName ? cliDomainDocs : DEFAULT_DOMAIN,
    projectGitService: "github",
    projectDeployService: "vercel",
    projectCategory: UNKNOWN_VALUE,
    projectSubcategory: UNKNOWN_VALUE,
    projectTemplate: UNKNOWN_VALUE,
    projectArchitecture: UNKNOWN_VALUE,
    repoPrivacy: UNKNOWN_VALUE,
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

async function checkProjectFiles(projectPath: string): Promise<{
  hasReliverse: boolean;
  hasPackageJson: boolean;
  hasNodeModules: boolean;
  hasGit: boolean;
}> {
  const configJSONC = path.join(projectPath, cliConfigJsonc);
  const configTS = path.join(projectPath, cliConfigTs);
  const hasReliverse =
    (await fs.pathExists(configJSONC)) || (await fs.pathExists(configTS));
  const [hasPackageJson, hasNodeModules, hasGit] = await Promise.all([
    fs.pathExists(path.join(projectPath, "package.json")),
    fs.pathExists(path.join(projectPath, "node_modules")),
    fs.pathExists(path.join(projectPath, ".git")),
  ]);
  return { hasReliverse, hasPackageJson, hasNodeModules, hasGit };
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
  cwd: string,
  githubUsername: string,
  isDev: boolean,
): Promise<void> {
  const defaultRules = await generateDefaultRulesForProject(cwd, isDev);
  const effectiveProjectName = defaultRules?.projectName ?? path.basename(cwd);
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
    projectPath: cwd,
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
 * Multi-config Reading from `reli` Folder
 * ------------------------------------------------------------------
 */

/**
 * Reads all reliverse config files (both JSONC and TS) in the `reli` folder,
 * parses and fixes them if needed. Returns an array of valid ReliverseConfigs.
 */
export async function readReliverseConfigsInReliFolder(
  cwd: string,
  isDev: boolean,
): Promise<ReliverseConfig[]> {
  const reliFolderPath = path.join(cwd, "reli");
  const results: ReliverseConfig[] = [];
  if (!(await fs.pathExists(reliFolderPath))) return results;
  const dirItems = await fs.readdir(reliFolderPath);
  const reliverseFiles = dirItems.filter(
    (item) => item === cliConfigJsonc || item === cliConfigTs,
  );

  const configs = await Promise.all(
    reliverseFiles.map(async (file) => {
      const filePath = path.join(reliFolderPath, file);
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
  return configs.filter((cfg): cfg is ReliverseConfig => cfg !== null);
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
  cwd: string,
  isDev: boolean,
): Promise<ReliverseConfig | null> {
  const projectCategory = await detectProjectFramework(cwd);
  const effectiveProjectCategory = projectCategory ?? "nextjs";

  const packageJsonPath = path.join(cwd, "package.json");
  let packageJson: any = {};
  if (await fs.pathExists(packageJsonPath)) {
    try {
      packageJson = safeDestr(await fs.readFile(packageJsonPath, "utf-8"));
    } catch {
      // ignore errors
    }
  }
  const rules = await getDefaultReliverseConfig(cwd, isDev);
  if (!projectCategory) {
    rules.features = {
      ...DEFAULT_CONFIG.features,
      language: ["typescript"],
      themes: ["default"],
    };
    rules.preferredLibraries = {
      ...DEFAULT_CONFIG.preferredLibraries,
      database: "drizzle",
      authentication: "clerk",
    };
    return rules;
  }

  const hasPrisma = await fs.pathExists(path.join(cwd, "prisma/schema.prisma"));
  const hasDrizzle = await fs.pathExists(path.join(cwd, "drizzle.config.ts"));
  const hasNextAuth = await fs.pathExists(
    path.join(cwd, "src/app/api/auth/[...nextauth]"),
  );
  const hasClerk = packageJson.dependencies?.["@clerk/nextjs"];

  rules.features = {
    ...rules.features,
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
  if (effectiveProjectCategory === "nextjs") {
    rules.preferredLibraries["database"] = "prisma";
    rules.preferredLibraries["authentication"] = "next-auth";
  } else {
    rules.preferredLibraries["database"] = "drizzle";
    rules.preferredLibraries["authentication"] = "clerk";
  }
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
  cwd: string,
): Promise<PackageJson | null> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) return null;
  return await readPackageJSON(cwd);
}

export async function detectProject(
  projectPath: string,
  isDev: boolean,
): Promise<DetectedProject | null> {
  try {
    const { hasReliverse, hasPackageJson, hasNodeModules, hasGit } =
      await checkProjectFiles(projectPath);
    if (!hasReliverse || !hasPackageJson) return null;
    const { configPath } = await getReliverseConfigPath(projectPath);
    if (!(await fs.pathExists(configPath))) return null;
    const config = await readReliverseConfig(configPath, isDev);
    if (!config) return null;
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
  isDev: boolean,
): Promise<DetectedProject[]> {
  const detected: DetectedProject[] = [];
  const rootProject = await detectProject(cwd, isDev);
  if (rootProject) detected.push(rootProject);

  try {
    const items = await fs.readdir(cwd, { withFileTypes: true });
    const subProjects = await Promise.all(
      items
        .filter((item) => item.isDirectory())
        .map(async (item) => {
          const projectPath = path.join(cwd, item.name);
          return await detectProject(projectPath, isDev);
        }),
    );
    for (const project of subProjects) {
      if (project) detected.push(project);
    }
  } catch (error) {
    relinka(
      "warn",
      `Error reading directory ${cwd}: ${error instanceof Error ? error.message : String(error)}`,
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

  const hasNextAuth = "next-auth" in deps;
  const hasClerk = "@clerk/nextjs" in deps;
  const hasPrisma = "@prisma/client" in deps;
  const hasDrizzle = "drizzle-orm" in deps;
  const hasAnalytics =
    "@vercel/analytics" in deps || "@segment/analytics-next" in deps;
  const hasDocker = await fs.pathExists(path.join(projectPath, "Dockerfile"));
  const hasCI =
    (await fs.pathExists(path.join(projectPath, ".github/workflows"))) ||
    (await fs.pathExists(path.join(projectPath, ".gitlab-ci.yml")));
  const hasTesting =
    "jest" in deps || "vitest" in deps || "@testing-library/react" in deps;

  return {
    i18n: false,
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

  const { configPath } =
    configInfo ?? (await getReliverseConfigPath(projectPath));
  let existingContent: ReliverseConfig | null = null;
  if (!overwrite && (await fs.pathExists(configPath))) {
    try {
      existingContent = await readReliverseConfig(configPath, isDev);
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
  await writeReliverseConfig(configPath, effectiveConfig, isDev);
}

/* ------------------------------------------------------------------
 * The Core Logic: Handle or Verify Config + MULTI-CONFIG
 * ------------------------------------------------------------------
 */

export async function getReliverseConfig(
  cwd: string,
  isDev: boolean,
): Promise<{ config: ReliverseConfig; reli: ReliverseConfig[] }> {
  const githubUsername = UNKNOWN_VALUE;
  const reliFolderPath = path.join(cwd, "reli");
  const results: ReliverseConfig[] = [];
  if (await fs.pathExists(reliFolderPath)) {
    const dirItems = await fs.readdir(reliFolderPath);
    const reliverseFiles = dirItems.filter(
      (item) => item === cliConfigJsonc || item === cliConfigTs,
    );
    const configs = await Promise.all(
      reliverseFiles.map(async (file) => {
        const filePath = path.join(reliFolderPath, file);
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

  const { configPath } = await getReliverseConfigPath(cwd);
  if (!(await fs.pathExists(configPath))) {
    await createReliverseConfig(cwd, githubUsername, isDev);
  } else {
    const content = (await fs.readFile(configPath, "utf-8")).trim();
    if (!content || content === "{}") {
      await createReliverseConfig(cwd, githubUsername, isDev);
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
    return { config: { ...DEFAULT_CONFIG }, reli: results };
  }
  if (isDev) {
    mainConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }
  return { config: mainConfig, reli: results };
}
