/**
 * Build and Publish Script
 * This script bundles, bumps versions, and publishes the project
 * with its optional libraries to the NPM and/or JSR registries.
 */

import { re } from "@reliverse/relico";
import { build as bunBuild } from "bun";
import { parseJSONC, parseJSON5 } from "confbox";
import { destr } from "destr";
import { execaCommand } from "execa";
import fs from "fs-extra";
import mri from "mri";
import path from "pathe";
import {
  readPackageJSON,
  defineTSConfig,
  definePackageJSON,
  type PackageJson,
} from "pkg-types";
import semver from "semver";
import { glob } from "tinyglobby";
import { fileURLToPath } from "url";

import {
  pubConfig,
  getBunSourcemapOption,
  type BuildPublishConfig,
} from "./build.config.js";

// ============================
// Constants & Global Setup
// ============================

const tsconfigJson = "tsconfig.json";
const cliConfigJsonc = "cli.config.jsonc";
const cliDomainDocs = "https://docs.reliverse.org";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_FOLDERS = ["dist-npm", "dist-jsr", "dist-libs"];
const JSON_FILE_PATTERN = "**/*.{ts,json,jsonc,json5}";
const TEST_FILE_PATTERNS = [
  "**/*.test.js",
  "**/*.test.ts",
  "**/*.test.d.ts",
  "**/*-temp.js",
  "**/*-temp.ts",
  "**/*-temp.d.ts",
];
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/.cache/**",
  "**/tmp/**",
  "**/.temp/**",
  "**/package-lock.json",
  "**/pnpm-lock.yaml",
  "**/yarn.lock",
  "**/bun.lock",
];

// Regex constants for version updates
const JSON_VERSION_REGEX = (oldVer: string) =>
  new RegExp(`"version"\\s*:\\s*"${oldVer}"`, "g");
const TS_VERSION_REGEXES = [
  (oldVer: string) =>
    new RegExp(`(export\\s+const\\s+version\\s*=\\s*["'])${oldVer}(["'])`, "g"),
  (oldVer: string) =>
    new RegExp(`(const\\s+version\\s*=\\s*["'])${oldVer}(["'])`, "g"),
  (oldVer: string) => new RegExp(`(version\\s*:\\s*["'])${oldVer}(["'])`, "g"),
  (oldVer: string) => new RegExp(`(VERSION\\s*=\\s*["'])${oldVer}(["'])`, "g"),
  (oldVer: string) =>
    new RegExp(
      `(export\\s+const\\s+cliVersion\\s*=\\s*["'])${oldVer}(["'])`,
      "g",
    ),
  (oldVer: string) =>
    new RegExp(`(const\\s+cliVersion\\s*=\\s*["'])${oldVer}(["'])`, "g"),
];

// ============================
// CLI Flags Parsing & Help
// ============================

const cliFlags = mri(process.argv.slice(2), {
  string: ["bump", "registry"],
  boolean: ["verbose", "dryRun", "allowDirty", "jsrSlowTypes", "help"],
  alias: {
    v: "verbose",
    d: "dryRun",
    r: "registry",
    h: "help",
  },
  default: {},
});

// Display help if requested
if (cliFlags["help"]) {
  console.log(`
Usage: build.publish.ts [options]

Options:
  --bump <version>              Specify a version to bump to.
  --registry <npm|jsr|npm-jsr>  Select the registry to publish to.
  --verbose, -v                 Enable verbose logging.
  --dryRun, -d                  Run in dry run mode (no actual publish).
  --allowDirty                  Allow publishing from a dirty working directory.
  --jsrSlowTypes                Enable slow type-checking for JSR.
  --help, -h                    Display this help message.
`);
  process.exit(0);
}

// Override pubConfig values with CLI flags if provided.
if (cliFlags["verbose"] !== undefined) {
  pubConfig.verbose = cliFlags["verbose"];
}
if (cliFlags["dryRun"] !== undefined) {
  pubConfig.dryRun = cliFlags["dryRun"];
}
if (cliFlags["registry"]) {
  if (["npm", "jsr", "npm-jsr"].includes(cliFlags["registry"])) {
    pubConfig.registry = cliFlags["registry"];
  } else {
    console.warn(
      `Warning: Unrecognized registry "${cliFlags["registry"]}". Using default: ${pubConfig.registry}`,
    );
  }
}
if (cliFlags["allowDirty"] !== undefined) {
  pubConfig.allowDirty = cliFlags["allowDirty"];
}
if (cliFlags["jsrSlowTypes"] !== undefined) {
  pubConfig.jsrSlowTypes = cliFlags["jsrSlowTypes"];
}

// ============================
// Logger Utility (with timestamps)
// ============================

const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (msg: string, newLine = false) =>
    console.log(
      `${newLine ? "\n" : ""}[${getTimestamp()}] 📝  ${re.cyanBright(msg)}`,
    ),
  success: (msg: string, newLine = false) =>
    console.log(
      `${newLine ? "\n" : ""}[${getTimestamp()}] ✅  ${re.greenBright(msg)}`,
    ),
  warn: (msg: string, newLine = false) =>
    console.warn(
      `${newLine ? "\n" : ""}[${getTimestamp()}] 🔔  ${re.yellowBright(msg)}`,
    ),
  error: (msg: string, err?: unknown, newLine = false) =>
    console.error(
      `${newLine ? "\n" : ""}[${getTimestamp()}] ❌  ${msg}`,
      err instanceof Error ? err.message : err,
    ),
  verbose: (msg: string, newLine = false) => {
    if (pubConfig.verbose) {
      console.log(
        `${newLine ? "\n" : ""}[${getTimestamp()}] 🔍  ${re.magentaBright(msg)}`,
      );
    }
  },
};

// ============================
// Utility Helpers
// ============================

/**
 * Runs an async function within a given working directory,
 * ensuring that the original directory is restored afterward.
 */
async function withWorkingDirectory<T>(
  targetDir: string,
  fn: () => Promise<T>,
): Promise<T> {
  const originalDir = process.cwd();
  try {
    process.chdir(targetDir);
    logger.verbose(`Changed working directory to: ${targetDir}`, true);
    return await fn();
  } catch (error) {
    logger.error(`Error in directory ${targetDir}:`, error, true);
    throw error;
  } finally {
    process.chdir(originalDir);
    logger.verbose(`Restored working directory to: ${originalDir}`, true);
  }
}

