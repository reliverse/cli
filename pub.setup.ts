import { re } from "@reliverse/relico";
import { build as bunBuild } from "bun";
import { parseJSONC, parseJSON5 } from "confbox";
import { destr } from "destr";
import { execaCommand } from "execa";
import fs from "fs-extra";
import { globby } from "globby";
import mri from "mri";
import os from "node:os";
import path from "pathe";
import {
  readPackageJSON,
  defineTSConfig,
  definePackageJSON,
  type PackageJson,
} from "pkg-types";
import semver from "semver";
import { fileURLToPath } from "url";

import pubConfig from "./pub.config.js";

// ---------- Constants & Global Setup ----------
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_FOLDERS = ["dist-npm", "dist-jsr"];

// ---------- Parse Only the 'bump' Flag ----------
const scriptFlags = mri(process.argv.slice(2), {
  string: ["bump"],
  alias: {},
  default: {},
});

// ---------- Logger Utility ----------
const logger = {
  info: (msg: string) => console.log(`📝  ${re.cyanBright(msg)}`),
  success: (msg: string) => console.log(`✅  ${re.greenBright(msg)}`),
  warn: (msg: string) => console.log(`🔔  ${re.yellowBright(msg)}`),
  error: (msg: string, err?: unknown) => {
    console.error(`❌  ${msg}`, err instanceof Error ? err.message : err);
  },
  verbose: (msg: string) => {
    if (pubConfig.verbose) {
      console.log(`🔍 ${re.magentaBright(msg)}`);
    }
  },
};

// ---------- Helper: Cross-Platform Remove Command ----------
function getRemoveCommand(folders: string[]): string {
  const platform = os.platform();
  const folderList = folders.join(" ");

  switch (platform) {
    case "win32":
      return `Remove-Item -Recurse -Force ${folders
        .map((f) => `"./${f}"`)
        .join(", ")}`;
    case "darwin":
    case "linux":
      return `rm -rf ${folderList}`;
    default:
      return `Remove these folders manually: ${folderList}`;
  }
}

// ---------- Dist Folders Existence Check ----------
async function checkDistFolders(): Promise<boolean> {
  const existingFolders: string[] = [];
  for (const folder of DIST_FOLDERS) {
    const folderPath = path.resolve(CURRENT_DIR, folder);
    if (await fs.pathExists(folderPath)) {
      existingFolders.push(folder);
    }
  }
  if (existingFolders.length > 0) {
    logger.error(
      `Cannot proceed! These distribution folders exist:\n${existingFolders.join(
        ", ",
      )}`,
    );
    logger.info(`Remove them or run:\n${getRemoveCommand(existingFolders)}\n`);
    return false;
  }
  return true;
}

// ---------- Remove Dist Folders ----------
async function cleanupDistFolders() {
  try {
    if (pubConfig.pausePublish) {
      logger.info("Skipping dist folder cleanup (config.pausePublish == true)");
      return;
    }
    for (const folder of DIST_FOLDERS) {
      if (await fs.pathExists(folder)) {
        await fs.remove(folder);
        logger.verbose(`Removed: ${folder}`);
      }
    }
    logger.info("✔ All dist folders cleaned up successfully.");
  } catch (error) {
    logger.warn(`Failed to remove some dist folders: ${String(error)}`);
  }
}

// ---------- Delete Temporary Files (with -temp postfix) ----------
async function deleteTempFiles(dir: string) {
  const patterns = ["**/*-temp.js", "**/*-temp.ts", "**/*-temp.d.ts"];
  const files = await globby(patterns, {
    cwd: dir,
    absolute: true,
    gitignore: true,
  });
  if (files.length > 0) {
    await Promise.all(files.map((file) => fs.remove(file)));
    logger.verbose(`Deleted temporary files:\n${files.join("\n")}`);
  }
}

