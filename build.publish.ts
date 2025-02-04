import { re } from "@reliverse/relico";
import { build as bunBuild } from "bun";
import { parseJSONC, parseJSON5 } from "confbox";
import { destr } from "destr";
import { execaCommand } from "execa";
import fs from "fs-extra";
import { globby } from "globby";
import mri from "mri";
import path from "pathe";
import {
  readPackageJSON,
  defineTSConfig,
  definePackageJSON,
  type PackageJson,
} from "pkg-types";
import semver from "semver";
import { fileURLToPath } from "url";

import {
  pubConfig,
  getBunSourcemapOption,
  type BuildPublishConfig,
} from "./build.config.js";

// ---------- Constants & Global Setup ----------
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_FOLDERS = ["dist-npm", "dist-jsr"];

// ---------- Parse CLI Flags ----------
// Extended CLI flags for bumping, registry selection, verbose output, etc.
const scriptFlags = mri(process.argv.slice(2), {
  string: ["bump", "registry"],
  boolean: ["verbose", "dryRun", "allowDirty", "jsrSlowTypes"],
  alias: {
    v: "verbose",
    d: "dryRun",
    r: "registry",
  },
  default: {},
});

// Override pubConfig values with CLI flags if provided.
if (scriptFlags["verbose"] !== undefined) {
  pubConfig.verbose = scriptFlags["verbose"];
}
if (scriptFlags["dryRun"] !== undefined) {
  pubConfig.dryRun = scriptFlags["dryRun"];
}
if (scriptFlags["registry"]) {
  // Validate registry value
  if (["npm", "jsr", "npm-jsr"].includes(scriptFlags["registry"])) {
    pubConfig.registry = scriptFlags["registry"];
  } else {
    console.warn(
      `Warning: Unrecognized registry "${scriptFlags["registry"]}". Using default: ${pubConfig.registry}`,
    );
  }
}
if (scriptFlags["allowDirty"] !== undefined) {
  pubConfig.allowDirty = scriptFlags["allowDirty"];
}
if (scriptFlags["jsrSlowTypes"] !== undefined) {
  pubConfig.jsrSlowTypes = scriptFlags["jsrSlowTypes"];
}

// ---------- Logger Utility ----------
const logger = {
  info: (msg: string, newLine = false) =>
    console.log(`${newLine ? "\n" : ""}📝  ${re.cyanBright(msg)}`),
  success: (msg: string, newLine = false) =>
    console.log(`${newLine ? "\n" : ""}✅  ${re.greenBright(msg)}`),
  warn: (msg: string, newLine = false) =>
    console.log(`${newLine ? "\n" : ""}🔔  ${re.yellowBright(msg)}`),
  error: (msg: string, err?: unknown, newLine = false) =>
    console.error(
      `${newLine ? "\n" : ""}❌  ${msg}`,
      err instanceof Error ? err.message : err,
    ),
  verbose: (msg: string, newLine = false) => {
    if (pubConfig.verbose) {
      console.log(`${newLine ? "\n" : ""}🔍  ${re.magentaBright(msg)}`);
    }
  },
};

// ---------- Dist Folders Existence Check & Cleanup ----------
async function handleDistFoldersRemoving(): Promise<void> {
  try {
    await Promise.all(
      DIST_FOLDERS.map(async (folder) => {
        const folderPath = path.resolve(CURRENT_DIR, folder);
        if (await fs.pathExists(folderPath)) {
          await fs.remove(folderPath);
          logger.verbose(`Removed: ${folderPath}`, true);
        }
      }),
    );
    logger.success("Distribution folders cleaned up successfully", true);
  } catch (error) {
    logger.warn(`Failed to remove some dist folders: ${String(error)}`, true);
  }
}

async function removeDistFolders(): Promise<boolean> {
  const existingFolders: string[] = [];
  for (const folder of DIST_FOLDERS) {
    const folderPath = path.resolve(CURRENT_DIR, folder);
    if (await fs.pathExists(folderPath)) {
      existingFolders.push(folder);
    }
  }
  if (existingFolders.length > 0) {
    logger.info(
      `Found existing distribution folders: ${existingFolders.join(", ")}`,
      true,
    );
    await handleDistFoldersRemoving();
  }
  return true;
}