/**
 * Ensures a directory is clean by removing it if it exists and recreating it.
 */
async function cleanDir(dirPath: string): Promise<void> {
  await fs.remove(dirPath);
  await fs.ensureDir(dirPath);
  logger.verbose(`Cleaned directory: ${dirPath}`, true);
}

/**
 * Recursively removes any existing distribution folders.
 */
async function removeDistFolders(): Promise<boolean> {
  const existingFolders: string[] = [];
  for (const folder of DIST_FOLDERS) {
    const folderPath = path.resolve(ROOT_DIR, folder);
    if (await fs.pathExists(folderPath)) {
      existingFolders.push(folder);
    }
  }
  if (existingFolders.length > 0) {
    logger.verbose(
      `Found existing distribution folders: ${existingFolders.join(", ")}`,
      true,
    );
    await Promise.all(
      DIST_FOLDERS.map(async (folder) => {
        const folderPath = path.resolve(ROOT_DIR, folder);
        if (await fs.pathExists(folderPath)) {
          await fs.remove(folderPath);
          logger.verbose(`Removed: ${folderPath}`, true);
        }
      }),
    );
    logger.success("Distribution folders cleaned up successfully", true);
  }
  return true;
}

/**
 * Deletes specific test and temporary files from a given directory.
 */
async function deleteSpecificFiles(outdirBin: string): Promise<void> {
  const files = await glob(TEST_FILE_PATTERNS, {
    cwd: outdirBin,
    absolute: true,
  });
  if (files.length > 0) {
    await Promise.all(files.map((file) => fs.remove(file)));
    logger.verbose(`Deleted files:\n${files.join("\n")}`, true);
  }
}

/**
 * Updates version strings in files based on file type.
 */
