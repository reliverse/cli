import type { TSchema } from "@sinclair/typebox";
import type { PackageJson } from "pkg-types";

import { relinka } from "@reliverse/relinka";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { parseJSONC } from "confbox";
import destr, { safeDestr } from "destr";
import { detect } from "detect-package-manager";
import fs from "fs-extra";
import path from "pathe";
import { readPackageJSON } from "pkg-types";

import type { DeploymentService } from "~/types.js";

import {
  DEFAULT_DOMAIN,
  UNKNOWN_VALUE,
  RELIVERSE_SCHEMA_URL,
  RELIVERSE_SCHEMA_DEV,
  cliName,
  cliDomain,
} from "~/app/constants.js";
import { getBiomeConfig } from "~/utils/configHandler.js";

import {
  reliverseConfigSchema,
  type ProjectFramework,
  type ReliverseConfig,
} from "./schemaConfig.js";
import { getCurrentWorkingDirectory } from "./terminalHelpers.js";

/* ------------------------------------------------------------------
 * TypeScript Types
 * ------------------------------------------------------------------ */

export type GenerateReliverseConfigOptions = {
  projectName: string;
  cliUsername: string;
  deployService: DeploymentService;
  primaryDomain: string;
  projectPath: string;
  githubUsername: string;
  overwrite?: boolean;
  enableI18n?: boolean;
  isDev?: boolean;
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
 * Re-reading the .reliverse file
 * ------------------------------------------------------------------ */

export async function reReadReliverseConfig(): Promise<ReliverseConfig | null> {
  const cwd = getCurrentWorkingDirectory();
  const configPath = path.join(cwd, ".reliverse");

  // First try normal read
  let config = await readReliverseConfig(configPath);

  // If not valid, attempt line-by-line fix
  if (!config) {
    config = await parseAndFixConfig(configPath);
  }

  return config;
}

/* ------------------------------------------------------------------
 * Detecting Project Framework
 * ------------------------------------------------------------------ */

export const PROJECT_FRAMEWORK_FILES: Record<ProjectFramework, string[]> = {
  unknown: [],
  "npm-jsr": ["jsr.json", "jsr.jsonc"],
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
 * Update project config
 * ------------------------------------------------------------------ */

/**
 * Deep merges objects while preserving types and nested structures
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key in source) {
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
        result[key] = deepMerge(targetValue, sourceValue as any) as T[Extract<
          keyof T,
          string
        >];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

/**
 * Updates project configuration files with new values while preserving existing data
 */
export async function updateReliverseConfig(
  projectPath: string,
  updates: Partial<ReliverseConfig>,
): Promise<boolean> {
  const configPath = path.join(projectPath, ".reliverse");
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    let existingConfig: ReliverseConfig = {} as ReliverseConfig;
    let existingContent = "";

    // Read and validate existing config if it exists
    if (await fs.pathExists(configPath)) {
      existingContent = await fs.readFile(configPath, "utf-8");
      const parsed = parseJSONC(existingContent);
      if (Value.Check(reliverseConfigSchema, parsed)) {
        existingConfig = parsed;
      } else {
        relinka("warn", "Invalid .reliverse schema, starting fresh");
      }
    }

    // Merge updates with existing config
    const mergedConfig = deepMerge(existingConfig, updates);

    // Validate final config
    if (!Value.Check(reliverseConfigSchema, mergedConfig)) {
      const issues = [...Value.Errors(reliverseConfigSchema, mergedConfig)].map(
        (err) => `Path "${err.path}": ${err.message}`,
      );
      relinka(
        "error",
        "Invalid .reliverse config after merge:",
        issues.join("; "),
      );
      return false;
    }

    // Create backup if file exists
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    // Write to temp file first
    let fileContent = JSON.stringify(mergedConfig, null, 2);
    fileContent = injectSectionComments(fileContent);
    await fs.writeFile(tempPath, fileContent);

    // Rename temp to actual file
    await fs.rename(tempPath, configPath);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success", "Reliverse config updated successfully");
    return true;
  } catch (error) {
    // Restore from backup if write failed
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      await fs.copy(backupPath, configPath);
      relinka("warn", "Restored config from backup after failed update");
    }
    // Clean up temp file
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }
    relinka("error", "Failed to update .reliverse config:", String(error));
    return false;
  }
}

