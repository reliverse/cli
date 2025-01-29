// Example usage: `bun pub --bump=1.2.3`

import { re } from "@reliverse/relico";
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

const validFlags = [
  "bump",
  "jsr",
  "npm",
  "dry-run",
  "help",
  "h",
  "pause-publish",
  "no-dist-rm",
];

const scriptFlags = mri(process.argv.slice(2), {
  boolean: ["jsr", "npm", "dryRun", "help", "pausePublish", "noDistRm"],
  string: ["bump"],
  default: {
    jsr: false,
    npm: false,
    dryRun: false,
    help: false,
    pausePublish: false,
    noDistRm: false,
  },
  alias: {
    h: "help",
    dryRun: "dry-run",
    pausePublish: "pause-publish",
    noDistRm: "no-dist-rm",
  },
});

// ---------- Constants & Global Setup ----------
const MERGED_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_FOLDERS = ["dist-npm", "dist-jsr"];

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
    // Set process.env.VERBOSE='true' to enable verbose logging
    if (process.env["VERBOSE"] === "true") {
      console.log(`🔍 ${re.magentaBright(msg)}`);
    }
  },
};

// ---------- Helper: Cross-Platform Remove Command (for display) ----------
function getRemoveCommand(folders: string[]): string {
  const platform = os.platform();
  const folderList = folders.join(" ");

  switch (platform) {
    case "win32":
      // PowerShell command
      return `Remove-Item -Recurse -Force ${folders.map((f) => `"./${f}"`).join(", ")}`;
    case "darwin":
    case "linux":
      // Unix-like systems
      return `rm -rf ${folderList}`;
    default:
      // Fallback
      return `Remove the following folders manually: ${folderList}`;
  }
}

// ---------- Helper: Check Dist Folders Exist ----------
async function checkDistFolders(): Promise<boolean> {
  const existingFolders: string[] = [];

  for (const folder of DIST_FOLDERS) {
    const folderPath = path.resolve(MERGED_DIR, folder);
    if (await fs.pathExists(folderPath)) {
      existingFolders.push(folder);
    }
  }

  if (existingFolders.length > 0) {
    logger.error(
      `Cannot proceed! The following distribution folders exist:\n${existingFolders.join(", ")}`,
    );
    logger.info(`Remove them or run:\n${getRemoveCommand(existingFolders)}\n`);
    return false;
  }

  return true;
}