async function bumpVersions(
  oldVersion: string,
  newVersion: string,
): Promise<void> {
  try {
    const codebase = await glob([JSON_FILE_PATTERN], {
      ignore: IGNORE_PATTERNS,
    });

    const updateFile = async (
      filePath: string,
      content: string,
    ): Promise<boolean> => {
      try {
        if (/\.(json|jsonc|json5)$/.test(filePath)) {
          let parsed: { version?: string } | null = null;
          if (filePath.endsWith(".json")) {
            parsed = destr(content);
          } else if (filePath.endsWith(".jsonc")) {
            parsed = parseJSONC(content);
          } else if (filePath.endsWith(".json5")) {
            parsed = parseJSON5(content);
          }
          if (!parsed || typeof parsed !== "object") {
            return false;
          }
          if (parsed.version === oldVersion) {
            const updated = content.replace(
              JSON_VERSION_REGEX(oldVersion),
              `"version": "${newVersion}"`,
            );
            await fs.writeFile(filePath, updated, "utf8");
            logger.verbose(`Updated version in ${filePath}`, true);
            return true;
          }
        } else if (filePath.endsWith(".ts")) {
          let updated = content;
          let hasChanges = false;
          for (const regexFactory of TS_VERSION_REGEXES) {
            const regex = regexFactory(oldVersion);
            if (regex.test(content)) {
              updated = updated.replace(regex, `$1${newVersion}$2`);
              hasChanges = true;
            }
          }
          if (hasChanges) {
            await fs.writeFile(filePath, updated, "utf8");
            logger.verbose(`Updated version in ${filePath}`, true);
            return true;
          }
        }
        return false;
      } catch (error) {
        logger.warn(
          `Failed to process ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          true,
        );
        return false;
      }
    };

    const results = await Promise.all(
      codebase.map(async (file) => {
        const content = await fs.readFile(file, "utf8");
        return updateFile(file, content);
      }),
    );

    const updatedCount = results.filter(Boolean).length;
    if (updatedCount > 0) {
      logger.success(
        `Updated version from ${oldVersion} to ${newVersion} in ${updatedCount} file(s)`,
        true,
      );
    } else {
      logger.warn("No files were updated with the new version", true);
    }
  } catch (error) {
    logger.error("Failed to bump versions:", error, true);
    throw error;
  }
}

/**
 * Auto-increments a semantic version based on the specified bump mode.
 */
function autoIncrementVersion(
  oldVersion: string,
  mode: "autoPatch" | "autoMinor" | "autoMajor",
): string {
  if (!semver.valid(oldVersion)) {
    throw new Error(`Can't auto-increment invalid version: ${oldVersion}`);
  }
  const releaseTypeMap = {
    autoPatch: "patch",
    autoMinor: "minor",
    autoMajor: "major",
  } as const;
  const newVer = semver.inc(oldVersion, releaseTypeMap[mode]);
  if (!newVer) {
    throw new Error(`semver.inc failed for ${oldVersion} and mode ${mode}`);
  }
  return newVer;
}

/**
 * Updates the "disableBump" flag in the build configuration file.
 */
async function setBumpDisabled(value: boolean): Promise<void> {
  if (pubConfig.pausePublish && value) {
    logger.verbose("Skipping disableBump toggle due to pausePublish", true);
    return;
  }

  const tsConfigPath = path.join(ROOT_DIR, "build.config.ts");
  const jsConfigPath = path.join(ROOT_DIR, "build.config.js");
  const configPath = (await fs.pathExists(tsConfigPath))
    ? tsConfigPath
    : jsConfigPath;

  if (!(await fs.pathExists(configPath))) {
    logger.warn(
      "No build.config.ts or build.config.js found to update disableBump",
      true,
    );
    return;
  }

  let content = await fs.readFile(configPath, "utf-8");
  content = content.replace(
    /disableBump\s*:\s*(true|false)/,
    `disableBump: ${value}`,
  );
  await fs.writeFile(configPath, content, "utf-8");
  logger.verbose(`Updated disableBump to ${value} in ${configPath}`, true);
}

/**
 * Handles version bumping.
 */
async function bumpHandler(): Promise<void> {
  if (pubConfig.disableBump || pubConfig.pausePublish) {
    logger.info(
      "Skipping version bump because it is either disabled or paused in config.",
      true,
    );
    return;
  }

  const cliVersion = cliFlags["bump"];
  const pkgPath = path.resolve("package.json");
  if (!(await fs.pathExists(pkgPath))) {
    throw new Error("package.json not found");
  }
  const pkgJson = await readPackageJSON();
  if (!pkgJson.version) {
    throw new Error("No version field found in package.json");
  }
  const oldVersion = pkgJson.version;

  if (cliVersion) {
    if (!semver.valid(cliVersion)) {
      throw new Error(`Invalid version format for --bump: "${cliVersion}"`);
    }
    if (oldVersion !== cliVersion) {
      await bumpVersions(oldVersion, cliVersion);
      await setBumpDisabled(true);
    } else {
      logger.info(`Version is already at ${oldVersion}, no bump needed.`, true);
    }
  } else {
    if (!semver.valid(oldVersion)) {
      throw new Error(
        `Invalid existing version in package.json: ${oldVersion}`,
      );
    }
    logger.info(
      `Auto-incrementing version from ${oldVersion} using "${pubConfig.bump}"`,
      true,
    );
    const incremented = autoIncrementVersion(oldVersion, pubConfig.bump);
    if (oldVersion !== incremented) {
      await bumpVersions(oldVersion, incremented);
      await setBumpDisabled(true);
    } else {
      logger.info(`Version is already at ${oldVersion}, no bump needed.`, true);
    }
  }
}

/**
 * Returns a build configuration based on the target registry.
 */
function defineConfig(isJSR: boolean): BuildPublishConfig {
  return {
    ...pubConfig,
    isJSR,
    lastBuildFor: isJSR ? "jsr" : "npm",
  };
}

/**
 * Creates common package.json fields based on the original package.json.
 */
async function createCommonPackageFields(): Promise<Partial<PackageJson>> {
  const originalPkg = await readPackageJSON();
  const { name, author, version, license, description, keywords } = originalPkg;
  const pkgHomepage = cliDomainDocs;
  const commonFields: Partial<PackageJson> = {
    name,
    version,
    license: license || "MIT",
    description,
    homepage: pkgHomepage,
    dependencies: originalPkg.dependencies || {},
    type: "module",
  };

  if (author) {
    Object.assign(commonFields, {
      author,
      repository: {
        type: "git",
        url: `git+https://github.com/${author}/${name}.git`,
      },
      bugs: {
        url: `https://github.com/${author}/${name}/issues`,
        email: "blefnk@gmail.com",
      },
      keywords: [...new Set([...(keywords || []), author])],
    });
  } else if (keywords && keywords.length > 0) {
    commonFields.keywords = keywords;
  }

  return commonFields;
}

/**
 * Extracts the package name from an import path.
 * For scoped packages (starting with "@"), returns the first two segments.
 */
function extractPackageName(importPath: string | undefined): string | null {
  if (!importPath || importPath.startsWith(".")) return null;
  const parts = importPath.split("/");
  if (importPath.startsWith("@") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] || null;
}

/**
 * Filters out development dependencies (like eslint and prettier) from a dependency record.
 * Optionally filters out unused dependencies from a dependency record.
 */
async function filterDeps(
  deps: Record<string, string> | undefined,
  clearUnused: boolean,
  outdirBin: string,
): Promise<Record<string, string>> {
  if (!deps) return {};

  if (!clearUnused) {
    // Only filter out eslint and prettier
    return Object.entries(deps).reduce<Record<string, string>>(
      (acc, [k, v]) => {
        if (
          !k.toLowerCase().includes("eslint") &&
          !k.toLowerCase().includes("prettier")
        ) {
          acc[k] = v;
        }
        return acc;
      },
      {},
    );
  }

  // Get all JS/TS files in outdirBin
  const files = await glob("**/*.{js,ts}", {
    cwd: outdirBin,
    absolute: true,
  });

  // Extract all imports from files
  const usedPackages = new Set<string>();
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");

    // Match import statements
    const importMatches = content.matchAll(
      /from\s+['"](@[^'"]+|[^'".][^'"]*)['"]/g,
    );
    for (const match of importMatches) {
      const importPath = match[1];
      const pkg = extractPackageName(importPath);
      if (pkg) {
        usedPackages.add(pkg);
      }
    }

    // Match require statements
    const requireMatches = content.matchAll(
      /require\s*\(\s*['"](@[^'"]+|[^'".][^'"]*)['"]\s*\)/g,
    );
    for (const match of requireMatches) {
      const requirePath = match[1];
      const pkg = extractPackageName(requirePath);
      if (pkg) {
        usedPackages.add(pkg);
      }
    }
  }

  // Keep only used packages and always filter out eslint/prettier
  return Object.entries(deps).reduce<Record<string, string>>((acc, [k, v]) => {
    if (
      usedPackages.has(k) &&
      !k.toLowerCase().includes("eslint") &&
      !k.toLowerCase().includes("prettier")
    ) {
      acc[k] = v;
    }
    return acc;
  }, {});
}

// ============================
// Package & TSConfig Generation
// ============================

/**
 * Creates a package.json for the main distribution.
 */
async function createPackageJSON(
  outdirRoot: string,
  isJSR: boolean,
): Promise<void> {
  logger.info(
    "Generating distribution package.json and tsconfig.json...",
    true,
  );
  const commonPkg = await createCommonPackageFields();
  const originalPkg = await readPackageJSON();

  // Extract CLI command name from package.json name
  // If it's a scoped package like @reliverse/cleaner, extract "cleaner"
  // Otherwise use the name as is
  const packageName = originalPkg.name || "";
  const cliCommandName = packageName.startsWith("@")
    ? packageName.split("/").pop() || "cli"
    : packageName;

  const outdirBin = path.join(outdirRoot, "bin");

  if (isJSR) {
    const jsrPkg = definePackageJSON({
      ...commonPkg,
      exports: {
        ".": "./bin/main.ts",
      },
      dependencies: await filterDeps(
        originalPkg.dependencies,
        false,
        outdirBin,
      ),
      devDependencies: await filterDeps(
        originalPkg.devDependencies,
        false,
        outdirBin,
      ),
    });
    await fs.writeJSON(path.join(outdirRoot, "package.json"), jsrPkg, {
      spaces: 2,
    });
  } else {
    const npmPkg = definePackageJSON({
      ...commonPkg,
      main: "./bin/main.js",
      module: "./bin/main.js",
      exports: {
        ".": "./bin/main.js",
      },
      bin: pubConfig.isCLI
        ? {
            [cliCommandName]: "bin/main.js",
          }
        : undefined,
      files: ["bin", "package.json", "README.md", "LICENSE"],
      publishConfig: {
        access: "public",
      },
    });
    await fs.writeJSON(path.join(outdirRoot, "package.json"), npmPkg, {
      spaces: 2,
    });
  }
}

/**
 * Creates a tsconfig.json file for the distribution.
 */
async function createTSConfig(
  outdirRoot: string,
  allowImportingTsExtensions: boolean,
): Promise<void> {
  const tsConfig = defineTSConfig({
    compilerOptions: {
      allowImportingTsExtensions,
      target: "ES2023",
      module: "NodeNext",
      moduleResolution: "nodenext",
      lib: ["DOM", "DOM.Iterable", "ES2023"],
      resolveJsonModule: true,
      verbatimModuleSyntax: true,
      isolatedModules: true,
      noPropertyAccessFromIndexSignature: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      esModuleInterop: true,
      skipLibCheck: true,
      jsx: "preserve",
      allowJs: true,
      strict: true,
      noEmit: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noUncheckedIndexedAccess: true,
      strictNullChecks: true,
      noImplicitAny: true,
      exactOptionalPropertyTypes: true,
      allowUnreachableCode: false,
      allowUnusedLabels: false,
    },
    include: ["./bin/**/*.ts"],
    exclude: ["**/node_modules"],
  });
  await fs.writeJSON(path.join(outdirRoot, tsconfigJson), tsConfig, {
    spaces: 2,
  });
}

/**
 * Finds a file in the current directory regardless of case.
 */
async function findFileCaseInsensitive(
  targetFile: string,
): Promise<string | null> {
  const files = await fs.readdir(".");
  const found = files.find(
    (file) => file.toLowerCase() === targetFile.toLowerCase(),
  );
  return found || null;
}

/**
 * Copies README and LICENSE files to the output directory.
 */
async function copyReadmeLicense(outdirRoot: string): Promise<void> {
  logger.info("Copying README.md and LICENSE files...", true);
  const readmeFile = await findFileCaseInsensitive("README.md");
  if (readmeFile) {
    await fs.copy(readmeFile, path.join(outdirRoot, "README.md"));
    logger.verbose(`Copied ${readmeFile} as README.md`, true);
  } else {
    logger.warn("README.md not found", true);
  }
  let licenseFile = await findFileCaseInsensitive("LICENSE");
  if (!licenseFile) {
    licenseFile = await findFileCaseInsensitive("LICENSE.md");
  }
  if (licenseFile) {
    await fs.copy(licenseFile, path.join(outdirRoot, "LICENSE"));
    logger.verbose(`Copied ${licenseFile} as LICENSE`, true);
  } else {
    logger.warn("No license file found", true);
  }
}

// ============================
// File Conversion & Renaming
// ============================

/**
 * Converts .js import paths to .ts in files within the given directory for JSR builds.
 */
async function convertJsToTsImports(
  outdirBin: string,
  isJSR: boolean,
): Promise<void> {
  const entries = await fs.readdir(outdirBin);
  for (const entry of entries) {
    const filePath = path.join(outdirBin, entry);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await convertJsToTsImports(filePath, isJSR);
    } else if (
      stat.isFile() &&
      /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(entry)
    ) {
      if (filePath.includes("template/")) continue;
      const content = await fs.readFile(filePath, "utf8");
      if (isJSR) {
        const finalContent = content.replace(
          /(from\s*['"])([^'"]+?)\.js(?=['"])/g,
          "$1$2.ts",
        );
        logger.verbose("Converted .js imports to .ts for JSR build", true);
        await fs.writeFile(filePath, finalContent, "utf8");
      } else {
        await fs.writeFile(filePath, content, "utf8");
      }
    }
  }
}

/**
 * Renames .tsx files by replacing the .tsx extension with -tsx.txt.
 */
async function renameTsxFiles(dir: string): Promise<void> {
  const files = await glob(["**/*.tsx"], {
    cwd: dir,
    absolute: true,
  });
  await Promise.all(
    files.map(async (filePath) => {
      const newPath = filePath.replace(/\.tsx$/, "-tsx.txt");
      await fs.rename(filePath, newPath);
      logger.verbose(`Renamed: ${filePath} -> ${newPath}`, true);
    }),
  );
}

/**
 * Generates a jsr.jsonc configuration file for JSR distributions.
 */
async function createJsrConfig(
  outdirRoot: string,
  projectName: string,
  isLib: boolean,
): Promise<void> {
  const originalPkg = await readPackageJSON();
  let { name, description } = originalPkg;
  const { author, version, license } = originalPkg;
  if (isLib) {
    name = projectName;
    description = "A helper library for the Reliverse CLI";
  }
  const pkgHomepage = cliDomainDocs;
  const jsrConfig = {
    name,
    author,
    version,
    license: license || "MIT",
    description,
    homepage: pkgHomepage,
    exports: "./bin/main.ts",
    publish: {
      exclude: ["!.", "node_modules/**", ".env"],
    },
  };
  await fs.writeJSON(path.join(outdirRoot, "jsr.jsonc"), jsrConfig, {
    spaces: 2,
  });
  logger.verbose("Generated jsr.jsonc file", true);
}

/**
 * Copies additional JSR-specific files to the output directory.
 */
async function copyJsrFiles(
  outdirRoot: string,
  projectName: string,
  isLib: boolean,
): Promise<void> {
  if (pubConfig.isCLI) {
    await fs.writeFile(
      path.join(outdirRoot, ".gitignore"),
      "node_modules/\n.env\n",
      "utf-8",
    );
    logger.verbose("Generated .gitignore for JSR", true);
  }

  await createJsrConfig(outdirRoot, projectName, isLib);

  let jsrFiles: string[];
  if (pubConfig.isCLI) {
    jsrFiles = [cliConfigJsonc, "bun.lock", "drizzle.config.ts", "schema.json"];
  } else {
    jsrFiles = [cliConfigJsonc];
  }

  await Promise.all(
    jsrFiles.map(async (file) => {
      if (await fs.pathExists(file)) {
        await fs.copy(file, path.join(outdirRoot, file));
        logger.verbose(`Copied JSR file: ${file}`, true);
      }
    }),
  );
}

/**
 * Calculates the total size (in bytes) of a directory.
 */
async function getDirectorySize(outdirRoot: string): Promise<number> {
  try {
    const files = await fs.readdir(outdirRoot);
    const sizes = await Promise.all(
      files.map(async (file) => {
        const fp = path.join(outdirRoot, file);
        const stats = await fs.stat(fp);
        return stats.isDirectory() ? getDirectorySize(fp) : stats.size;
      }),
    );
    return sizes.reduce((total, s) => total + s, 0);
  } catch (error) {
    logger.error(
      `Failed to calculate directory size for ${outdirRoot}`,
      error,
      true,
    );
    return 0;
  }
}

/**
 * Computes a relative import path from a source file to a target sub-path.
 */
function getRelativeImportPath(
  sourceFile: string,
  subPath: string,
  baseDir: string,
  prefix = "",
): string {
  const targetPath = path.join(baseDir, subPath);
  let relativePath = path
    .relative(path.dirname(sourceFile), targetPath)
    .replace(/\\/g, "/");
  if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
    relativePath = `./${relativePath}`;
  }
  return prefix ? `${prefix}${relativePath}` : relativePath;
}

/**
 * Replaces symbol paths (e.g. "~/...") with relative paths.
 */
function replaceSymbolPaths(
  content: string,
  sourceFile: string,
  baseDir: string,
  symbolPrefix = "~/",
): { changed: boolean; newContent: string } {
  const escapedSymbol = symbolPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const symbolRegex = new RegExp(`(['"])(${escapedSymbol}[^'"]+)\\1`, "g");
  let changed = false;
  const newContent = content.replace(
    symbolRegex,
    (_match, quote, matchedSymbol) => {
      const subPath = matchedSymbol.slice(symbolPrefix.length);
      const relativeImport = getRelativeImportPath(
        sourceFile,
        subPath,
        baseDir,
      );
      changed = true;
      return `${quote}${relativeImport}${quote}`;
    },
  );
  return { changed, newContent };
}

/**
 * Converts symbol paths in built files (both JSR and NPM).
 */
export async function convertSymbolPaths(
  outdirBin: string,
  isJSR: boolean,
  symbolPrefix = "~/",
): Promise<void> {
  logger.info(
    isJSR
      ? "Converting symbol paths in JSR built files..."
      : "Converting symbol paths in NPM built files...",
    true,
  );
  if (!(await fs.pathExists(outdirBin))) {
    logger.error(
      `[convertSymbolPaths] Directory does not exist: ${outdirBin}`,
      true,
    );
    return;
  }
  const filePatterns = ["**/*.{js,ts,jsx,tsx,mjs,cjs}"];
  const files = await glob(filePatterns, {
    cwd: outdirBin,
    absolute: true,
  });
  if (files.length === 0) {
    logger.info(`No matching files found in: ${outdirBin}`, true);
    return;
  }
  await Promise.all(
    files.map(async (file) => {
      try {
        if (!(await fs.pathExists(file))) {
          logger.verbose(`File does not exist (skipped): ${file}`, true);
          return;
        }
        const content = await fs.readFile(file, "utf8");
        if (!content.includes(symbolPrefix)) return;
        const { changed, newContent } = replaceSymbolPaths(
          content,
          file,
          outdirBin,
          symbolPrefix,
        );
        if (changed) {
          await fs.writeFile(file, newContent, "utf8");
          logger.verbose(`Converted symbol paths in: ${file}`, true);
        }
      } catch (error: any) {
        if (error.code === "ENOENT") {
          logger.verbose(
            `File not found during processing (skipped): ${file}`,
            true,
          );
          return;
        }
        logger.error(
          `Error processing file ${file}: ${error.message || String(error)}`,
          true,
        );
      }
    }),
  );
}

// ============================
// Bundling Functions
// ============================

/**
 * Bundles source files using mkdist.
 *
 * @param src The source file or directory to bundle.
 * @param dest The destination directory for the bundled files.
 */
async function bundleUsingMkdist(src: string, dest: string) {
  logger.info(`Bundling using mkdist: ${src} -> ${dest}`, true);
  await execaCommand(
    `bunx mkdist --src=${src} --dist=${dest} --format=esm --declaration --ext=js --clean=false`,
    { stdio: "inherit" },
  );
}

/**
 * Bundles source files by copying them.
 *
 * This function checks whether the source is a file or directory.
 * If the source is a file, it uses fs.copyFile; otherwise, it uses fs.copy.
 * This prevents errors when the entry file is a file (as in library builds).
 */
async function bundleUsingCopy(src: string, dest: string) {
  await fs.ensureDir(path.dirname(dest));
  const stats = await fs.stat(src);
  if (stats.isFile()) {
    if (await fs.pathExists(dest)) {
      await fs.remove(dest);
    }
    await fs.copyFile(src, dest);
    logger.verbose(`Copied file from ${src} to ${dest}`, true);
  } else {
    await fs.copy(src, dest);
    logger.verbose(`Copied directory from ${src} to ${dest}`, true);
  }
}

/**
 * Bundles using 'unbuild'.
 */
async function bundleUsingUnbuild(entryFile: string, outdirBin: string) {
  if (!(await fs.pathExists(entryFile))) {
    logger.error(`Could not find entry file at: ${entryFile}`, true);
    throw new Error(`Entry file not found: ${entryFile}`);
  }
  await execaCommand("bunx unbuild", { stdio: "inherit" });
  const fileCount = await outdirBinFilesCount(outdirBin);
  logger.verbose(`unbuild completed with ${fileCount} output file(s).`, true);
}

/**
 * Bundles using Bun's bundler.
 */
async function bundleUsingBun(
  cfg: BuildPublishConfig,
  entryFile: string,
  outdirBin: string,
  packageName = "",
) {
  if (!(await fs.pathExists(entryFile))) {
    logger.error(`Could not find entry file at: ${entryFile}`, true);
    throw new Error(`Entry file not found: ${entryFile}`);
  }
  try {
    const buildResult = await bunBuild({
      entrypoints: [entryFile],
      outdir: outdirBin,
      target: cfg.target,
      format: cfg.format,
      splitting: cfg.splitting,
      minify: cfg.shouldMinify,
      sourcemap: getBunSourcemapOption(cfg.sourcemap),
      throw: true,
      naming: {
        entry: "[dir]/[name]-[hash].[ext]",
        chunk: "[name]-[hash].[ext]",
        asset: "[name]-[hash].[ext]",
      },
      publicPath: pubConfig.publicPath || "/",
      define: {
        "process.env.NODE_ENV": JSON.stringify(
          process.env.NODE_ENV || "production",
        ),
      },
      banner: "/* Bundled by @reliverse/relidler */",
      footer: "/* End of bundle */",
      drop: ["debugger"],
    });
    logger.verbose(
      `${packageName} bun build completed with ${buildResult.outputs.length} output file(s).`,
      true,
    );
    if (buildResult.logs && buildResult.logs.length > 0) {
      buildResult.logs.forEach((log, index) => {
        logger.verbose(`Log ${index + 1}: ${JSON.stringify(log)}`, true);
      });
    }
  } catch (error) {
    logger.error(
      `${packageName} build failed while using bun bundler:`,
      error,
      true,
    );
    throw error;
  }
}

// ============================
// Distribution Build Functions (Main Project)
// ============================

/**
 * Builds the JSR distribution.
 */
async function buildJsrDist(): Promise<void> {
  const cfg = { ...defineConfig(true), lastBuildFor: "jsr" as const };
  const outdirRoot = cfg.jsrDistDir;
  const outdirBin = `${outdirRoot}/bin`;
  await cleanDir(outdirRoot);

  logger.info("Creating JSR distribution...", true);
  const entryFile = path.join(cfg.rootSrcDir, "main.ts");

  if (cfg.builderJsr === "jsr") {
    await bundleUsingCopy(cfg.rootSrcDir, outdirBin);
  } else if (cfg.builderJsr === "bun") {
    await bundleUsingBun(cfg, entryFile, outdirBin);
  } else {
    await bundleUsingUnbuild(entryFile, outdirBin);
  }

  await copyReadmeLicense(outdirRoot);
  await createPackageJSON(outdirRoot, true);
  await createTSConfig(outdirRoot, true);
  await copyJsrFiles(outdirRoot, "", false);
  await renameTsxFiles(outdirBin);
  await convertJsToTsImports(outdirBin, true);
  await convertSymbolPaths(outdirBin, true);
  await deleteSpecificFiles(outdirBin);

  const size = await getDirectorySize(outdirRoot);
  logger.success(`Successfully created JSR distribution (${size} bytes)`, true);
}

/**
 * Builds the NPM distribution.
 */
async function buildNpmDist(): Promise<void> {
  const cfg = { ...defineConfig(false), lastBuildFor: "npm" as const };
  const outdirRoot = cfg.npmDistDir;
  const outdirBin = `${outdirRoot}/bin`;
  await cleanDir(outdirRoot);

  const entrySrcDir = cfg.rootSrcDir;
  logger.info("Creating NPM distribution...", true);
  const entryFile = path.join(entrySrcDir, "main.ts");
  if (!(await fs.pathExists(entryFile))) {
    logger.error(`Could not find entry file at: ${entryFile}`, true);
    throw new Error(`Entry file not found: ${entryFile}`);
  }
  logger.info(
    `Starting ${cfg.builderNpm} bundling for entry file: ${entryFile}\n`,
    true,
  );
  if (cfg.builderNpm !== "bun") {
    await bundleUsingUnbuild(entryFile, outdirBin);
  } else {
    await bundleUsingBun(cfg, entryFile, outdirBin);
  }

  await copyReadmeLicense(outdirRoot);
  await createPackageJSON(outdirRoot, false);
  await convertSymbolPaths(outdirBin, false);
  await deleteSpecificFiles(outdirBin);

  const size = await getDirectorySize(outdirRoot);
  logger.success(`Successfully created NPM distribution (${size} bytes)`, true);
}

/**
 * Publishes the JSR distribution.
 */
async function publishToJsr(dryRun: boolean): Promise<void> {
  logger.info("Publishing to JSR...", true);
  try {
    if (!pubConfig.pausePublish) {
      const jsrDistDir = path.resolve(ROOT_DIR, "dist-jsr");
      await withWorkingDirectory(jsrDistDir, async () => {
        const command = [
          "bunx jsr publish",
          dryRun ? "--dry-run" : "",
          pubConfig.allowDirty ? "--allow-dirty" : "",
          pubConfig.jsrSlowTypes ? "--allow-slow-types" : "",
        ]
          .filter(Boolean)
          .join(" ");
        await execaCommand(command, { stdio: "inherit" });
        logger.success(
          `Successfully ${dryRun ? "validated" : "published"} to JSR registry`,
          true,
        );
      });
    }
  } catch (error) {
    logger.error("Failed to publish to JSR:", error, true);
    throw error;
  }
}

/**
 * Recursively counts the number of files in a directory.
 */
export async function outdirBinFilesCount(outdirBin: string): Promise<number> {
  let fileCount = 0;
  if (!(await fs.pathExists(outdirBin))) {
    logger.error(
      `[outdirBinFilesCount] Directory does not exist: ${outdirBin}`,
      true,
    );
    return fileCount;
  }
  async function traverse(dir: string) {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await traverse(fullPath);
      } else if (stats.isFile()) {
        fileCount++;
      }
    }
  }
  await traverse(outdirBin);
  return fileCount;
}

/**
 * Publishes the NPM distribution.
 */
async function publishToNpm(dryRun: boolean): Promise<void> {
  try {
    if (!pubConfig.pausePublish) {
      const npmDistDir = path.resolve(ROOT_DIR, "dist-npm");
      await withWorkingDirectory(npmDistDir, async () => {
        const command = ["bun publish", dryRun ? "--dry-run" : ""]
          .filter(Boolean)
          .join(" ");
        await execaCommand(command, { stdio: "inherit" });
        logger.success(
          `Successfully ${dryRun ? "validated" : "published"} to NPM registry`,
          true,
        );
      });
    }
  } catch (error) {
    logger.error("Failed to publish to NPM:", error, true);
    throw error;
  }
}

// ============================
// Library Build/Publish Functions
// ============================

/**
 * Creates a package.json for a library distribution.
 */
async function createLibPackageJSON(
  libName: string,
  outdirRoot: string,
  isJSR: boolean,
): Promise<void> {
  logger.info(
    `Generating package.json for lib ${libName} (${isJSR ? "JSR" : "NPM"})...`,
    true,
  );
  const originalPkg = await readPackageJSON();
  let { description } = originalPkg;
  const { version, license, keywords, author } = originalPkg;
  if (!pubConfig.isCLI) {
    description = "A helper library for the Reliverse CLI";
  }
  const commonPkg: Partial<PackageJson> = {
    name: libName,
    version,
    license: license || "MIT",
    description,
    type: "module",
  };

  if (author) {
    Object.assign(commonPkg, {
      author,
      repository: {
        type: "git",
        url: `git+https://github.com/${author}/${originalPkg.name}.git`,
      },
      bugs: {
        url: `https://github.com/${author}/${originalPkg.name}/issues`,
        email: "blefnk@gmail.com",
      },
      keywords: [...new Set([...(keywords || []), author])],
    });
  } else if (keywords && keywords.length > 0) {
    commonPkg.keywords = keywords;
  }

  const outdirBin = path.join(outdirRoot, "bin");
  if (isJSR) {
    const jsrPkg = definePackageJSON({
      ...commonPkg,
      exports: {
        ".": "./bin/main.ts",
      },
      dependencies: await filterDeps(originalPkg.dependencies, true, outdirBin),
      devDependencies: await filterDeps(
        originalPkg.devDependencies,
        true,
        outdirBin,
      ),
    });
    await fs.writeJSON(path.join(outdirRoot, "package.json"), jsrPkg, {
      spaces: 2,
    });
  } else {
    const npmPkg = definePackageJSON({
      ...commonPkg,
      main: "./bin/main.js",
      module: "./bin/main.js",
      exports: {
        ".": "./bin/main.js",
      },
      bin: pubConfig.isCLI
        ? {
            [libName.split("/").pop()!]: "bin/main.js",
          }
        : undefined,
      files: ["bin", "package.json", "README.md", "LICENSE"],
      publishConfig: {
        access: "public",
      },
      dependencies: await filterDeps(originalPkg.dependencies, true, outdirBin),
      devDependencies: await filterDeps(
        originalPkg.devDependencies,
        true,
        outdirBin,
      ),
    });
    await fs.writeJSON(path.join(outdirRoot, "package.json"), npmPkg, {
      spaces: 2,
    });
  }
}

async function renameEntryFile(
  isJSR: boolean,
  outdirBin: string,
  entryDir: string,
  entryFile: string,
): Promise<{ updatedEntryFile: string }> {
  if (!isJSR) {
    // replace *.ts to *.js
    entryFile = entryFile.replace(".ts", ".js");

    // rename *.d.ts to main.d.ts
    const entryFileNoExt = entryFile.split(".").slice(0, -1).join(".");
    if (await fs.pathExists(path.join(outdirBin, `${entryFileNoExt}.d.ts`))) {
      await fs.rename(
        path.join(outdirBin, `${entryFileNoExt}.d.ts`),
        path.join(outdirBin, "main.d.ts"),
      );
    }
  }

  // rename *.{js,ts} to main.{js,ts}
  if (entryFile.endsWith(".js")) {
    await fs.rename(
      path.join(outdirBin, entryFile),
      path.join(outdirBin, "main.js"),
    );
    entryFile = "main.js";
  } else if (entryFile.endsWith(".ts")) {
    await fs.rename(
      path.join(outdirBin, entryFile),
      path.join(outdirBin, "main.ts"),
    );
    entryFile = "main.ts";
  }

  logger.info(`Renamed entry file to ${entryDir + entryFile}`, true);
  return { updatedEntryFile: entryFile };
}

/**
 * Builds the NPM distribution for a library.
 */
async function buildLibNpmDist(
  libName: string,
  entryDir: string,
  outdirRoot: string,
  entryFile: string,
): Promise<void> {
  const outdirBin = path.join(outdirRoot, "bin");
  await cleanDir(outdirRoot);

  const entryFilePath = path.join(entryDir, entryFile);
  if (!(await fs.pathExists(entryFilePath))) {
    logger.error(`Lib ${libName}: entry file not found at ${entryFilePath}`);
    throw new Error(`Entry file not found: ${entryFilePath}`);
  }
  logger.info(
    `Building NPM distribution for lib ${libName} using entry ${entryFilePath}`,
    true,
  );
  const cfg = { ...pubConfig, lastBuildFor: "npm" } as BuildPublishConfig;
  await fs.ensureDir(path.dirname(outdirBin));
  if (cfg.builderNpm !== "bun") {
    await bundleUsingMkdist(entryDir, outdirBin);
  } else {
    await bundleUsingBun(cfg, entryFilePath, outdirBin, libName);
  }

  const { updatedEntryFile } = await renameEntryFile(
    false,
    outdirBin,
    entryDir,
    entryFile,
  );
  entryFile = updatedEntryFile;

  await copyReadmeLicense(outdirRoot);
  await createLibPackageJSON(libName, outdirRoot, false);
  await convertSymbolPaths(outdirBin, false);
  await deleteSpecificFiles(outdirBin);

  const size = await getDirectorySize(outdirRoot);
  logger.success(
    `Successfully created NPM distribution for lib ${libName} (${size} bytes)`,
    true,
  );
}

/**
 * Builds the JSR distribution for a library.
 */
async function buildLibJsrDist(
  libName: string,
  entryDir: string,
  outdirRoot: string,
  entryFile: string,
): Promise<void> {
  const outdirBin = path.join(outdirRoot, "bin");
  await cleanDir(outdirRoot);
  logger.info(
    `Building JSR distribution for lib ${libName} using entry ${path.join(
      entryDir,
      entryFile,
    )}`,
    true,
  );
  const cfg = { ...pubConfig, lastBuildFor: "jsr" } as BuildPublishConfig;

  if (cfg.builderJsr === "jsr") {
    await bundleUsingCopy(
      path.join(entryDir, entryFile),
      path.join(outdirBin, entryFile),
    );
  } else if (cfg.builderJsr === "bun") {
    await bundleUsingBun(
      cfg,
      path.join(entryDir, entryFile),
      outdirBin,
      libName,
    );
  } else {
    await bundleUsingUnbuild(path.join(entryDir, entryFile), outdirBin);
  }

  const { updatedEntryFile } = await renameEntryFile(
    true,
    outdirBin,
    entryDir,
    entryFile,
  );
  entryFile = updatedEntryFile;

  await copyReadmeLicense(outdirRoot);
  await createLibPackageJSON(libName, outdirRoot, true);
  await copyJsrFiles(outdirRoot, libName, true);
  await renameTsxFiles(outdirBin);
  await convertJsToTsImports(outdirBin, true);
  await convertSymbolPaths(outdirBin, true);
  await deleteSpecificFiles(outdirBin);

  const size = await getDirectorySize(outdirRoot);
  logger.success(
    `Successfully created JSR distribution for lib ${libName} (${size} bytes)`,
    true,
  );
}

/**
 * Publishes a library to NPM.
 */
async function publishLibToNpm(
  libOutDir: string,
  dryRun: boolean,
  libName: string,
): Promise<void> {
  await withWorkingDirectory(libOutDir, async () => {
    logger.info(`Publishing lib ${libName} to NPM from ${libOutDir}`, true);
    const command = ["bun publish", dryRun ? "--dry-run" : ""]
      .filter(Boolean)
      .join(" ");
    await execaCommand(command, { stdio: "inherit" });
    logger.success(
      `Successfully ${dryRun ? "validated" : "published"} lib ${libName} to NPM`,
      true,
    );
  });
}

/**
 * Publishes a library to JSR.
 */
async function publishLibToJsr(
  libOutDir: string,
  dryRun: boolean,
  libName: string,
): Promise<void> {
  await withWorkingDirectory(libOutDir, async () => {
    logger.info(`Publishing lib ${libName} to JSR from ${libOutDir}`, true);
    const command = [
      "bunx jsr publish",
      dryRun ? "--dry-run" : "",
      pubConfig.allowDirty ? "--allow-dirty" : "",
      pubConfig.jsrSlowTypes ? "--allow-slow-types" : "",
    ]
      .filter(Boolean)
      .join(" ");
    await execaCommand(command, { stdio: "inherit" });
    logger.success(
      `Successfully ${dryRun ? "validated" : "published"} lib ${libName} to JSR`,
      true,
    );
  });
}

/**
 * Processes all libraries defined in build.libs.jsonc.
 */
type LibEntry = {
  main: string;
  [key: string]: unknown;
};
async function buildPublishLibs(): Promise<void> {
  const libsFile = path.resolve(ROOT_DIR, "build.libs.jsonc");
  if (!(await fs.pathExists(libsFile))) {
    logger.verbose(
      "No build.libs.jsonc file found, skipping libs build.",
      true,
    );
    return;
  }
  logger.info("build.libs.jsonc detected, processing libraries...", true);

  const libsContent = await fs.readFile(libsFile, "utf8");
  const libsJson = parseJSONC(libsContent) as Record<string, LibEntry>;
  const libs = Object.entries(libsJson);
  const dry = !!pubConfig.dryRun;

  for (const [libName, config] of libs) {
    if (!config.main) {
      logger.warn(
        `Library ${libName} is missing "main" property. Skipping...`,
        true,
      );
      continue;
    }
    let folderName = libName;
    if (libName.startsWith("@")) {
      const parts = libName.split("/");
      if (parts.length > 1) folderName = parts[1]!;
    }
    const libBaseDir = path.resolve(ROOT_DIR, "dist-libs", folderName);
    const npmOutDir = path.join(libBaseDir, "npm");
    const jsrOutDir = path.join(libBaseDir, "jsr");

    // Parse the main path to separate file from directory
    const mainPath = path.parse(config.main);
    const mainFile = mainPath.base; // File with extension
    const mainDir = mainPath.dir || "."; // Directory path, defaults to '.' if empty

    await buildLibNpmDist(libName, mainDir, npmOutDir, mainFile);
    await buildLibJsrDist(libName, mainDir, jsrOutDir, mainFile);

    if (!pubConfig.pausePublish) {
      if (pubConfig.registry === "npm-jsr") {
        logger.info(`Publishing lib ${libName} to both NPM and JSR...`, true);
        await publishLibToNpm(npmOutDir, dry, libName);
        await publishLibToJsr(jsrOutDir, dry, libName);
      } else if (pubConfig.registry === "npm") {
        logger.info(`Publishing lib ${libName} to NPM only...`, true);
        await publishLibToNpm(npmOutDir, dry, libName);
      } else if (pubConfig.registry === "jsr") {
        logger.info(`Publishing lib ${libName} to JSR only...`, true);
        await publishLibToJsr(jsrOutDir, dry, libName);
      } else {
        logger.warn(
          `Registry "${pubConfig.registry}" not recognized for lib ${libName}. Skipping publishing for this lib.`,
          true,
        );
      }
    }
  }
}

// ============================
// Main Function
// ============================

/**
 * Main build/publish function.
 */
export async function main(): Promise<void> {
  try {
    await removeDistFolders();
    await bumpHandler();
    const registry = pubConfig.registry || "npm-jsr";
    const dry = !!pubConfig.dryRun;
    if (registry === "npm-jsr") {
      logger.info("Publishing to both NPM and JSR...", true);
      await buildJsrDist();
      await buildNpmDist();
      await publishToJsr(dry);
      await publishToNpm(dry);
    } else if (registry === "npm") {
      logger.info("Publishing to NPM only...", true);
      await buildNpmDist();
      await publishToNpm(dry);
    } else if (registry === "jsr") {
      logger.info("Publishing to JSR only...", true);
      await buildJsrDist();
      await publishToJsr(dry);
    } else {
      logger.warn(
        `Registry "${registry}" not recognized. Building only...`,
        true,
      );
      await buildNpmDist();
      await buildJsrDist();
    }
    await buildPublishLibs();

    if (!pubConfig.pausePublish) {
      await removeDistFolders();
      await setBumpDisabled(false);
      logger.success("Publishing process completed successfully!", true);
    } else {
      logger.success(
        "Test build completed successfully! Publish is paused in the config.",
        true,
      );
    }
  } catch (error) {
    logger.error("An unexpected error occurred:", error, true);
    process.exit(1);
  }
}

if (import.meta.main) {
  main()
    .then(() => logger.success("build.publish.ts completed\n", true))
    .catch((error) => {
      logger.error("Failed to run script:", error, true);
      process.exit(1);
    });
}