export async function migrateReliverseConfig(
  externalReliversePath: string,
  projectPath: string,
) {
  try {
    const content = await fs.readFile(externalReliversePath, "utf-8");
    const parsed = parseJSONC(content);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSONC format in temp.reliverse");
    }

    const tempConfig = parsed as Partial<ReliverseConfig>;
    const migratedFields: string[] = [];

    // Only migrate fields that match our schema
    const validConfig: Partial<ReliverseConfig> = {
      // Project info
      ...(tempConfig.projectDescription && {
        projectDescription: tempConfig.projectDescription,
        [migratedFields.push("projectDescription")]: undefined,
      }),
      ...(tempConfig.projectVersion && {
        projectVersion: tempConfig.projectVersion,
        [migratedFields.push("projectVersion")]: undefined,
      }),
      ...(tempConfig.projectLicense && {
        projectLicense: tempConfig.projectLicense,
        [migratedFields.push("projectLicense")]: undefined,
      }),
      ...(tempConfig.projectRepository && {
        projectRepository: tempConfig.projectRepository,
        [migratedFields.push("projectRepository")]: undefined,
      }),
      ...(tempConfig.projectCategory && {
        projectCategory: tempConfig.projectCategory,
        [migratedFields.push("projectCategory")]: undefined,
      }),
      ...(tempConfig.projectSubcategory && {
        projectSubcategory: tempConfig.projectSubcategory,
        [migratedFields.push("projectSubcategory")]: undefined,
      }),
      ...(tempConfig.projectFramework && {
        projectFramework: tempConfig.projectFramework,
        [migratedFields.push("projectFramework")]: undefined,
      }),
      ...(tempConfig.projectTemplate && {
        projectTemplate: tempConfig.projectTemplate,
        [migratedFields.push("projectTemplate")]: undefined,
      }),
      ...(tempConfig.projectArchitecture && {
        projectArchitecture: tempConfig.projectArchitecture,
        [migratedFields.push("projectArchitecture")]: undefined,
      }),
      ...(tempConfig.projectRuntime && {
        projectRuntime: tempConfig.projectRuntime,
        [migratedFields.push("projectRuntime")]: undefined,
      }),

      // Features and preferences
      ...(tempConfig.features && {
        features: tempConfig.features,
        [migratedFields.push("features")]: undefined,
      }),
      ...(tempConfig.preferredLibraries && {
        preferredLibraries: tempConfig.preferredLibraries,
        [migratedFields.push("preferredLibraries")]: undefined,
      }),
      ...(tempConfig.codeStyle && {
        codeStyle: tempConfig.codeStyle,
        [migratedFields.push("codeStyle")]: undefined,
      }),
      ...(tempConfig.monorepo && {
        monorepo: tempConfig.monorepo,
        [migratedFields.push("monorepo")]: undefined,
      }),
      ...(tempConfig.ignoreDependencies && {
        ignoreDependencies: tempConfig.ignoreDependencies,
        [migratedFields.push("ignoreDependencies")]: undefined,
      }),
      ...(tempConfig.customRules && {
        customRules: tempConfig.customRules,
        [migratedFields.push("customRules")]: undefined,
      }),

      // Behaviors
      ...(tempConfig.skipPromptsUseAutoBehavior !== undefined && {
        skipPromptsUseAutoBehavior: tempConfig.skipPromptsUseAutoBehavior,
        [migratedFields.push("skipPromptsUseAutoBehavior")]: undefined,
      }),
      ...(tempConfig.deployBehavior && {
        deployBehavior: tempConfig.deployBehavior,
        [migratedFields.push("deployBehavior")]: undefined,
      }),
      ...(tempConfig.depsBehavior && {
        depsBehavior: tempConfig.depsBehavior,
        [migratedFields.push("depsBehavior")]: undefined,
      }),
      ...(tempConfig.gitBehavior && {
        gitBehavior: tempConfig.gitBehavior,
        [migratedFields.push("gitBehavior")]: undefined,
      }),
      ...(tempConfig.i18nBehavior && {
        i18nBehavior: tempConfig.i18nBehavior,
        [migratedFields.push("i18nBehavior")]: undefined,
      }),
      ...(tempConfig.scriptsBehavior && {
        scriptsBehavior: tempConfig.scriptsBehavior,
        [migratedFields.push("scriptsBehavior")]: undefined,
      }),
      ...(tempConfig.existingRepoBehavior && {
        existingRepoBehavior: tempConfig.existingRepoBehavior,
        [migratedFields.push("existingRepoBehavior")]: undefined,
      }),
      ...(tempConfig.repoPrivacy && {
        repoPrivacy: tempConfig.repoPrivacy,
        [migratedFields.push("repoPrivacy")]: undefined,
      }),
    };

    // Update the .reliverse config with migrated data
    const success = await updateReliverseConfig(projectPath, validConfig);

    if (success) {
      relinka("success", "Successfully migrated .reliverse config");
      relinka("success-verbose", "Migrated fields:", migratedFields.join(", "));
    }

    // Clean up temp.reliverse after migration
    await fs.remove(externalReliversePath);
  } catch (error) {
    relinka(
      "warn",
      "Failed to migrate data from temp.reliverse:",
      String(error),
    );
  }
}

