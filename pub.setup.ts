import type { DirectoryTree, DirectoryTreeOptions } from "directory-tree";

import { re } from "@reliverse/relico";
import { parseJSONC, parseJSON5 } from "confbox";
import { destr } from "destr";
import dirTree from "directory-tree";
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

import type { PublishConfig } from "./pub.config.js";

import config from "./pub.config.js";

// ---------- Constants & Global Setup ----------
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_FOLDERS = ["dist-npm", "dist-jsr"];

const typedConfig: PublishConfig = config;

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
    console.error(
      `❌  ${re.redBright(msg)}`,
      err instanceof Error ? err.message : err,
    );
  },
  verbose: (msg: string) => {
    if (typedConfig.verbose) {
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
    if (typedConfig.noDistRm) {
      logger.info("Skipping dist folder cleanup (config.noDistRm == true)");
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

// ---------- Bump Versions in Files ----------
async function bumpVersions(oldVersion: string, newVersion: string) {
  try {
    const codebase = await globby("**/*.{reliverse,json,jsonc,json5,ts,tsx}", {
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
    });

    const updatedFiles: string[] = [];

    for (const file of codebase) {
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
          updatedFiles.push(file);
        } else {
          if (content.includes(oldVersion)) {
            const replaced = content.replaceAll(oldVersion, newVersion);
            if (replaced !== content) {
              await fs.writeFile(file, replaced);
              updatedFiles.push(file);
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to process ${file}: ${String(err)}`);
      }
    }

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

// ---------- Bump Handler ----------
async function bumpHandler() {
  // Skip if we had a successful bump but error in later steps
  if (typedConfig.gotErrorAfterBump) {
    logger.info(
      "Skipping version bump as previous bump succeeded but later steps failed",
    );
    return;
  }

  // If --bump=<semver> is provided, we do a direct bump with that semver.
  // Otherwise, we do auto-increment based on config.bump.
  const cliVersion = scriptFlags["bump"];

  if (cliVersion) {
    // Only accept semver (no autoPatch, etc.) from the CLI
    if (!semver.valid(cliVersion)) {
      throw new Error(`Invalid version format for --bump: "${cliVersion}"`);
    }
    // Perform direct semver bump
    const pkgPath = path.resolve("package.json");
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error("package.json not found");
    }
    const pkgJson = destr<PackageJson>(await fs.readFile(pkgPath, "utf-8"));
    if (!pkgJson.version) {
      throw new Error("No version field found in package.json");
    }
    const oldVersion = pkgJson.version;

    if (oldVersion !== cliVersion) {
      await bumpVersions(oldVersion, cliVersion);
    } else {
      logger.info(`Version is already at ${oldVersion}, no bump needed.`);
    }
  } else {
    // No CLI semver provided -> auto-increment based on typedConfig.bump
    const pkgPath = path.resolve("package.json");
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error("package.json not found");
    }
    const pkgJson = destr<PackageJson>(await fs.readFile(pkgPath, "utf-8"));
    if (!pkgJson.version) {
      throw new Error("No version field found in package.json");
    }
    const oldVersion = pkgJson.version;
    if (!semver.valid(oldVersion)) {
      throw new Error(
        `Invalid existing version in package.json: ${oldVersion}`,
      );
    }

    logger.info(
      `Auto-incrementing version from ${oldVersion} using "${typedConfig.bump}"`,
    );
    const incremented = autoIncrementVersion(oldVersion, typedConfig.bump);
    await bumpVersions(oldVersion, incremented);
  }
}

async function updateErrorState(gotError: boolean) {
  const configPath = path.join(CURRENT_DIR, "pub.config.ts");
  let content = await fs.readFile(configPath, "utf-8");

  // Update the gotErrorAfterBump value
  content = content.replace(
    /gotErrorAfterBump:\s*(true|false)/,
    `gotErrorAfterBump: ${gotError}`,
  );

  await fs.writeFile(configPath, content, "utf-8");
}

// ---------- Build Config Interface ----------
type BuildConfig = {
  verbose: boolean;
  isJSR: boolean;
  sourceDir: string;
  outputDir: string;
  filesToDelete: string[];
  pausePublish: boolean;
  noDistRm: boolean;
  shouldMinify: boolean;
  sourcemap: boolean | "linked" | "inline" | "external";
  target: "node" | "bun" | "browser";
  format: "esm" | "cjs" | "iife";
  registry: string;
  outputDirNpm: string;
  outputDirJsr: string;
  defaultSourceDir: string;
  bump: string; // e.g. "autoPatch", "autoMinor", "autoMajor"
};

// ---------- defineConfig ----------
function defineConfig(isJSR: boolean): BuildConfig {
  return {
    bump: typedConfig.bump, // guaranteed "autoPatch|autoMinor|autoMajor"
    registry: typedConfig.registry || "npm-jsr",
    outputDirNpm: typedConfig.outputDirNpm || "dist-npm",
    outputDirJsr: typedConfig.outputDirJsr || "dist-jsr",
    defaultSourceDir:
      typedConfig.defaultSourceDir || path.resolve(CURRENT_DIR, "src"),
    verbose: typedConfig.verbose ?? false,
    isJSR,
    sourceDir: typedConfig.defaultSourceDir || path.resolve(CURRENT_DIR, "src"),
    outputDir: path.resolve(
      CURRENT_DIR,
      isJSR
        ? typedConfig.outputDirJsr || "dist-jsr"
        : typedConfig.outputDirNpm || "dist-npm",
    ),
    filesToDelete: [
      "**/*.test.js",
      "**/*.test.ts",
      "**/*.test.d.ts",
      "**/__tests__/**",
      "**/*.temp.js",
      "**/*.temp.d.ts",
      // For NPM, remove .ts except .d.ts
      ...(isJSR ? [] : ["**/*.ts", "**/*.tsx", "!**/*.d.ts"]),
    ],
    pausePublish: !!typedConfig.pausePublish,
    noDistRm: !!typedConfig.noDistRm,
    shouldMinify: typedConfig.shouldMinify ?? true,
    sourcemap: typedConfig.sourcemap ?? "linked",
    target: typedConfig.target ?? "node",
    format: typedConfig.format ?? "esm",
  };
}

// ---------- Create Common Package Fields ----------
async function createCommonPackageFields(): Promise<Partial<PackageJson>> {
  const originalPkg = await readPackageJSON();
  return {
    name: originalPkg.name,
    author: originalPkg.author,
    version: originalPkg.version,
    license: originalPkg.license,
    description: originalPkg.description,
    homepage: "https://docs.reliverse.org/cli",
    repository: {
      type: "git",
      url: "git+https://github.com/reliverse/cli.git",
    },
    bugs: {
      url: "https://github.com/reliverse/cli/issues",
      email: "blefnk@gmail.com",
    },
    keywords: ["cli", "reliverse"],
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

// ---------- Create TSConfig (JSR only) ----------
async function createTSConfig(outputDir: string) {
  const tsConfig = defineTSConfig({
    compilerOptions: {
      allowImportingTsExtensions: true,
      jsx: "preserve",
      lib: ["DOM", "DOM.Iterable", "ES2023"],
      module: "NodeNext",
      moduleDetection: "force",
      moduleResolution: "nodenext",
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2023",
      verbatimModuleSyntax: true,
    },
    include: ["./bin/**/*.ts"],
    exclude: ["**/node_modules"],
  });
  await fs.writeJSON(path.join(outputDir, "tsconfig.json"), tsConfig, {
    spaces: 2,
  });
}

// ---------- Copy README, LICENSE, etc. ----------
async function copyRepoFiles(outputDir: string) {
  const filesToCopy = ["README.md", "LICENSE"];
  for (const file of filesToCopy) {
    if (await fs.pathExists(file)) {
      await fs.copy(file, path.join(outputDir, file));
      logger.verbose(`Copied ${file}`);
    }
  }
}

function buildSourceTree(sourceDir: string) {
  const pathMap = new Map<string, string>();
  const srcDirNormalized = path.resolve(sourceDir).replace(/\\/g, "/");

  // File callback to process each file
  const fileCallback = (item: DirectoryTree, _: string) => {
    // Skip non-file items
    if (item.type !== "file") return;

    // Get normalized paths from directory-tree
    const fullPath = item.path.replace(/\\/g, "/");
    const relativePath = fullPath.slice(srcDirNormalized.length).replace(/^\//, "");
    const withoutSrcPrefix = relativePath.replace(/^src\//, "");

    // Map both with and without extension
    const withoutExt = withoutSrcPrefix.replace(/\.[^/.]+$/, "");
    pathMap.set(withoutExt, relativePath);
    pathMap.set(withoutSrcPrefix, relativePath);

    // Handle extension variations
    const extensions = [".js", ".ts", ".jsx", ".tsx"];
    extensions.forEach((ext) => {
      const withoutJsExt = withoutSrcPrefix.replace(/\.js(x)?$/, ext);
      pathMap.set(withoutJsExt, relativePath);
    });
  };

  // Use directory-tree with TypeScript-friendly options
  const options: DirectoryTreeOptions = {
    extensions: /\.(ts|tsx|js|jsx)$/,
    exclude: /node_modules|\.git/,
    normalizePath: true,
    attributes: ["type", "extension"],
  };

  dirTree(sourceDir, options, fileCallback);

  // Debug: log a few entries to verify mappings
  if (config.verbose) {
    logger.verbose("Source map entries sample:");
    let count = 0;
    for (const [key, value] of pathMap.entries()) {
      if (count++ < 5) {
        logger.verbose(`${key} -> ${value}`);
      }
    }
  }

  return pathMap;
}

function pathsRelativeToAbsolute(
  content: string,
  sourceMap: Map<string, string>,
  filePath: string,
): string {
  // Split content into template literals and regular code
  const parts = content.split(/(`(?:\\`|[^`])*`)/g);

  return parts
    .map((part, index) => {
      // Skip template literals
      if (index % 2 === 1) {
        return part;
      }

      // Handle imports
      return part.replace(
        /from\s+['"](~\/[^'"]+)['"]/g,
        (match, importPath) => {
          // Remove the ~/ prefix and any extension
          const cleanPath = importPath.replace(/^~\//, "").replace(/\.[^/.]+$/, "");
          const targetPath = sourceMap.get(cleanPath);

          if (!targetPath) {
            // Get correct relative path from the source file location
            const relativeToSrc = path
              .relative(path.resolve(CURRENT_DIR, "src"), filePath)
              .replace(/\\/g, "/");

            logger.warn(
              `[${relativeToSrc}] Could not resolve path for: ${importPath}`,
            );
            return match;
          }

          // Get the target file's location in dist-jsr/bin
          const targetDistPath = targetPath.replace(/^src\//, "");
          const targetDistFullPath = path.join(
            path.resolve(CURRENT_DIR, "dist-jsr", "bin"),
            targetDistPath,
          );

          // Get the relative path from current file to target
          const relativePath = path
            .relative(path.dirname(filePath), targetDistFullPath)
            .replace(/\\/g, "/");

          return `from "${relativePath}"`;
        },
      );
    })
    .join("");
}

async function processFilesForJSR(dir: string, isJSR: boolean) {
  // Build source map from src directory but don't exclude dist directories
  const sourceMap = buildSourceTree(path.resolve(CURRENT_DIR, "src"));
  const importReplacements = new Map<string, Set<string>>();

  // Debug: log the source map entries for app/constants
  if (config.verbose) {
    logger.verbose("Source map entries for app/constants:");
    for (const [key, value] of sourceMap.entries()) {
      if (key.includes("app/constants")) {
        logger.verbose(`${key} -> ${value}`);
      }
    }
  }

  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await processFilesForJSR(filePath, isJSR);
    } else if (
      stat.isFile() &&
      /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(file)
    ) {
      // Skip path resolution for template files
      if (filePath.includes("template/")) {
        continue;
      }

      const content = await fs.readFile(filePath, "utf8");

      // Get the relative path from dist-jsr/bin to the source file
      const distJsrBinDir = path.resolve(CURRENT_DIR, "dist-jsr", "bin");
      const relativeToSrc = path
        .relative(distJsrBinDir, filePath)
        .replace(/\\/g, "/");

      // Check if the source file exists
      const srcFile = path.resolve(CURRENT_DIR, "src", relativeToSrc);
      if (!(await fs.pathExists(srcFile))) {
        logger.error(
          `Source file does not exist: ${srcFile}\nThis usually means the file was moved or renamed. Please update your imports.`,
        );
        continue;
      }

      const updatedContent = pathsRelativeToAbsolute(
        content,
        sourceMap,
        srcFile,
      );

      // Track import replacements for debug report
      if (config.debugPathsMap) {
        const importPaths = new Set<string>();
        const importRegex = /from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          importPaths.add(match[1]);
        }
        if (importPaths.size > 0) {
          importReplacements.set(srcFile, importPaths);
        }
      }

      if (content !== updatedContent) {
        await fs.writeFile(filePath, updatedContent, "utf8");
      }
    }
  }

  // Generate debug report if enabled
  if (config.debugPathsMap) {
    await generatePathsDebugReport(
      path.resolve(CURRENT_DIR, "src"),
      path.resolve(CURRENT_DIR, "dist-jsr", "bin"),
      sourceMap,
      importReplacements,
    );
  }
}

async function generatePathsDebugReport(
  sourceDir: string,
  targetDir: string,
  sourceMap: Map<string, string>,
  importReplacements: Map<string, Set<string>>,
) {
  const report: string[] = [];
  report.push("# Path Mapping Debug Report\n");

  // Source directory tree
  report.push("## Source Directory Tree (src/)");
  const srcTree = dirTree(sourceDir, {
    extensions: /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/,
    exclude: /node_modules|\.git/,
    normalizePath: true,
  });
  report.push("```");
  report.push(JSON.stringify(srcTree, null, 2));
  report.push("```\n");

  // Target directory tree
  report.push("## Target Directory Tree (bin/)");
  const binTree = dirTree(targetDir, {
    extensions: /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/,
    exclude: /node_modules|\.git/,
    normalizePath: true,
  });
  report.push("```");
  report.push(JSON.stringify(binTree, null, 2));
  report.push("```\n");

  // Source Map Entries
  report.push("## Source Map Entries");
  report.push("```");
  const sortedMap = new Map([...sourceMap.entries()].sort());
  for (const [key, value] of sortedMap) {
    report.push(`${key} -> ${value}`);
  }
  report.push("```\n");

  // Import Replacements by File
  report.push("## Import Replacements by File");
  report.push("```");
  const sortedReplacements = new Map([...importReplacements.entries()].sort());
  for (const [file, paths] of sortedReplacements) {
    report.push(`\nFile: ${file}`);
    const sortedPaths = [...paths].sort();
    for (const path of sortedPaths) {
      const resolvedPath = sourceMap.get(path);
      report.push(`  ${path} -> ${resolvedPath || "NOT RESOLVED"}`);
    }
  }
  report.push("```");

  // Write report to file
  const reportPath = path.join(CURRENT_DIR, "pub.paths.txt");
  await fs.writeFile(reportPath, report.join("\n"), "utf8");
  logger.info(`Path mapping debug report written to: ${reportPath}`);
}

// ---------- Rename TSX Files (JSR) ----------
async function renameTsxFiles(dir: string) {
  const files = await globby("**/*.tsx", {
    cwd: dir,
    absolute: true,
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
async function prepareDistDirectory(cfg: BuildConfig) {
  if (!cfg.pausePublish && (await fs.pathExists(cfg.outputDir))) {
    await fs.remove(cfg.outputDir);
    logger.verbose(`Removed existing '${cfg.outputDir}' directory`);
  }
  // Direct copy for JSR builds; for NPM we use Bun bundler.
  if (cfg.isJSR) {
    const binDir = path.join(cfg.outputDir, "bin");
    await fs.ensureDir(binDir);
    await fs.copy(cfg.sourceDir, binDir, { overwrite: true });
    logger.verbose(`Copied source files to ${binDir}`);
  }
}

// ---------- Create JSR config (jsr.jsonc, etc.) ----------
async function createJsrConfig(outputDir: string) {
  const originalPkg = await readPackageJSON();
  const jsrConfig = {
    name: "@reliverse/cli",
    version: originalPkg.version,
    author: "blefnk",
    license: "MIT",
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

// ---------- Build Project (Core) ----------
async function buildProject(isJSR: boolean) {
  const cfg = defineConfig(isJSR);

  logger.info(`Creating ${isJSR ? "JSR" : "NPM"} distribution...`);

  // Prepare the output directory
  await prepareDistDirectory(cfg);

  if (isJSR) {
    await Promise.all([
      createDistPackageJSON(cfg.outputDir, true),
      processFilesForJSR(cfg.outputDir, true),
      createTSConfig(cfg.outputDir),
    ]);

    await Promise.all([
      copyJsrFiles(cfg.outputDir),
      renameTsxFiles(cfg.outputDir),
      copyRepoFiles(cfg.outputDir),
    ]);
  } else {
    // NPM build with Bun bundler
    const entryFile = path.join(cfg.sourceDir, "main.ts");
    const entryExists = await fs.pathExists(entryFile);
    if (!entryExists) {
      logger.error(`Could not find entry file at: ${entryFile}`);
      throw new Error(`Entry file not found: ${entryFile}`);
    }

    // Use Bun's build. If an error occurs, it will throw.
    await Bun.build({
      entrypoints: [entryFile],
      outdir: path.join(cfg.outputDir, "bin"),
      target: cfg.target,
      format: cfg.format,
      splitting: false, // single-file
      minify: cfg.shouldMinify,
      sourcemap: cfg.sourcemap,
      throw: true,
    });

    // Create the dist package.json & any other supporting files
    await createDistPackageJSON(cfg.outputDir, false);
    // Copy README, LICENSE, etc.
    await copyRepoFiles(cfg.outputDir);
  }

  const size = await getDirectorySize(cfg.outputDir);
  logger.success(
    `Successfully created ${isJSR ? "JSR" : "NPM"} distribution (${size} bytes)`,
  );
}

// ---------- Publish to NPM ----------
async function publishNpm(dryRun: boolean) {
  try {
    await buildProject(false);

    if (!typedConfig.pausePublish) {
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
        if (!typedConfig.noDistRm) {
          await cleanupDistFolders();
        }
      }
    } else {
      logger.info("Publishing paused. Build completed successfully (NPM).");
    }
  } catch (error) {
    logger.error("Failed to build/publish to npm:", error);
    process.exit(1);
  }
}

// ---------- Publish to JSR ----------
async function publishJsr(dryRun: boolean) {
  try {
    await buildProject(true);

    if (!typedConfig.pausePublish) {
      const currentDir = process.cwd();
      process.chdir("dist-jsr");
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
        if (!typedConfig.noDistRm) {
          await cleanupDistFolders();
        }
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
    // 1) If we are allowed to remove dist folders, check for leftover dist
    if (!typedConfig.pausePublish) {
      if (!(await checkDistFolders())) {
        process.exit(1);
      }
    }

    // 2) Possibly bump version
    await bumpHandler();

    // Mark that we've had a successful bump
    if (scriptFlags["bump"] || typedConfig.bump) {
      await updateErrorState(true);
    }

    // 3) Evaluate registry & do build/publish
    const registry = typedConfig.registry || "npm-jsr";
    const isDry = !!typedConfig.dryRun;

    if (registry === "npm-jsr") {
      logger.info("Publishing to both NPM and JSR...");
      await publishNpm(isDry);
      await publishJsr(isDry);
    } else if (registry === "npm") {
      logger.info("Publishing to NPM only...");
      await publishNpm(isDry);
    } else if (registry === "jsr") {
      logger.info("Publishing to JSR only...");
      await publishJsr(isDry);
    } else {
      // If registry is something else, build only
      logger.warn(`Registry "${registry}" not recognized. Building only...`);
      await buildProject(true);
      await buildProject(false);
    }

    // If we get here, everything succeeded, reset error state
    await updateErrorState(false);

    logger.success("Publishing process completed successfully!");
  } catch (error) {
    logger.error("An unexpected error occurred:", error);
    process.exit(1);
  }
}

// If the script is invoked directly run it
if (import.meta.main) {
  main()
    .then(() => logger.success("pub.setup.ts completed"))
    .catch((error) => {
      logger.error("Failed to run script:", error);
      process.exit(1);
    });
}
