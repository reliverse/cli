import type { PackageJson } from "pkg-types";

import { spinnerTaskPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import {
  Value,
  type ValueError,
  type ValueErrorIterator,
} from "@sinclair/typebox/value";
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
 * Precompile the main reliverse config schema
 * ------------------------------------------------------------------ */
export const compiledReliverseConfig = TypeCompiler.Compile(
  reliverseConfigSchema,
);

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
 * Deep merges (unchanged; can keep or remove if you want partial merges)
 * ------------------------------------------------------------------ */

function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  // unchanged
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

/* ------------------------------------------------------------------
 * Example: using compiled schema to validate
 * ------------------------------------------------------------------ */
const BACKUP_EXTENSION = ".backup";
const TEMP_EXTENSION = ".tmp";

/**
 * Use compiledReliverseConfig to check if something is valid
 * Return error messages if invalid
 */
function validateReliverseConfig(
  candidate: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  const ok = compiledReliverseConfig.Check(candidate);
  if (ok) {
    return { valid: true };
  }
  // If not valid, gather errors
  const errs = compiledReliverseConfig.Errors(candidate);
  const messages = gatherErrorMessages(errs);
  return { valid: false, errors: messages };
}

/** Helper to unify error retrieval. */
function gatherErrorMessages(errs: ValueErrorIterator): string[] {
  const arr = [...errs].map((err) => {
    // Example: path '/x', "Expected string"
    return `Path "${err.path}": ${err.message}`;
  });
  return arr;
}

/* ------------------------------------------------------------------
 * Updating the .reliverse config with partial merges
 * ------------------------------------------------------------------ */
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

    // Read and parse existing config
    if (await fs.pathExists(configPath)) {
      existingContent = await fs.readFile(configPath, "utf-8");
      const parsed = parseJSONC(existingContent);
      // Validate
      const check = validateReliverseConfig(parsed);
      if (check.valid) {
        existingConfig = parsed as ReliverseConfig;
      } else {
        relinka("warn", "Invalid .reliverse schema, starting fresh");
      }
    }

    // Merge
    const mergedConfig = deepMerge(existingConfig, updates);

    // Validate final
    const checkFinal = validateReliverseConfig(mergedConfig);
    if (!checkFinal.valid) {
      relinka(
        "error",
        "Invalid .reliverse config after merge:",
        checkFinal.errors.join("; "),
      );
      return false;
    }

    // Backup if it existed
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    // Write to temp file first
    let fileContent = JSON.stringify(mergedConfig, null, 2);

    // If brand new file, you might want to call `injectSectionComments(fileContent)`
    if (!existingContent) {
      fileContent = injectSectionComments(fileContent);
    }

    await fs.writeFile(tempPath, fileContent);
    await fs.rename(tempPath, configPath);

    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success-verbose", "Reliverse config updated successfully");
    return true;
  } catch (error) {
    // restore if we created a backup
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      await fs.copy(backupPath, configPath);
      relinka("warn", "Restored config from backup after failed update");
    }
    // cleanup
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }
    relinka("error", "Failed to update .reliverse config:", String(error));
    return false;
  }
}

/* ------------------------------------------------------------------
 * Default config object
 * ------------------------------------------------------------------ */
export const DEFAULT_CONFIG: ReliverseConfig = {
  $schema: RELIVERSE_SCHEMA_URL,
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
  envComposerOpenBrowser: true,
  skipPromptsUseAutoBehavior: false,
  deployBehavior: "prompt",
  depsBehavior: "prompt",
  gitBehavior: "prompt",
  i18nBehavior: "prompt",
  scriptsBehavior: "prompt",
  existingRepoBehavior: "prompt",
};

/* ------------------------------------------------------------------
 * Simple merge with defaults
 * ------------------------------------------------------------------ */