/* ------------------------------------------------------------------
 * Default + Merging Logic
 * ------------------------------------------------------------------ */

export const DEFAULT_CONFIG: ReliverseConfig = {
  // Reliverse config schema
  $schema: RELIVERSE_SCHEMA_URL,

  // General project information
  projectName: UNKNOWN_VALUE,
  projectAuthor: UNKNOWN_VALUE,
  projectDescription: UNKNOWN_VALUE,
  projectVersion: "0.1.0",
  projectLicense: "MIT",
  projectRepository: UNKNOWN_VALUE,
  projectState: "creating",
  projectDomain: DEFAULT_DOMAIN,
  projectDeployService: "vercel",
  projectCategory: UNKNOWN_VALUE,
  projectSubcategory: UNKNOWN_VALUE,
  projectTemplate: UNKNOWN_VALUE,
  projectArchitecture: UNKNOWN_VALUE,
  repoPrivacy: UNKNOWN_VALUE,
  repoBranch: "main",

  // Primary tech stack/framework
  projectFramework: "nextjs",
  projectPackageManager: "bun",
  projectRuntime: "nodejs",
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

  // Custom repos configuration
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

function createSinglePropertySchema(key: string, subSchema: TSchema): TSchema {
  return Type.Object({ [key]: subSchema } as Record<string, TSchema>, {
    additionalProperties: false,
    required: [key],
  });
}

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
 * Return an array of property paths that were changed.
 */
export function fixLineByLine(
  userConfig: unknown,
  defaultConfig: unknown,
  schema: TSchema,
): {
  fixedConfig: unknown;
  changedKeys: string[];
} {
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
    const subSchema = properties[propName]!;
    const userValue = (userConfig as any)[propName];
    const defaultValue = (defaultConfig as any)[propName];

    // Track missing fields and inject defaults
    if (userValue === undefined && !(propName in userConfig)) {
      missingKeys.push(propName);
      result[propName] = defaultValue;
      continue;
    }

    // Special handling for custom repository arrays
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
      createSinglePropertySchema(propName, subSchema),
      { [propName]: userValue },
    );

    if (!isValidStructure) {
      result[propName] = defaultValue;
      changedKeys.push(propName);
    } else if ((subSchema as any).type === "object") {
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
        subSchema,
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
 * ------------------------------------------------------------------ */

type CommentSections = Partial<Record<keyof ReliverseConfig, string[]>>;

export function injectSectionComments(fileContent: string): string {
  const comment = (text: string) => (text ? `// ${text}` : "");

  const commentSections: CommentSections = {
    $schema: [
      comment("RELIVERSE CONFIG (https://docs.reliverse.org/cli)"),
      comment(`This jsonc file is generated by ${cliName}`),
      comment("Restart the CLI to apply your config changes"),
    ],
    projectName: [comment("General project information")],
    skipPromptsUseAutoBehavior: [
      comment("Do you want to enable auto-answering for prompts?"),
      comment("Set this field to true to skip manual confirmations."),
      comment("Configure also unknown values and prompts behavior."),
    ],
    features: [comment("Project features")],
    projectFramework: [comment("Primary tech stack/framework")],
    codeStyle: [comment("Code style preferences")],
    multipleRepoCloneMode: [comment("`Clone an existing repo` menu")],
    envComposerOpenBrowser: [
      comment("Set to false to disable opening"),
      comment("the browser while env composing"),
    ],
    ignoreDependencies: [comment("Dependencies to exclude from checks")],
    customRules: [comment("Custom rules for Reliverse AI")],
    deployBehavior: [
      comment("Specific prompts behavior"),
      comment("prompt | autoYes | autoNo"),
    ],
    existingRepoBehavior: [
      comment("What CLI should do with existing GitHub repo"),
      comment("Applicable for the new project creation only"),
      comment("prompt | autoYes | autoYesSkipCommit | autoNo"),
    ],
  };

  for (const [section, lines] of Object.entries(commentSections)) {
    if (!lines?.length) continue;
    const combinedComments = lines
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join("\n");

    fileContent = fileContent.replace(
      new RegExp(`(\\s+)"${section.replace("$", "\\$")}":`, "g"),
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

/**
 * Cleans GitHub repository URLs by removing git+ prefix and .git suffix
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
 * Config Read/Write (TypeBox)
 * ------------------------------------------------------------------ */

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
    if (!content || content === "{}") {
      return null;
    }

    const parsed = parseJSONC(content);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const isValid = Value.Check(reliverseConfigSchema, parsed);
    if (!isValid) {
      return {
        parsed,
        errors: Value.Errors(reliverseConfigSchema, parsed),
      };
    }

    return { parsed, errors: null };
  } catch {
    return null;
  }
}

export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
): Promise<void> {
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    const valid = Value.Check(reliverseConfigSchema, config);
    if (!valid) {
      const issues = [...Value.Errors(reliverseConfigSchema, config)].map(
        (err) => `Path "${err.path}": ${err.message}`,
      );
      relinka("error", "Invalid .reliverse config:", issues.join("; "));
      throw new Error(`Invalid .reliverse config: ${issues.join("; ")}`);
    }

    let fileContent = JSON.stringify(config, null, 2);
    fileContent = injectSectionComments(fileContent);

    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    await fs.writeFile(tempPath, fileContent);
    await fs.rename(tempPath, configPath);

    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success-verbose", "Config written successfully");
  } catch (error) {
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

export async function readReliverseConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  const backupPath = configPath + BACKUP_EXTENSION;
  const parseResult = await parseReliverseFile(configPath);
  if (!parseResult) {
    return null;
  }

  if (!parseResult.errors) {
    return parseResult.parsed as ReliverseConfig;
  }

  const errors = [...parseResult.errors].map(
    (err) => `Path "${err.path}": ${err.message}`,
  );
  relinka(
    "warn-verbose",
    "Detected invalid fields in .reliverse:",
    errors.join("; "),
  );

  const merged = mergeWithDefaults(
    parseResult.parsed as Partial<ReliverseConfig>,
  );
  if (Value.Check(reliverseConfigSchema, merged)) {
    await writeReliverseConfig(configPath, merged);
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
 * ------------------------------------------------------------------ */

async function parseAndFixConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = parseJSONC(raw);

    if (parsed && typeof parsed === "object") {
      const originalErrors = [...Value.Errors(reliverseConfigSchema, parsed)];
      if (originalErrors.length === 0) {
        return parsed as ReliverseConfig;
      }

      const { fixedConfig, changedKeys } = fixLineByLine(
        parsed,
        DEFAULT_CONFIG,
        reliverseConfigSchema,
      );

      if (Value.Check(reliverseConfigSchema, fixedConfig)) {
        await writeReliverseConfig(configPath, fixedConfig);
        const originalInvalidPaths = originalErrors.map((err) => err.path);

        relinka(
          "info",
          "Your .reliverse config has been fixed. Please ensure it aligns with your project.",
          `Changed keys: ${changedKeys.join(", ") || "(none)"}`,
        );

        relinka(
          "info-verbose",
          `Invalid paths were: ${originalInvalidPaths.join(", ") || "(none)"}; `,
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
      "Failed to parse/fix .reliverse line-by-line:",
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
  projectName?: string,
  projectAuthor?: string,
): Promise<ReliverseConfig> {
  const packageJson = await getPackageJsonSafe(cwd);
  const effectiveProjectName =
    packageJson?.name ?? projectName ?? UNKNOWN_VALUE;

  let effectiveProjectAuthor =
    typeof packageJson?.author === "object"
      ? (packageJson.author?.name ?? projectAuthor)
      : (packageJson?.author ?? projectAuthor ?? UNKNOWN_VALUE);

  // Handle dev mode author replacement
  if (effectiveProjectAuthor === "reliverse") {
    effectiveProjectAuthor = "blefnk";
  }

  const biomeConfig = await getBiomeConfig(cwd);
  const detectedPkgManager = await detect();

  const packageJsonPath = path.join(cwd, "package.json");
  let packageData: PackageJson = {
    name: effectiveProjectName,
    author: effectiveProjectAuthor,
  };

  if (await fs.pathExists(packageJsonPath)) {
    try {
      packageData = await readPackageJSON(cwd);
    } catch {
      // fallback
    }
  }

  const detectedProjectFramework = await detectProjectFramework(cwd);

  return {
    ...DEFAULT_CONFIG,
    projectName: effectiveProjectName,
    projectAuthor: effectiveProjectAuthor,
    projectDescription: packageData.description ?? UNKNOWN_VALUE,
    projectVersion: packageData.version ?? "0.1.0",
    projectLicense: packageData.license ?? "MIT",
    projectRepository:
      typeof packageData.repository === "string"
        ? packageData.repository
        : (packageData.repository?.url ?? UNKNOWN_VALUE),
    projectState: "creating",
    projectDomain:
      effectiveProjectName === cliName ? cliDomain : DEFAULT_DOMAIN,
    projectDeployService: "vercel",
    projectCategory: UNKNOWN_VALUE,
    projectSubcategory: UNKNOWN_VALUE,
    projectTemplate: UNKNOWN_VALUE,
    projectArchitecture: UNKNOWN_VALUE,
    repoPrivacy: UNKNOWN_VALUE,
    repoBranch: "main",

    // Primary tech stack/framework
    projectFramework: detectedProjectFramework ?? UNKNOWN_VALUE,
    projectPackageManager: detectedPkgManager,
    projectRuntime: "nodejs",
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
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(packageJsonPath))) {
      return null;
    }
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

/* ------------------------------------------------------------------
 * Project Detection & Additional Logic
 * ------------------------------------------------------------------ */
export async function getPackageJsonSafe(
  cwd: string,
): Promise<PackageJson | null> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) {
    return null;
  }
  return await readPackageJSON(cwd);
}

export async function generateDefaultRulesForProject(
  cwd: string,
): Promise<ReliverseConfig | null> {
  const projectCategory = await detectProjectFramework(cwd);
  const effectiveProjectCategory = projectCategory ?? "nextjs";

  const packageJsonPath = path.join(cwd, "package.json");
  let packageJson: any = {};

  if (await fs.pathExists(packageJsonPath)) {
    try {
      packageJson = safeDestr(await fs.readFile(packageJsonPath, "utf-8"));
    } catch {
      // ignore
    }
  }

  const rules = await getDefaultReliverseConfig(cwd);

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

  const rootProject = await detectProject(cwd);
  if (rootProject) {
    detected.push(rootProject);
  }

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
): Promise<ProjectFeatures> {
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
 * ------------------------------------------------------------------ */

export async function generateReliverseConfig({
  projectName,
  cliUsername,
  deployService,
  primaryDomain,
  projectPath,
  githubUsername,
  enableI18n,
  overwrite,
  isDev,
}: GenerateReliverseConfigOptions): Promise<void> {
  const packageJson = await getPackageJson(projectPath);

  if (isDev) {
    cliUsername = cliUsername === "reliverse" ? "blefnk" : cliUsername;
  }

  const baseRules = await getDefaultReliverseConfig(
    projectPath,
    projectName,
    cliUsername,
  );

  baseRules.projectName = projectName;
  baseRules.projectAuthor = cliUsername;
  baseRules.projectDescription =
    packageJson?.description ?? baseRules.projectDescription ?? UNKNOWN_VALUE;
  baseRules.projectVersion = packageJson?.version ?? baseRules.projectVersion;
  baseRules.projectLicense = packageJson?.license ?? baseRules.projectLicense;
  baseRules.projectRepository = packageJson?.repository
    ? typeof packageJson.repository === "string"
      ? cleanGitHubUrl(packageJson.repository)
      : cleanGitHubUrl(packageJson.repository.url)
    : githubUsername && projectName
      ? `${githubUsername}/${projectName}`
      : UNKNOWN_VALUE;

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

  const effectiveConfig = {
    ...DEFAULT_CONFIG,
    ...existingContent,
    ...baseRules,
  };

  // Update schema URL if in dev mode
  if (isDev) {
    effectiveConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }

  await writeReliverseConfig(configPath, effectiveConfig);
}

async function createReliverseConfig(
  cwd: string,
  githubUsername: string,
  isDev: boolean,
): Promise<void> {
  const defaultRules = await generateDefaultRulesForProject(cwd);

  const effectiveProjectName = defaultRules?.projectName ?? path.basename(cwd);
  let effectiveAuthorName = defaultRules?.projectAuthor ?? UNKNOWN_VALUE;
  const effectiveDomain =
    defaultRules?.projectDomain ??
    (effectiveProjectName === cliName ? cliDomain : DEFAULT_DOMAIN);

  if (isDev) {
    effectiveAuthorName =
      effectiveAuthorName === "reliverse" ? "blefnk" : effectiveAuthorName;
  }

  await generateReliverseConfig({
    projectName: effectiveProjectName,
    cliUsername: effectiveAuthorName,
    deployService: "vercel",
    primaryDomain: effectiveDomain,
    projectPath: cwd,
    githubUsername,
    isDev,
  });

  relinka(
    "info-verbose",
    defaultRules
      ? "Created .reliverse configuration based on detected project settings."
      : "Created initial .reliverse configuration. Please review and adjust as needed.",
  );
}

/* ------------------------------------------------------------------
 * Multi-config reading from `reli` folder
 * ------------------------------------------------------------------ */

/**
 * Reads all `*.reliverse` files in the `reli` folder, parses them, and
 * fixes them if needed. Returns an array of valid ReliverseConfigs.
 */
export async function readReliverseConfigsInReliFolder(
  cwd: string,
): Promise<ReliverseConfig[]> {
  const reliFolderPath = path.join(cwd, "reli");
  const results: ReliverseConfig[] = [];

  // If the folder doesn't exist, return empty array
  if (!(await fs.pathExists(reliFolderPath))) {
    return results;
  }

  const dirItems = await fs.readdir(reliFolderPath);
  const reliverseFiles = dirItems.filter((item) => item.endsWith(".reliverse"));

  for (const file of reliverseFiles) {
    const filePath = path.join(reliFolderPath, file);
    let config = await readReliverseConfig(filePath);

    // If not valid, attempt line-by-line fix
    if (!config) {
      config = await parseAndFixConfig(filePath);
    }

    // If still not valid, skip
    if (!config) {
      relinka("warn", `Skipping invalid config file: ${filePath}`);
      continue;
    }

    results.push(config);
  }

  return results;
}

/* ------------------------------------------------------------------
 * The Core Logic: Handle or Verify `.reliverse` + MULTI-CONFIG
 * ------------------------------------------------------------------ */

export async function handleReliverseConfig(
  cwd: string,
  isDev: boolean,
): Promise<{ config: ReliverseConfig; reli: ReliverseConfig[] }> {
  const githubUsername = UNKNOWN_VALUE;

  // 1. First, detect multi-config folder "reli"
  const reliFolderPath = path.join(cwd, "reli");
  const hasReliFolder = await fs.pathExists(reliFolderPath);
  let reliConfigs: ReliverseConfig[] = [];

  // 2. If `reli` folder exists, read all `*.reliverse` files in it
  if (hasReliFolder) {
    reliConfigs = await readReliverseConfigsInReliFolder(cwd);

    if (reliConfigs.length > 0) {
      relinka(
        "info-verbose",
        `[🚨 Experimental] Detected ${reliConfigs.length} reliverse configs in reli folder...`,
      );
    }
  }

  // 3. Handle single `.reliverse` in root
  const configPath = path.join(cwd, ".reliverse");

  if (!(await fs.pathExists(configPath))) {
    await createReliverseConfig(cwd, githubUsername, isDev);
  } else {
    const content = (await fs.readFile(configPath, "utf-8")).trim();
    if (!content || content === "{}") {
      await createReliverseConfig(cwd, githubUsername, isDev);
    } else {
      const validConfig = await readReliverseConfig(configPath);
      if (!validConfig) {
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

  const mainConfig = await readReliverseConfig(configPath);
  if (!mainConfig) {
    relinka(
      "warn",
      "Using fallback default config because .reliverse could not be validated.",
    );
    return { config: { ...DEFAULT_CONFIG }, reli: reliConfigs };
  }

  // Update schema URL if in dev mode
  if (isDev) {
    mainConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }

  return { config: mainConfig, reli: reliConfigs };
}

export async function getReliverseConfig() {
  const cwd = getCurrentWorkingDirectory();
  const { config } = await handleReliverseConfig(cwd, true);
  return config;
}