// ---------- Delete Specific Files ----------
async function deleteSpecificFiles(outdirBin: string): Promise<void> {
  const patterns = [
    "**/*.test.js",
    "**/*.test.ts",
    "**/*.test.d.ts",
    "**/*-temp.js",
    "**/*-temp.ts",
    "**/*-temp.d.ts",
  ];
  const files = await globby(patterns, {
    cwd: outdirBin,
    absolute: true,
    gitignore: true,
  });
  if (files.length > 0) {
    await Promise.all(files.map((file) => fs.remove(file)));
    logger.verbose(`Deleted files:\n${files.join("\n")}`, true);
  }
}

// ---------- Bump Versions in Files ----------
async function bumpVersions(
  oldVersion: string,
  newVersion: string,
): Promise<void> {
  try {
    const codebase = await globby(["**/*.{ts,json,jsonc,json5,reliverse}"], {
      ignore: [
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
      ],
      gitignore: true,
    });

    /**
     * Update the version in a given file if it matches the oldVersion.
     */
    const updateFile = async (
      filePath: string,
      content: string,
    ): Promise<boolean> => {
      try {
        // Handle JSON-like files
        if (/\.(json|jsonc|json5|reliverse)$/.test(filePath)) {
          let parsed: { version?: string } | null = null;

          if (filePath.endsWith(".json")) {
            parsed = destr(content);
          } else if (
            filePath.endsWith(".jsonc") ||
            filePath.endsWith(".reliverse") // TODO: current implementation doesn't work for `.reliverse` (JSONC)
          ) {
            parsed = parseJSONC(content);
          } else if (filePath.endsWith(".json5")) {
            parsed = parseJSON5(content);
          }

          if (!parsed || typeof parsed !== "object") {
            return false;
          }

          if (parsed.version === oldVersion) {
            const updated = content.replace(
              new RegExp(`"version"\\s*:\\s*"${oldVersion}"`, "g"),
              `"version": "${newVersion}"`,
            );
            await fs.writeFile(filePath, updated, "utf8");
            logger.verbose(`Updated version in ${filePath}`, true);
            return true;
          }
        }
        // Handle TypeScript files
        else if (filePath.endsWith(".ts")) {
          // Look for version declarations in TypeScript files
          const versionRegexes = [
            // export const version = "1.0.0"
            new RegExp(
              `(export\\s+const\\s+version\\s*=\\s*["'])${oldVersion}(["'])`,
              "g",
            ),
            // const version = "1.0.0"
            new RegExp(
              `(const\\s+version\\s*=\\s*["'])${oldVersion}(["'])`,
              "g",
            ),
            // version: "1.0.0"
            new RegExp(`(version\\s*:\\s*["'])${oldVersion}(["'])`, "g"),
            // VERSION = "1.0.0"
            new RegExp(`(VERSION\\s*=\\s*["'])${oldVersion}(["'])`, "g"),
            // Exported cliVersion
            new RegExp(
              `(export\\s+const\\s+cliVersion\\s*=\\s*["'])${oldVersion}(["'])`,
              "g",
            ),
            new RegExp(
              `(const\\s+cliVersion\\s*=\\s*["'])${oldVersion}(["'])`,
              "g",
            ),
          ];

          let updated = content;
          let hasChanges = false;

          for (const regex of versionRegexes) {
            if (regex.test(content)) {
              updated = updated.replace(regex, `$1${newVersion}$2`);
              hasChanges = true;
            }
          }

          if (hasChanges) {
            await fs.writeFile(filePath, updated, "utf8");
            logger.verbose(`Updated version in ${filePath}`);
            return true;
          }
        }

        return false;
      } catch (error) {
        logger.warn(
          `Failed to process ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
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

// ---------- Auto-Increment Version Based on Config ----------
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

// ---------- Set Bump Disabled Flag in Config ----------
/**
 * Update the disableBump flag in the build configuration file.
 */
async function setBumpDisabled(value: boolean): Promise<void> {
  // Do not toggle disableBump if pausePublish is active and we're trying to disable bumping.
  if (pubConfig.pausePublish && value) {
    logger.verbose("Skipping disableBump toggle due to pausePublish", true);
    return;
  }

  const tsConfigPath = path.join(CURRENT_DIR, "build.config.ts");
  const jsConfigPath = path.join(CURRENT_DIR, "build.config.js");
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
  // Replace the disableBump value (a boolean) using a regex.
  content = content.replace(
    /disableBump\s*:\s*(true|false)/,
    `disableBump: ${value}`,
  );
  await fs.writeFile(configPath, content, "utf-8");
  logger.verbose(`Updated disableBump to ${value} in ${configPath}`, true);
}

// ---------- Bump Handler ----------
/**
 * Handles version bumping. If a CLI version is provided (via --bump), it is used;
 * otherwise, the version is auto-incremented using the configured bump mode.
 * The bump is skipped if disableBump is true or pausePublish is true.
 */
async function bumpHandler(): Promise<void> {
  if (pubConfig.disableBump || pubConfig.pausePublish) {
    logger.info(
      "Skipping version bump because a previous run already bumped the version or config paused it.",
      true,
    );
    return;
  }

  const cliVersion = scriptFlags["bump"];
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

// ---------- Build Config Definition ----------
function defineConfig(isJSR: boolean): BuildPublishConfig {
  return {
    ...pubConfig,
    isJSR,
    lastBuildFor: isJSR ? "jsr" : "npm",
  };
}

// ---------- Create Common Package Fields ----------
async function createCommonPackageFields(): Promise<Partial<PackageJson>> {
  const originalPkg = await readPackageJSON();
  const { name, author, version, license, description, keywords } = originalPkg;
  const pkgHomepage = "https://docs.reliverse.org/cli";
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

function filterDevDependencies(
  devDeps: Record<string, string> | undefined,
): Record<string, string> {
  if (!devDeps) return {};
  return Object.entries(devDeps).reduce<Record<string, string>>(
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

// ---------- Create Dist Package.json ----------
async function createPackageJSON(
  outdirRoot: string,
  isJSR: boolean,
): Promise<void> {
  logger.info("Generating distribution package.json, tsconfig.json...", true);

  const commonPkg = await createCommonPackageFields();
  const originalPkg = await readPackageJSON();

  if (isJSR) {
    const jsrPkg = definePackageJSON({
      ...commonPkg,
      exports: {
        ".": "./bin/main.ts",
      },
      devDependencies: filterDevDependencies(originalPkg.devDependencies),
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
      bin: {
        reliverse: "bin/main.js",
      },
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

// ---------- Create TSConfig ----------
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
  await fs.writeJSON(path.join(outdirRoot, "tsconfig.json"), tsConfig, {
    spaces: 2,
  });
}

// ---------- Copy README, LICENSE, etc. ----------
/**
 * Find a file in the current directory using a case-insensitive match.
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

async function copyReadmeLicense(outdirRoot: string): Promise<void> {
  logger.info("Copying README.md and LICENSE files...", true);

  // --- Copy README file (case-insensitive) ---
  const readmeFile = await findFileCaseInsensitive("README.md");
  if (readmeFile) {
    await fs.copy(readmeFile, path.join(outdirRoot, "README.md"));
    logger.verbose(`Copied ${readmeFile} as README.md`, true);
  } else {
    logger.warn("README.md not found", true);
  }

  // --- Copy LICENSE file ---
  // First try to find a file named "LICENSE" (with no extension)
  let licenseFile = await findFileCaseInsensitive("LICENSE");
  // If not found, fall back to "LICENSE.md"
  if (!licenseFile) {
    licenseFile = await findFileCaseInsensitive("LICENSE.md");
  }

  if (licenseFile) {
    // Always copy the chosen file as "LICENSE" in the output folder
    await fs.copy(licenseFile, path.join(outdirRoot, "LICENSE"));
    logger.verbose(`Copied ${licenseFile} as LICENSE`, true);
  } else {
    logger.warn("No license file found", true);
  }
}

// ---------- Convert JS Imports to TS ----------
/**
 * For JSR builds, convert .js imports to .ts.
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
        // For non–JSR builds, skip rewriting if no change is needed.
        await fs.writeFile(filePath, content, "utf8");
      }
    }
  }
}

// ---------- Rename TSX Files ----------
/**
 * JSR doesn't support TSX files, so rename them to avoid warnings.
 * (They can later be renamed back by @reliverse/cli if needed.)
 */
async function renameTsxFiles(dir: string): Promise<void> {
  const files = await globby(["**/*.tsx"], {
    cwd: dir,
    absolute: true,
    gitignore: true,
  });
  await Promise.all(
    files.map(async (filePath) => {
      const newPath = filePath.replace(/\.tsx$/, "-tsx.txt");
      await fs.rename(filePath, newPath);
      logger.verbose(`Renamed: ${filePath} -> ${newPath}`, true);
    }),
  );
}

async function createJsrConfig(outdirRoot: string): Promise<void> {
  const originalPkg = await readPackageJSON();
  const { author, name, version, license, description } = originalPkg;
  const pkgHomepage = "https://docs.reliverse.org/cli";
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

async function copyJsrFiles(outdirRoot: string): Promise<void> {
  await fs.writeFile(
    path.join(outdirRoot, ".gitignore"),
    "node_modules/\n.env\n",
    "utf-8",
  );
  logger.verbose("Generated .gitignore for JSR", true);

  await createJsrConfig(outdirRoot);

  const jsrFiles = [
    ".reliverse",
    "bun.lock",
    "drizzle.config.ts",
    "schema.json",
  ];
  await Promise.all(
    jsrFiles.map(async (file) => {
      if (await fs.pathExists(file)) {
        await fs.copy(file, path.join(outdirRoot, file));
        logger.verbose(`Copied JSR file: ${file}`, true);
      }
    }),
  );
}

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

export async function convertSymbolPaths(
  outdirBin: string,
  isJSR: boolean,
  symbolPrefix = "~/",
): Promise<void> {
  if (isJSR) {
    logger.info("Converting symbol paths in JSR built files...", true);
  } else {
    logger.info("Converting symbol paths in NPM built files...", true);
  }
  if (!(await fs.pathExists(outdirBin))) {
    logger.warn(
      `[convertSymbolPaths] Directory does not exist: ${outdirBin}`,
      true,
    );
    return;
  }
  const filePatterns = ["**/*.{js,ts,jsx,tsx,mjs,cjs}"];
  const files = await globby(filePatterns, {
    cwd: outdirBin,
    absolute: true,
    gitignore: true,
  });
  if (files.length === 0) {
    logger.info(`No matching files found in: ${outdirBin}`, true);
    return;
  }
  await Promise.all(
    files.map(async (file) => {
      try {
        // Check if file exists before processing
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

// ---------- Build JSR Distribution ----------
async function buildJsrDist(): Promise<void> {
  const cfg = { ...defineConfig(true), lastBuildFor: "jsr" as const };
  const outdirRoot = cfg.jsrDistDir;
  const outdirBin = `${outdirRoot}/bin`;
  // Remove any existing JSR dist folder and ensure it exists
  await fs.remove(outdirRoot);
  await fs.ensureDir(outdirRoot);

  logger.info("Creating JSR distribution...", true);

  if (cfg.builderJsr === "jsr") {
    // Copy the src directory into dist-jsr
    await fs.copy(cfg.rootSrcDir, outdirBin);
    logger.verbose("Copied source directory to JSR distribution folder", true);
  } else if (cfg.builderJsr === "bun") {
    const entryFile = path.join(cfg.rootSrcDir, "main.ts");
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
        // Convert sourcemap options for Bun:
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
        `Bun build completed with ${buildResult.outputs.length} output file(s).`,
        true,
      );
      if (buildResult.logs && buildResult.logs.length > 0) {
        buildResult.logs.forEach((log, index) => {
          logger.verbose(`Log ${index + 1}: ${JSON.stringify(log)}`, true);
        });
      }
    } catch (err) {
      logger.error("Bun bundler failed:", err, true);
      throw err;
    }
  } else {
    // For other bundlers (not "bun" or "jsr"), use unbuild
    const entryFile = path.join(cfg.rootSrcDir, "main.ts");
    if (!(await fs.pathExists(entryFile))) {
      logger.error(`Could not find entry file at: ${entryFile}`, true);
      throw new Error(`Entry file not found: ${entryFile}`);
    }
    await execaCommand("bunx unbuild", { stdio: "inherit" });
    const fileCount = await outdirBinFilesCount(outdirBin);
    logger.verbose(`unbuild completed with ${fileCount} output file(s).`, true);
  }

  /**
   * For any bundler as a post-build step, do the following:
   */

  // `dist-jsr`:
  await copyReadmeLicense(outdirRoot);
  await createPackageJSON(outdirRoot, true);
  await createTSConfig(outdirRoot, true);
  await copyJsrFiles(outdirRoot);

  // `dist-jsr/bin`:
  await renameTsxFiles(outdirBin);
  await convertJsToTsImports(outdirBin, true);
  await convertSymbolPaths(outdirBin, true);
  await deleteSpecificFiles(outdirBin);

  const size = await getDirectorySize(outdirRoot);
  logger.success(`Successfully created JSR distribution (${size} bytes)`, true);
}

// ---------- Build NPM Distribution ----------
async function buildNpmDist(): Promise<void> {
  const cfg = { ...defineConfig(false), lastBuildFor: "npm" as const };
  const outdirRoot = cfg.npmDistDir;
  const outdirBin = `${outdirRoot}/bin`;
  // Remove any existing NPM dist folder and ensure it exists
  await fs.remove(outdirRoot);
  await fs.ensureDir(outdirRoot);

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
  // Use Bun only if builderNpm is exactly "bun"
  if (cfg.builderNpm !== "bun") {
    await execaCommand("bunx unbuild", { stdio: "inherit" });
    const fileCount = await outdirBinFilesCount(outdirBin);
    logger.verbose(`unbuild completed with ${fileCount} output file(s).`, true);
  } else {
    try {
      const buildResult = await bunBuild({
        entrypoints: [entryFile],
        outdir: outdirBin,
        target: cfg.target,
        format: cfg.format,
        splitting: cfg.splitting,
        minify: cfg.shouldMinify,
        // Use the helper for sourcemap conversion:
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
        `Bun build completed with ${buildResult.outputs.length} output file(s).`,
        true,
      );
      if (buildResult.logs && buildResult.logs.length > 0) {
        buildResult.logs.forEach((log, index) => {
          logger.verbose(`Log ${index + 1}: ${JSON.stringify(log)}`, true);
        });
      }
    } catch (err) {
      logger.error("Bun bundler failed:", err, true);
      throw err;
    }
  }

  /**
   * For any bundler as a post-build step, do the following:
   */

  // `dist-npm`:
  await copyReadmeLicense(outdirRoot);
  await createPackageJSON(outdirRoot, false);

  // `dist-npm/bin`:
  await convertSymbolPaths(outdirBin, false);
  await deleteSpecificFiles(outdirBin);

  const size = await getDirectorySize(outdirRoot);
  logger.success(`Successfully created NPM distribution (${size} bytes)`, true);
}

// ---------- Publish Functions ----------
async function publishToJsr(dryRun: boolean): Promise<void> {
  logger.info("Publishing to JSR...", true);

  try {
    if (!pubConfig.pausePublish) {
      const originalDir = process.cwd();
      const jsrDistDir = path.resolve(CURRENT_DIR, "dist-jsr");

      try {
        // Change to JSR dist directory for publishing
        process.chdir(jsrDistDir);
        logger.info(`Changed working directory to: ${jsrDistDir}\n`, true);

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
      } finally {
        // Always change back to original directory
        process.chdir(originalDir);
        logger.info(`Restored working directory to: ${originalDir}`, true);
      }
    }
  } catch (error) {
    logger.error("Failed to publish to JSR:", error, true);
    throw error;
  }
}

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

async function publishToNpm(dryRun: boolean): Promise<void> {
  try {
    if (!pubConfig.pausePublish) {
      const originalDir = process.cwd();
      const npmDistDir = path.resolve(CURRENT_DIR, "dist-npm");

      try {
        // Change to NPM dist directory for publishing
        process.chdir(npmDistDir);
        logger.info(`Changed working directory to: ${npmDistDir}\n`, true);

        const command = ["bun publish", dryRun ? "--dry-run" : ""]
          .filter(Boolean)
          .join(" ");

        await execaCommand(command, { stdio: "inherit" });
        logger.success(
          `Successfully ${dryRun ? "validated" : "published"} to NPM registry`,
          true,
        );
      } finally {
        // Change back to original directory
        process.chdir(originalDir);
        logger.info(`Restored working directory to: ${originalDir}`, true);
      }
    }
  } catch (error) {
    logger.error("Failed to publish to NPM:", error, true);
    throw error;
  }
}

// ---------- Main ----------
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