// ---------- Bump Versions in Files ----------
async function bumpVersions(oldVersion: string, newVersion: string) {
  try {
    const codebase = await globby(
      ["**/*.{reliverse,json,jsonc,json5,ts,tsx}"],
      {
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
      },
    );

    // Process all files concurrently
    const updateFile = async (file: string): Promise<string | null> => {
      try {
        const content = await fs.readFile(file, "utf-8");
        let parsed: any;
        let updatedContent: string | null = null;

        if (file.endsWith(".reliverse")) {
          parsed = parseJSONC(content);
          if (parsed?.version) {
            parsed.version = newVersion;
            updatedContent = `${JSON.stringify(parsed, null, 2)}\n`;
          }
        } else if (file.endsWith(".json")) {
          parsed = destr(content);
          if (parsed?.version) {
            parsed.version = newVersion;
            updatedContent = `${JSON.stringify(parsed, null, 2)}\n`;
          }
        } else if (file.endsWith(".jsonc")) {
          parsed = parseJSONC(content);
          if (parsed?.version) {
            parsed.version = newVersion;
            updatedContent = `${JSON.stringify(parsed, null, 2)}\n`;
          }
        } else if (file.endsWith(".json5")) {
          parsed = parseJSON5(content);
          if (parsed?.version) {
            parsed.version = newVersion;
            updatedContent = `${JSON.stringify(parsed, null, 2)}\n`;
          }
        }

        if (updatedContent) {
          await fs.writeFile(file, updatedContent);
          return file;
        } else {
          if (content.includes(oldVersion)) {
            const replaced = content.replaceAll(oldVersion, newVersion);
            if (replaced !== content) {
              await fs.writeFile(file, replaced);
              return file;
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to process ${file}: ${String(err)}`);
      }
      return null;
    };

    const results = await Promise.all(codebase.map((file) => updateFile(file)));
    const updatedFiles = results.filter((f): f is string => f !== null);

    if (updatedFiles.length > 0) {
      logger.info(
        `Version updated from ${oldVersion} to ${newVersion} in ${updatedFiles.length} file(s):\n${updatedFiles.join(
          "\n",
        )}`,
      );
    } else {
      logger.warn("No files were updated with the new version.");
    }
  } catch (error) {
    logger.error("Failed to bump versions: ", error);
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

// ---------- setBumpDisabled ----------
async function setBumpDisabled(value: boolean) {
  // Try to update pub.config.ts; if it doesn't exist, fall back to pub.config.js.
  const tsConfigPath = path.join(CURRENT_DIR, "pub.config.ts");
  const jsConfigPath = path.join(CURRENT_DIR, "pub.config.js");
  let configPath = tsConfigPath;
  if (!(await fs.pathExists(configPath))) {
    if (await fs.pathExists(jsConfigPath)) {
      configPath = jsConfigPath;
    } else {
      logger.warn(
        "No pub.config.ts or pub.config.js found to update disableBump",
      );
      return;
    }
  }
  let content = await fs.readFile(configPath, "utf-8");

  // Update the disableBump value in the config file
  content = content.replace(
    /disableBump:\s*(true|false)/,
    `disableBump: ${value}`,
  );
  await fs.writeFile(configPath, content, "utf-8");
}

// ---------- Bump Handler ----------
async function bumpHandler() {
  // If disableBump or pausePublish is set, skip version bump
  if (pubConfig.disableBump || pubConfig.pausePublish) {
    logger.info(
      "Skipping version bump because a previous run already bumped the version or config paused it.",
    );
    return;
  }

  // If --bump=<semver> is provided, do a direct bump to that semver.
  // Otherwise, auto-increment based on config.bump.
  const cliVersion = scriptFlags["bump"];

  const pkgPath = path.resolve("package.json");
  if (!(await fs.pathExists(pkgPath))) {
    throw new Error("package.json not found");
  }
  const pkgJson = destr<PackageJson>(await fs.readFile(pkgPath, "utf-8"));
  if (!pkgJson.version) {
    throw new Error("No version field found in package.json");
  }

  const oldVersion = pkgJson.version;

  if (cliVersion) {
    // --bump given as a direct semver
    if (!semver.valid(cliVersion)) {
      throw new Error(`Invalid version format for --bump: "${cliVersion}"`);
    }
    if (oldVersion !== cliVersion) {
      await bumpVersions(oldVersion, cliVersion);
      // Mark that we have bumped so it isn’t repeated if a later step fails
      await setBumpDisabled(true);
    } else {
      logger.info(`Version is already at ${oldVersion}, no bump needed.`);
    }
  } else {
    // Auto-increment
    if (!semver.valid(oldVersion)) {
      throw new Error(
        `Invalid existing version in package.json: ${oldVersion}`,
      );
    }
    logger.info(
      `Auto-incrementing version from ${oldVersion} using "${pubConfig.bump}"`,
    );
    const incremented = autoIncrementVersion(oldVersion, pubConfig.bump);
    if (oldVersion !== incremented) {
      await bumpVersions(oldVersion, incremented);
      // Mark that we have bumped
      await setBumpDisabled(true);
    } else {
      logger.info(`Version is already at ${oldVersion}, no bump needed.`);
    }
  }
}

// ---------- Build Config Interface ----------
type BuildConfig = {
  verbose: boolean;
  isJSR: boolean;
  filesToDelete: string[];
  pausePublish: boolean;
  shouldMinify: boolean;
  sourcemap: boolean | "linked" | "inline" | "external";
  target: "node" | "bun" | "browser";
  format: "esm" | "cjs" | "iife";
  splitting: boolean;
  registry: string;
  npmDistDir: string;
  jsrDistDir: string;
  rootSrcDir: string;
  bump: string;
  publicPath: string;
  disableBump: boolean;
  builderNpm: string;
  builderJsr: string;
};

// ---------- defineConfig ----------
function defineConfig(isJSR: boolean): BuildConfig {
  return {
    bump: pubConfig.bump,
    registry: pubConfig.registry || "npm-jsr",
    npmDistDir: pubConfig.npmDistDir,
    jsrDistDir: pubConfig.jsrDistDir,
    rootSrcDir: pubConfig.rootSrcDir,
    verbose: pubConfig.verbose,
    isJSR,
    filesToDelete: [
      "**/*.test.js",
      "**/*.test.ts",
      "**/*.test.d.ts",
      "**/__tests__/**",
      "**/*.temp.js",
      "**/*.temp.ts",
      "**/*.temp.d.ts",
      "**/*-temp.js",
      "**/*-temp.ts",
      "**/*-temp.d.ts",
      // For NPM, remove .ts except .d.ts
      ...(isJSR ? [] : ["**/*.ts", "**/*.tsx", "!**/*.d.ts"]),
    ],
    pausePublish: pubConfig.pausePublish,
    shouldMinify: pubConfig.shouldMinify,
    splitting: pubConfig.splitting,
    sourcemap: pubConfig.sourcemap,
    target: pubConfig.target,
    format: pubConfig.format,
    publicPath: pubConfig.publicPath,
    disableBump: pubConfig.disableBump,
    builderNpm: pubConfig.builderNpm,
    builderJsr: pubConfig.builderJsr,
  };
}

// ---------- Create Common Package Fields ----------
async function createCommonPackageFields(): Promise<Partial<PackageJson>> {
  const originalPkg = await readPackageJSON();
  const pkgName = originalPkg.name;
  const pkgAuthor = originalPkg.author;
  const pkgVersion = originalPkg.version;
  const pkgLicense = originalPkg.license || "MIT";
  const pkgDescription = originalPkg.description;
  const pkgHomepage = "https://docs.reliverse.org/cli";

  return {
    name: pkgName,
    author: pkgAuthor,
    version: pkgVersion,
    license: pkgLicense,
    description: pkgDescription,
    homepage: pkgHomepage,
    repository: {
      type: "git",
      url: `git+https://github.com/${pkgAuthor}/${pkgName}.git`,
    },
    bugs: {
      url: `https://github.com/${pkgAuthor}/${pkgName}/issues`,
      email: "blefnk@gmail.com",
    },
    keywords: ["cli", `${pkgAuthor}`],
    dependencies: originalPkg.dependencies || {},
    type: "module",
  };
}

function filterDevDependencies(
  devDeps: Record<string, string> | undefined,
): Record<string, string> {
  if (!devDeps) return {};
  return Object.entries(devDeps).reduce<Record<string, string>>(
    (acc, [k, v]) => {
      const lower = k.toLowerCase();
      // Keep devDeps except ESLint/Prettier
      if (!lower.includes("eslint") && !lower.includes("prettier")) {
        acc[k] = v;
      }
      return acc;
    },
    {},
  );
}

// ---------- Create Dist Package.json ----------
async function createDistPackageJSON(distDir: string, isJSR: boolean) {
  const commonPkg = await createCommonPackageFields();
  const originalPkg = await readPackageJSON();

  if (isJSR) {
    // JSR package.json
    const jsrPkg = definePackageJSON({
      ...commonPkg,
      exports: {
        ".": "./bin/main.ts",
      },
      devDependencies: filterDevDependencies(originalPkg.devDependencies),
    });
    await fs.writeJSON(path.join(distDir, "package.json"), jsrPkg, {
      spaces: 2,
    });
  } else {
    // NPM package.json
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
    await fs.writeJSON(path.join(distDir, "package.json"), npmPkg, {
      spaces: 2,
    });
  }
}

// ---------- Create TSConfig --------------------
async function createTSConfig(
  outputDir: string,
  allowImportingTsExtensions: boolean,
) {
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
  await fs.writeJSON(path.join(outputDir, "tsconfig.json"), tsConfig, {
    spaces: 2,
  });
}

// ---------- Copy README, LICENSE, etc. ----------
async function copyReadmeLicense(outputDir: string) {
  const filesToCopy = ["README.md", "LICENSE"];
  for (const file of filesToCopy) {
    if (await fs.pathExists(file)) {
      await fs.copy(file, path.join(outputDir, file));
      logger.verbose(`Copied ${file}`);
    }
  }
}

async function convertJsToTsImports(dir: string, isJSR: boolean) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await convertJsToTsImports(filePath, isJSR);
    } else if (
      stat.isFile() &&
      /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(file)
    ) {
      // Skip path resolution for template files
      if (filePath.includes("template/")) {
        continue;
      }

      const content = await fs.readFile(filePath, "utf8");

      if (isJSR) {
        // Replace `.js` after "from '...' or import('...')"
        const finalContent = content.replace(
          /(from\s*['"])([^'"]+?)\.js(?=['"])/g,
          "$1$2.ts",
        );
        logger.verbose("Converted .js imports to .ts for JSR build");
        await fs.writeFile(filePath, finalContent, "utf8");
      } else {
        await fs.writeFile(filePath, content, "utf8");
      }
    }
  }
}

// ---------- Rename TSX Files (JSR) ----------
async function renameTsxFiles(dir: string) {
  const files = await globby(["**/*.tsx"], {
    cwd: dir,
    absolute: true,
    gitignore: true,
  });
  await Promise.all(
    files.map(async (filePath) => {
      const newPath = filePath.replace(/\.tsx$/, "-tsx.txt");
      await fs.rename(filePath, newPath);
      logger.verbose(`Renamed: ${filePath} -> ${newPath}`);
    }),
  );
}

// ---------- Prepare Dist Directory (JSR) ----------
async function prepareJsrDistDirectory(cfg: BuildConfig) {
  if (!cfg.isJSR) {
    return;
  }

  const dir = cfg.jsrDistDir;
  const dirExists = await fs.pathExists(dir);

  // Remove existing folder if it exists
  if (dirExists) {
    await fs.remove(dir);
    logger.verbose(`Removed existing '${dir}' directory`);
  }
  // Copy source files into the jsr dist folder
  if (cfg.isJSR) {
    const binDir = path.join(dir, "bin");
    await fs.ensureDir(binDir);
    await fs.copy(cfg.rootSrcDir, binDir, { overwrite: true });
    logger.verbose(`Copied source files to ${binDir}`);
  }
}

// ---------- Create JSR config (jsr.jsonc, etc.) ----------
async function createJsrConfig(outputDir: string) {
  const originalPkg = await readPackageJSON();
  const pkgAuthor = originalPkg.author;
  const pkgName = originalPkg.name;
  const pkgVersion = originalPkg.version;
  const pkgLicense = originalPkg.license || "MIT";
  const pkgDescription = originalPkg.description;
  const pkgHomepage = "https://docs.reliverse.org/cli";

  const jsrConfig = {
    name: pkgName,
    author: pkgAuthor,
    version: pkgVersion,
    license: pkgLicense,
    description: pkgDescription,
    homepage: pkgHomepage,
    exports: "./bin/main.ts",
    publish: {
      exclude: ["!.", "node_modules/**", ".env"],
    },
  };

  await fs.writeJSON(path.join(outputDir, "jsr.jsonc"), jsrConfig, {
    spaces: 2,
  });

  logger.verbose("Generated jsr.jsonc file");
}

async function copyJsrFiles(outputDir: string) {
  await fs.writeFile(
    path.join(outputDir, ".gitignore"),
    "node_modules/\n.env\n",
    "utf-8",
  );
  logger.verbose("Generated .gitignore for JSR");

  await createJsrConfig(outputDir);

  const jsrFiles = [
    ".reliverse",
    "bun.lock",
    "drizzle.config.ts",
    "schema.json",
  ];
  for (const file of jsrFiles) {
    if (await fs.pathExists(file)) {
      await fs.copy(file, path.join(outputDir, file));
      logger.verbose(`Copied JSR file: ${file}`);
    }
  }
}

// ---------- Get Directory Size (summary) ----------
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    const sizes = await Promise.all(
      files.map(async (file) => {
        const fp = path.join(dirPath, file);
        const stats = await fs.stat(fp);
        return stats.isDirectory() ? getDirectorySize(fp) : stats.size;
      }),
    );
    return sizes.reduce((total, s) => total + s, 0);
  } catch (error) {
    logger.error(`Failed to calculate directory size for ${dirPath}`, error);
    return 0;
  }
}