function mergeWithDefaults(partial: Partial<ReliverseConfig>): ReliverseConfig {
  // unchanged from your code
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
 * fixLineByLine (example improved with Value.Parse)
 * ------------------------------------------------------------------ */

/**
 * Example using Value.Parse to fix line-by-line.
 * We can parse with Clean, Default, Convert, Assert if we want a single pass.
 * This is simpler than the custom approach you had, but we keep the same function name.
 */
export function fixLineByLine(userConfig: unknown): {
  fixedConfig: unknown;
  errors: string[];
} {
  // We parse with multiple steps: Clean => Default => Convert => Assert
  // so it will forcibly shape the data to our schema if feasible,
  // then finalize or produce an error
  // Return either a typed config or some errors.
  try {
    // This returns the typed result if everything works
    const result = Value.Parse(
      // steps:
      ["Clean", "Default", "Convert", "Assert"],
      reliverseConfigSchema,
      userConfig,
    );
    return {
      fixedConfig: result,
      errors: [],
    };
  } catch (err: any) {
    if (err && typeof err === "object" && Array.isArray(err.errors)) {
      const lines = (err.errors as ValueError[]).map((e) => {
        return `Path "${e.path}": ${e.message}`;
      });
      return {
        fixedConfig: userConfig,
        errors: lines,
      };
    }
    return {
      fixedConfig: userConfig,
      errors: [String(err)],
    };
  }
}

/* ------------------------------------------------------------------
 * Comment Injection (unchanged)
 * ------------------------------------------------------------------ */
type CommentSections = Partial<Record<keyof ReliverseConfig, string[]>>;

export function injectSectionComments(fileContent: string): string {
  // unchanged from your code
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
 * Helper to parse .reliverse or fix if partial
 * ------------------------------------------------------------------ */
async function parseReliverseFile(configPath: string): Promise<{
  parsed: unknown;
  errors: string[] | null;
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
    // Use the compiled approach:
    const check = validateReliverseConfig(parsed);
    if (!check.valid) {
      // return partial with error
      return { parsed, errors: check.errors };
    }
    return { parsed, errors: null };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
 * Updated writeReliverseConfig using compiled validator
 * ------------------------------------------------------------------ */
export async function writeReliverseConfig(
  configPath: string,
  config: ReliverseConfig,
): Promise<void> {
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    // validate
    const check = validateReliverseConfig(config);
    if (!check.valid) {
      relinka("error", "Invalid .reliverse config:", check.errors.join("; "));
      throw new Error(`Invalid .reliverse config: ${check.errors.join("; ")}`);
    }

    // do the actual write
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

/* ------------------------------------------------------------------
 * Updated readReliverseConfig using compiled validator
 * ------------------------------------------------------------------ */
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
    // fully valid
    return parseResult.parsed as ReliverseConfig;
  }

  // If we get here, we have invalid fields
  const errors = parseResult.errors;
  relinka("warn", "Detected invalid fields in .reliverse:", errors.join("; "));

  // Attempt to fix with mergeWithDefaults or Value.Parse
  const partial = parseResult.parsed as Partial<ReliverseConfig>;
  const merged = mergeWithDefaults(partial);

  // re-validate
  const check2 = validateReliverseConfig(merged);
  if (check2.valid) {
    // write the merged
    await writeReliverseConfig(configPath, merged);
    relinka("info", "Merged missing or invalid fields into config");
    return merged;
  } else {
    // fallback to any backup
    if (await fs.pathExists(backupPath)) {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      const backupParsed = parseJSONC(backupContent);
      if (backupParsed) {
        const backupCheck = validateReliverseConfig(backupParsed);
        if (backupCheck.valid) {
          await fs.copy(backupPath, configPath);
          relinka("info", "Restored config from backup");
          return backupParsed as ReliverseConfig;
        }
      }
      relinka("warn", "Backup also invalid. Returning null.");
      return null;
    }
    return null;
  }
}

/* ------------------------------------------------------------------
 * parseAndFixConfig with fixLineByLine approach
 * ------------------------------------------------------------------ */
async function parseAndFixConfig(
  configPath: string,
): Promise<ReliverseConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = parseJSONC(raw);
    if (parsed && typeof parsed === "object") {
      // Attempt normal check
      const originalCheck = validateReliverseConfig(parsed);
      if (originalCheck.valid) {
        return parsed as ReliverseConfig;
      }
      // if invalid, fix line by line
      const { fixedConfig, errors } = fixLineByLine(parsed);
      // see if it's now valid
      const finalCheck = validateReliverseConfig(fixedConfig);
      if (finalCheck.valid) {
        // re-write
        await writeReliverseConfig(configPath, fixedConfig as ReliverseConfig);
        relinka(
          "info",
          "Fixed .reliverse configuration lines. Invalid fields corrected",
          `Detected errors were: ${originalCheck.errors?.join(", ") || "(none)"}`,
          `Line fix errors: ${errors.join(", ") || "(none)"}`,
        );
        return fixedConfig as ReliverseConfig;
      } else {
        relinka(
          "warn",
          "Could not fix all invalid config lines:",
          finalCheck.errors.join("; "),
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
 * getDefaultReliverseConfig (unchanged except using detection logic)
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

  // dev mode check
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
 * getPackageJsonSafe
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
 * Additional logic unchanged ...
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
  // unchanged logic
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
 * Generate Reliverse Config
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
      ? `https://github.com/${githubUsername}/${projectName}`
      : UNKNOWN_VALUE;

  baseRules.projectDeployService = deployService;
  baseRules.projectDomain = primaryDomain
    ? `https://${primaryDomain.replace(/^https?:\/\//, "")}`
    : projectName
      ? `https://${projectName}.vercel.app`
      : UNKNOWN_VALUE;

  baseRules.features = await detectFeatures(projectPath, packageJson);
  baseRules.features.i18n = enableI18n ?? false;
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

  // Update schema if dev
  if (isDev) {
    effectiveConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }

  await writeReliverseConfig(configPath, effectiveConfig);
}

/* ------------------------------------------------------------------
 * createReliverseConfig
 * ------------------------------------------------------------------ */
export async function createReliverseConfig(
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

export async function createReliverseConfigSpinner(
  cwd: string,
  githubUsername: string,
  isDev: boolean,
) {
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Creating .reliverse config...",
    successMessage: "✅ Reliverse config generated successfully!",
    errorMessage: "❌ Failed to create .reliverse config...",
    async action(updateMessage: (message: string) => void) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // minimal sleep
      await createReliverseConfig(cwd, githubUsername, isDev);
      updateMessage("✅ Reliverse config generated successfully");
    },
  });
}

/* ------------------------------------------------------------------
 * readReliverseConfigsInReliFolder
 * ------------------------------------------------------------------ */
export async function readReliverseConfigsInReliFolder(
  cwd: string,
): Promise<ReliverseConfig[]> {
  const reliFolderPath = path.join(cwd, "reli");
  const results: ReliverseConfig[] = [];

  if (!(await fs.pathExists(reliFolderPath))) {
    return results;
  }
  const dirItems = await fs.readdir(reliFolderPath);
  const reliverseFiles = dirItems.filter((item) => item.endsWith(".reliverse"));

  for (const file of reliverseFiles) {
    const filePath = path.join(reliFolderPath, file);
    let config = await readReliverseConfig(filePath);
    if (!config) {
      config = await parseAndFixConfig(filePath);
    }
    if (!config) {
      relinka("warn", `Skipping invalid config file: ${filePath}`);
      continue;
    }
    results.push(config);
  }
  return results;
}

/* ------------------------------------------------------------------
 * Handle single or multi .reliverse
 * ------------------------------------------------------------------ */
export async function handleReliverseConfig(
  cwd: string,
  isDev: boolean,
): Promise<{ config: ReliverseConfig; reli: ReliverseConfig[] }> {
  const githubUsername = UNKNOWN_VALUE;
  const reliFolderPath = path.join(cwd, "reli");
  const hasReliFolder = await fs.pathExists(reliFolderPath);
  let reliConfigs: ReliverseConfig[] = [];

  if (hasReliFolder) {
    reliConfigs = await readReliverseConfigsInReliFolder(cwd);
    if (reliConfigs.length > 0) {
      relinka(
        "info-verbose",
        `[🚨 Experimental] Detected ${reliConfigs.length} reliverse configs in reli folder...`,
      );
    }
  }

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

  if (isDev) {
    mainConfig.$schema = RELIVERSE_SCHEMA_DEV;
  }

  return { config: mainConfig, reli: reliConfigs };
}

/* ------------------------------------------------------------------
 * getReliverseConfig
 * ------------------------------------------------------------------ */
export async function getReliverseConfig() {
  const cwd = getCurrentWorkingDirectory();
  const { config } = await handleReliverseConfig(cwd, true);
  return config;
}

/* ------------------------------------------------------------------
 * Utility: remove git+ prefix / .git suffix
 * ------------------------------------------------------------------ */
export function cleanGitHubUrl(url: string): string {
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}