// ---------- Helper: Remove Dist Folders ----------
async function cleanupDistFolders() {
  try {
    // Skip cleanup if --no-dist-rm is set
    if (process.argv.includes("--no-dist-rm")) {
      logger.info("Skipping dist folder cleanup due to --no-dist-rm flag");
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

// ---------- Helper: Bump Versions in Files ----------
async function bumpVersions(oldVersion: string, newVersion: string) {
  try {
    // Find all relevant files
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
        "**/bun.lockb",
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
          // For TS or TSX files, do a string replacement
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
        `Version updated from ${oldVersion} to ${newVersion}. Updated ${updatedFiles.length} files:\n${updatedFiles.join(
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

// ---------- BUILD & PUBLISH SCRIPT (for `bun build.publish.ts`) ----------
function showHelp() {
  logger.info(`
Usage: bun pub [options]

Options:
  --bump=<version>    The new version to set (e.g. --bump=1.2.3)
  --jsr               Publish to JSR
  --npm               Publish to NPM
  --dry-run           Perform a dry run
  --pause-publish     Build but skip publishing
  --no-dist-rm        Keep dist folders after publishing
  -h, --help          Show help
`);
}

async function publishNpm(dryRun: boolean) {
  try {
    // Builds first
    await execaCommand(
      `bun build:npm${scriptFlags["pause-publish"] ? " --pause-publish" : ""}`,
      {
        stdio: "inherit",
      },
    );

    // Publishes if not paused
    if (!scriptFlags["pause-publish"]) {
      const currentDir = process.cwd();
      process.chdir("dist-npm");
      try {
        if (dryRun) {
          await execaCommand("npm publish --dry-run", { stdio: "inherit" });
        } else {
          await execaCommand("npm publish", { stdio: "inherit" });
        }
        logger.success("Published to npm successfully.");
      } finally {
        process.chdir(currentDir);
        if (!scriptFlags["no-dist-rm"]) {
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

async function publishJsr(dryRun: boolean) {
  try {
    // Builds first
    await execaCommand(
      `bun build:jsr${scriptFlags["pause-publish"] ? " --pause-publish" : ""}`,
      {
        stdio: "inherit",
      },
    );

    // Publishes if not paused
    if (!scriptFlags["pause-publish"]) {
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
      } finally {
        process.chdir(currentDir);
      }
      logger.success("Published to JSR successfully.");

      if (!scriptFlags["no-dist-rm"]) {
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

// ---------- BUILD OPTIM MAIN (buildProject) ----------

type BuildConfig = {
  verbose: boolean;
  isJSR: boolean;
  sourceDir: string;
  outputDir: string;
  filesToDelete: string[];
  pausePublish: boolean;
  noDistRm: boolean;
};

const config: BuildConfig = {
  verbose: false,
  isJSR: process.argv.includes("--jsr"),
  sourceDir: path.resolve(MERGED_DIR, "src"),
  outputDir: path.resolve(
    MERGED_DIR,
    process.argv.includes("--jsr") ? "dist-jsr" : "dist-npm",
  ),
  filesToDelete: [
    "**/*.test.js",
    "**/*.test.ts",
    "**/*.test.d.ts",
    "**/__tests__/**",
    "**/*.temp.js",
    "**/*.temp.d.ts",
    // Remove TS files only for NPM (retains .d.ts)
    ...(process.argv.includes("--jsr")
      ? []
      : ["**/*.ts", "**/*.tsx", "!**/*.d.ts"]),
  ],
  pausePublish: process.argv.includes("--pause-publish"),
  noDistRm: process.argv.includes("--no-dist-rm"),
};

async function createCommonPackageFields(): Promise<Partial<PackageJson>> {
  const originalPkg = await readPackageJSON();
  return {
    name: originalPkg.name,
    author: originalPkg.author,
    version: originalPkg.version,
    type: "module" as const,
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
  };
}

function filterDevDependencies(
  devDeps: Record<string, string> | undefined,
): Record<string, string> {
  if (!devDeps) return {};

  return Object.entries(devDeps).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      // Filters out ESLint/Prettier or anything else unwanted in dist
      if (
        !(
          key.toLowerCase().includes("eslint") ||
          key.toLowerCase().includes("prettier")
        )
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );
}

async function createDistPackageJSON(distDir: string) {
  try {
    const commonPkg = await createCommonPackageFields();
    const originalPkg = await readPackageJSON();

    if (config.isJSR) {
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
  } catch (error) {
    logger.error("Failed to create package.json", error);
    throw error;
  }
}

async function createTSConfig(outputDir: string) {
  try {
    const tsConfig = defineTSConfig({
      ...(config.pausePublish ? { extends: "../tsconfig.json" } : {}),
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
  } catch (error) {
    logger.error("Failed to create tsconfig.json", error);
    throw error;
  }
}

async function copyRepoFiles(outputDir: string) {
  try {
    const filesToCopy = ["README.md", "LICENSE"];
    await Promise.all(
      filesToCopy.map(async (file) => {
        if (await fs.pathExists(file)) {
          await fs.copy(file, path.join(outputDir, file));
          logger.verbose(`Copied ${file}`);
        }
      }),
    );
  } catch (error) {
    logger.error("Failed to copy repository files", error);
    throw error;
  }
}

async function deleteFiles(patterns: string[], baseDir: string) {
  try {
    const files = await globby(patterns, {
      cwd: baseDir,
      absolute: true,
    });

    if (files.length === 0) {
      logger.verbose("No files matched the deletion patterns");
      return;
    }

    await Promise.all(
      files.map(async (filePath) => {
        try {
          await fs.remove(filePath);
          logger.verbose(`Deleted: ${filePath}`);
        } catch (error) {
          logger.error(`Failed to delete ${filePath}`, error);
        }
      }),
    );
  } catch (error) {
    logger.error("Failed to process file deletions", error);
    throw error;
  }
}

function replaceImportPaths(
  content: string,
  fileDir: string,
  rootDir: string,
  isJSR: boolean,
): string {
  let updatedContent = content.replace(
    /(from\s+['"]|import\s*\(\s*['"])(~\/?[^'"]*)(['"]\s*\)?)/g,
    (_match, prefix, importPath, suffix) => {
      const targetDir = path.join(rootDir, "bin");
      const relativePathToRoot = path.relative(fileDir, targetDir);

      importPath = importPath.replace(/^~\/?/, "");
      let newPath = path
        .join(relativePathToRoot, importPath)
        .replace(/\\/g, "/");
      if (!newPath.startsWith(".")) {
        newPath = `./${newPath}`;
      }
      return `${prefix}${newPath}${suffix}`;
    },
  );

  if (isJSR) {
    // Transforms .js imports to .ts
    updatedContent = updatedContent.replace(/(\.js)(?=['"])/g, ".ts");
    logger.verbose("Converted .js imports to .ts for JSR build");
  }

  return updatedContent;
}

async function processFilesForJSR(dir: string) {
  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await processFilesForJSR(filePath);
      } else if (/\.(ts|tsx|d\.ts|js|jsx|mjs|cjs|mts|cts)$/.test(filePath)) {
        try {
          const content = await fs.readFile(filePath, "utf8");
          const updatedContent = replaceImportPaths(
            content,
            path.dirname(filePath),
            config.outputDir,
            config.isJSR,
          );
          if (content !== updatedContent) {
            await fs.writeFile(filePath, updatedContent, "utf8");
            logger.verbose(`Updated imports in: ${filePath}`);
          }
        } catch (error) {
          logger.error(`Failed to process file ${filePath}`, error);
        }
      }
    }
  } catch (error) {
    logger.error("Failed to recursively process files for JSR", error);
    throw error;
  }
}

async function renameTsxFiles(dir: string) {
  try {
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
  } catch (error) {
    logger.error("Failed to rename .tsx files", error);
    throw error;
  }
}

async function prepareDistDirectory() {
  try {
    if (!config.pausePublish && (await fs.pathExists(config.outputDir))) {
      await fs.remove(config.outputDir);
      logger.verbose(`Removed existing '${config.outputDir}' directory`);
    }

    const binDir = path.join(config.outputDir, "bin");
    await fs.ensureDir(binDir);
    await fs.copy(config.sourceDir, binDir, {
      overwrite: true,
      errorOnExist: false,
    });
    logger.verbose(`Copied source files to ${binDir}`);
  } catch (error) {
    logger.error("Failed to prepare distribution directory", error);
    throw error;
  }
}

async function createJsrConfig(outputDir: string) {
  try {
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
  } catch (error) {
    logger.error("Failed to create jsr.jsonc", error);
    throw error;
  }
}

async function copyJsrFiles(outputDir: string) {
  try {
    await fs.writeFile(
      path.join(outputDir, ".gitignore"),
      "node_modules/\n.env\n",
      "utf-8",
    );
    logger.verbose("Generated .gitignore file");

    await createJsrConfig(outputDir);

    const jsrFiles = [
      ".reliverse",
      "bun.lockb",
      "drizzle.config.ts",
      "schema.json",
    ];
    await Promise.all(
      jsrFiles.map(async (file) => {
        if (await fs.pathExists(file)) {
          await fs.copy(file, path.join(outputDir, file));
          logger.verbose(`Copied JSR file: ${file}`);
        } else {
          logger.verbose(`JSR file not found: ${file}`);
        }
      }),
    );
  } catch (error) {
    logger.error("Failed to copy JSR files", error);
    throw error;
  }
}

async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    const sizes = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        return stats.isDirectory() ? getDirectorySize(filePath) : stats.size;
      }),
    );
    return sizes.reduce((total, size) => total + size, 0);
  } catch (error) {
    logger.error(`Failed to calculate directory size for ${dirPath}`, error);
    return 0;
  }
}
async function publishProject() {
  try {
    const shouldPublish = !config.pausePublish;
    const isDryRun = scriptFlags["dry-run"];

    if (scriptFlags["jsr"]) {
      logger.info("📦 Publishing JSR version...");
      await publishJsr(scriptFlags["dry-run"], shouldPublish, isDryRun);
    }

    if (scriptFlags["npm"]) {
      logger.info("📦 Publishing NPM version...");
      await publishNpm(scriptFlags["dry-run"], shouldPublish, isDryRun);
    }

    logger.success("Publishing process completed successfully!");
  } catch (error) {
    logger.error("Failed to publish project", error);
    throw error;
  }
}

async function buildProject() {
  try {
    logger.info(`Creating ${config.isJSR ? "JSR" : "NPM"} distribution...`);

    await prepareDistDirectory();
    await createDistPackageJSON(config.outputDir);
    await processFilesForJSR(config.outputDir);

    if (config.isJSR) {
      await createTSConfig(config.outputDir);
      await copyJsrFiles(config.outputDir);
      await renameTsxFiles(config.outputDir);
    } else {
      await deleteFiles(config.filesToDelete, config.outputDir);
    }

    await copyRepoFiles(config.outputDir);

    const size = await getDirectorySize(config.outputDir);
    logger.success(
      `Successfully created ${config.isJSR ? "JSR" : "NPM"} distribution (${size} bytes)`,
    );
  } catch (error) {
    logger.error("Build optimization failed", error);
    process.exit(1);
  }
}

function unknownFlagsHandler() {
  const unknownFlags = Object.keys(scriptFlags).filter(
    (key) => !validFlags.includes(key) && key !== "_",
  );
  if (unknownFlags.length > 0) {
    logger.error(`Unknown flag(s): ${unknownFlags.join(", ")}`);
    showHelp();
    process.exit(1);
  }
}

// ---------- PUBLISH MAIN (for `bun pub`) ----------
export async function mainTwo(): Promise<void> {
  try {
    if (scriptFlags["jsr"]) {
    } else if (args.npm) {
      logger.info("📦 Publishing NPM version...");
      await execaCommand(
        `bun build.publish.ts ${args.bump || ""} ${noDistRmFlag}`,
        { stdio: "inherit" },
      );
    } else if (args.dryRun) {
      logger.info("🔍 Performing a dry run for both JSR and NPM...");
      await execaCommand(`bun pub:jsr --dry-run${noDistRmFlag}`, {
        stdio: "inherit",
      });
      await execaCommand(`bun pub:npm --dry-run${noDistRmFlag}`, {
        stdio: "inherit",
      });
    } else if (args.pausePublish) {
      logger.info("⏸️  Building both JSR and NPM, skipping publish...");
      await execaCommand(
        `bun build.publish.ts ${args.bump || ""} --jsr --pause-publish${noDistRmFlag}`,
        { stdio: "inherit" },
      );
      await execaCommand(`bun pub:npm --pause-publish${noDistRmFlag}`, {
        stdio: "inherit",
      });
    } else {
      logger.info("📦 Publishing both JSR and NPM versions...");
      await execaCommand(
        `bun build.publish.ts ${args.bump || ""} --jsr${noDistRmFlag}`,
        { stdio: "inherit" },
      );
      await execaCommand(`bun pub:npm ${args.bump || ""}${noDistRmFlag}`, {
        stdio: "inherit",
      });
    }

    logger.success("Publishing process completed successfully!");
  } catch (error) {
    logger.error("Publishing process failed:", error);
    process.exit(1);
  }
}

async function bumpHandler() {
  const newVersion = scriptFlags._[0];

  if (!newVersion) {
    logger.info("No version specified, skipping version bump...");
  } else {
    if (!semver.valid(newVersion)) {
      throw new Error(`Invalid version format: ${newVersion}`);
    }

    const pkgPath = path.resolve("package.json");
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error("package.json not found");
    }
    const pkgJson = destr<PackageJson>(await fs.readFile(pkgPath, "utf-8"));
    if (!pkgJson.version) {
      throw new Error("No version field found in package.json");
    }
    const oldVersion = pkgJson.version;

    if (oldVersion !== newVersion) {
      await bumpVersions(oldVersion, newVersion);
    } else {
      logger.info(`Version already at ${oldVersion}, no bump needed.`);
    }
  }
}

export async function main(): Promise<void> {
  try {
    // Check for unknown flags
    unknownFlagsHandler();

    // Show help if requested
    if (scriptFlags["help"] || scriptFlags["h"]) {
      showHelp();
      process.exit(0);
    }

    // If not in pause mode, check dist folders
    if (!scriptFlags["pausePublish"] && !(await checkDistFolders())) {
      process.exit(1);
    }

    // Bump version if requested
    await bumpHandler();

    // Build project
    await buildProject();

    // Publish project
    await publishProject();
  } catch (error) {
    logger.error("An unexpected error occurred:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  try {
    await main();
    logger.success("build.setup.ts completed");
  } catch (error) {
    logger.error("Failed to run script:", error);
    if (error instanceof Error) {
      logger.error("Error details:", error.message);
      logger.verbose(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}