/**
 * Computes a relative import path from a source file to a target sub-path inside a base directory.
 *
 * @param sourceFile - The absolute path of the file containing the import.
 * @param subPath - The sub-path specified after the symbol prefix (e.g., 'utils/helper').
 * @param baseDir - The base directory for resolving symbol paths.
 * @param prefix - An optional prefix to prepend to the computed path.
 * @returns The computed relative import path with forward slashes.
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
 * Replaces symbol paths (e.g., '~/...') in the provided file content with relative paths based on a base directory.
 *
 * @param content - The content of the file.
 * @param sourceFile - The absolute path of the file being processed.
 * @param baseDir - The base directory for resolving symbol paths.
 * @param symbolPrefix - The prefix used for symbol paths (default: "~/").
 * @returns An object indicating whether changes were made and the updated content.
 */
function replaceSymbolPaths(
  content: string,
  sourceFile: string,
  baseDir: string,
  symbolPrefix = "~/",
): { changed: boolean; newContent: string } {
  // Escape special regex characters in symbolPrefix.
  const escapedSymbol = symbolPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const symbolRegex = new RegExp(`(['"])(${escapedSymbol}[^'"]+)\\1`, "g");
  let changed = false;

  const newContent = content.replace(
    symbolRegex,
    (_match, quote, matchedSymbol) => {
      const subPath = matchedSymbol.slice(symbolPrefix.length); // Remove the symbol prefix.
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
 * Converts symbol paths in JavaScript/TypeScript files within the 'bin' folder of the distribution directory.
 *
 * @param distDir - The distribution directory containing the 'bin' folder.
 * @param symbolPrefix - The prefix used for symbol paths (default: "~/").
 */
export async function convertSymbolPaths(
  distDir: string,
  symbolPrefix = "~/",
): Promise<void> {
  const binDir = path.join(distDir, "bin");
  if (!(await fs.pathExists(binDir))) {
    logger.warn(`Directory does not exist: ${binDir}`);
    return;
  }

  // Find all JS/TS files in the bin directory.
  const filePatterns = ["**/*.{js,ts,jsx,tsx,mjs,cjs}"];
  const files = await globby(filePatterns, {
    cwd: binDir,
    absolute: true,
    gitignore: true,
  });

  if (files.length === 0) {
    logger.info(`No matching files found in: ${binDir}`);
    return;
  }

  // Process all files concurrently.
  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await fs.readFile(file, "utf8");

        // Skip processing if the file doesn't contain the symbol prefix.
        if (!content.includes(symbolPrefix)) return;

        const { changed, newContent } = replaceSymbolPaths(
          content,
          file,
          binDir,
          symbolPrefix,
        );

        if (changed) {
          await fs.writeFile(file, newContent, "utf8");
          logger.verbose(`Converted symbol paths in: ${file}`);
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error processing file ${file}: ${errMsg}`);
      }
    }),
  );
}

// ---------- Build Project (JSR) ----------
async function buildJsrDist() {
  const cfg = defineConfig(true);
  const dir = cfg.jsrDistDir;

  logger.info("Creating JSR distribution...");

  // Prepare the output directory
  await prepareJsrDistDirectory(cfg);

  // JSR build is just a direct copy of the source files
  await Promise.all([
    createDistPackageJSON(dir, true),
    convertJsToTsImports(dir, true),
    createTSConfig(dir, true),
  ]);

  await Promise.all([
    copyJsrFiles(dir),
    renameTsxFiles(dir),
    copyReadmeLicense(dir),
  ]);

  // Convert ~/ paths to relative paths in the bin folder
  await convertSymbolPaths(dir);

  // Delete temporary files ending with -temp.{js,ts,d.ts}
  await deleteTempFiles(dir);

  // Get size summary
  const size = await getDirectorySize(dir);
  logger.success(`Successfully created JSR distribution (${size} bytes)`);
}

/**
 * Recursively counts all files within a subdirectory.
 *
 * @param {string} rootDir - The root directory.
 * @param {string} subfolder - The subdirectory (relative to rootDir) to count files in.
 * @returns {Promise<number>} The number of files found.
 */
export async function countOutputBinFiles(
  rootDir: string,
  subfolder: string,
): Promise<number> {
  const targetDir = path.join(rootDir, subfolder);
  let fileCount = 0;

  // If the target directory doesn't exist, return 0.
  if (!(await fs.pathExists(targetDir))) {
    logger.error(`Directory does not exist: ${targetDir}`);
    return fileCount;
  }

  /**
   * Recursively traverses a directory and increments fileCount for each file found.
   *
   * @param {string} dir - The directory to traverse.
   */
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

  await traverse(targetDir);
  return fileCount;
}

// ---------- Build Project (NPM) ----------
async function buildNpmDist() {
  const cfg = defineConfig(false);
  const outputDir = cfg.npmDistDir;
  const entrySrcDir = cfg.rootSrcDir;

  logger.info("Creating NPM distribution...");

  // NPM build with Bun bundler
  const entryFile = path.join(entrySrcDir, "main.ts");
  const entryExists = await fs.pathExists(entryFile);
  if (!entryExists) {
    logger.error(`Could not find entry file at: ${entryFile}`);
    throw new Error(`Entry file not found: ${entryFile}`);
  }

  logger.info(
    `Starting ${cfg.builderNpm} bundling for entry file: ${entryFile}`,
  );

  if (cfg.builderNpm === "mkdist") {
    await execaCommand("bunx unbuild", { stdio: "inherit" });
    const fileCount = await countOutputBinFiles(outputDir, "bin");
    logger.verbose(`mkdist build completed with ${fileCount} output file(s).`);
  } else {
    // Use Bun Builder
    try {
      const buildResult = await bunBuild({
        entrypoints: [entryFile],
        outdir: path.join(outputDir, "bin"),
        target: cfg.target,
        format: cfg.format,
        splitting: cfg.splitting,
        minify: cfg.shouldMinify,
        sourcemap: cfg.sourcemap,
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
      );
      if (buildResult.logs && buildResult.logs.length > 0) {
        logger.verbose("Bun build logs:");
        buildResult.logs.forEach((log, index) => {
          logger.verbose(`Log ${index + 1}: ${JSON.stringify(log)}`);
        });
      }
    } catch (err) {
      logger.error("Bun bundler failed:", err);
      throw err;
    }
  }

  // Post-build steps: create package.json, tsconfig.json, and copy repo files
  logger.info("Generating distribution package.json, tsconfig.json...");
  logger.info("Copying README.md and LICENSE files...");
  await Promise.all([
    createDistPackageJSON(outputDir, false),
    copyReadmeLicense(outputDir),
  ]);

  // Convert ~/ paths to relative paths in the bin folder
  logger.info("Converting symbol paths in built files...");
  await convertSymbolPaths(outputDir);

  // Delete temporary files ending with -temp.{js,ts,d.ts}
  await deleteTempFiles(outputDir);

  // Get size summary
  const size = await getDirectorySize(outputDir);
  logger.success(`Successfully created NPM distribution (${size} bytes)`);
}

// ---------- Publish to NPM ----------
async function publishToNpm(dryRun: boolean) {
  try {
    if (!pubConfig.pausePublish) {
      const currentDir = process.cwd();
      process.chdir("dist-npm");
      try {
        if (dryRun) {
          await execaCommand("bun publish --dry-run", { stdio: "inherit" });
        } else {
          await execaCommand("bun publish", { stdio: "inherit" });
        }
        logger.success("Published to npm successfully.");
      } finally {
        process.chdir(currentDir);
        await cleanupDistFolders();
      }
    } else {
      logger.info("Publishing paused. Build completed successfully (NPM).");
    }
  } catch (error) {
    logger.error("Failed to publish to NPM:", error);
    process.exit(1);
  }
}

// ---------- Publish to JSR ----------
async function publishToJsr(dryRun: boolean) {
  try {
    await buildJsrDist();

    if (!pubConfig.pausePublish) {
      const currentDir = process.cwd();
      process.chdir("dist-jsr");
      logger.verbose(`Changed cwd to ${process.cwd()}`);
      try {
        if (dryRun) {
          await execaCommand("bunx jsr publish --dry-run", {
            stdio: "inherit",
          });
        } else {
          await execaCommand("bunx jsr publish --allow-dirty", {
            stdio: "inherit",
          });
        }
        logger.success("Published to JSR successfully.");
      } finally {
        process.chdir(currentDir);
        logger.verbose(`Changed cwd to ${process.cwd()}`);
        await cleanupDistFolders();
      }
    } else {
      logger.info("Publishing paused. Build completed successfully (JSR).");
    }
  } catch (error) {
    logger.error("Failed to build/publish to JSR:", error);
    process.exit(1);
  }
}

// ---------- Main ----------
export async function main(): Promise<void> {
  try {
    // 1) If we are allowed to remove dist folders, check for leftover dist folders
    if (!pubConfig.pausePublish) {
      if (!(await checkDistFolders())) {
        process.exit(1);
      }
    }

    // 2) Possibly bump version
    await bumpHandler();

    // 3) Evaluate registry & do build/publish
    const registry = pubConfig.registry || "npm-jsr";
    const dry = !!pubConfig.dryRun;

    if (registry === "npm-jsr") {
      logger.info("Publishing to both NPM and JSR...");
      await buildNpmDist();
      await buildJsrDist();
      await publishToNpm(dry);
      await publishToJsr(dry);
    } else if (registry === "npm") {
      logger.info("Publishing to NPM only...");
      await buildNpmDist();
      await publishToNpm(dry);
    } else if (registry === "jsr") {
      logger.info("Publishing to JSR only...");
      await buildJsrDist();
      await publishToJsr(dry);
    } else {
      // If registry is something else, build only
      logger.warn(`Registry "${registry}" not recognized. Building only...`);
      await buildJsrDist();
      await buildNpmDist();
    }

    // If we reach here, everything succeeded -> re-enable bump for future runs
    await setBumpDisabled(false);

    logger.success("Publishing process completed successfully!");
  } catch (error) {
    logger.error("An unexpected error occurred:", error);
    process.exit(1);
  }
}

// If the script is invoked directly, run it
if (import.meta.main) {
  main()
    .then(() => logger.success("pub.setup.ts completed"))
    .catch((error) => {
      logger.error("Failed to run script:", error);
      process.exit(1);
    });
}
