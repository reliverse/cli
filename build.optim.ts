import { re } from "@reliverse/relico";
import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";
import {
  readPackageJSON,
  defineTSConfig,
  definePackageJSON,
  type PackageJson,
} from "pkg-types";
import { fileURLToPath } from "url";

// Configuration types
type BuildConfig = {
  verbose: boolean;
  isJSR: boolean;
  sourceDir: string;
  outputDir: string;
  filesToDelete: string[];
  pausePublish: boolean;
};

// Build configuration
const config: BuildConfig = {
  verbose: false,
  isJSR: process.argv.includes("--jsr"),
  sourceDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
  outputDir: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    process.argv.includes("--jsr") ? "dist-jsr" : "dist-npm",
  ),
  filesToDelete: [
    "**/*.test.js",
    "**/*.test.ts",
    "**/*.test.d.ts",
    "types/internal.js",
    "types/internal.d.ts",
    "**/*.temp.js",
    "**/*.temp.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "!**/*.d.ts", // Keep type definitions
    "!**/*.js", // Keep JavaScript files
  ],
  pausePublish: process.argv.includes("--pause-publish"),
};

/**
 * Logger utility for consistent logging
 */
const logger = {
  info: (message: string) => console.log(`📝 ${re.cyanBright(message)}`),
  success: (message: string) => console.log(`✅ ${re.greenBright(message)}`),
  error: (message: string, error?: unknown) => {
    console.error(
      message,
      error instanceof Error ? error.message : JSON.stringify(error),
    );
  },
  verbose: (message: string) => {
    if (config.verbose) {
      console.log(`📝 ${re.magentaBright(message)}`);
    }
  },
};

/**
 * Creates common package.json fields
 */
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

/**
 * Filters out eslint and prettier related dev dependencies
 */
function filterDevDependencies(
  devDeps: Record<string, string> | undefined,
): Record<string, string> {
  if (!devDeps) return {};

  return Object.entries(devDeps).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      // Only keep dependencies that don't contain eslint or prettier
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

/**
 * Creates distribution package.json
 */
async function createDistPackageJSON(distDir: string): Promise<void> {
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
        jsr: {
          type: "module",
        },
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
        files: [
          "bin/**/*.js", // Include all JS files in bin directory
          "bin/**/*.d.ts", // Include type definitions
          "package.json",
          "README.md",
          "LICENSE",
        ],
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

/**
 * Creates tsconfig.json for JSR distribution
 */
async function createTSConfig(outputDir: string): Promise<void> {
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

/**
 * Copies repository files (README, LICENSE)
 */
async function copyRepoFiles(outputDir: string): Promise<void> {
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

/**
 * Deletes files matching patterns
 */
async function deleteFiles(patterns: string[], baseDir: string): Promise<void> {
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

/**
 * Replaces import paths that use '~/' with relative paths
 * and converts `.js` imports to `.ts` if in JSR mode.
 */
function replaceImportPaths(
  content: string,
  fileDir: string,
  rootDir: string,
  isJSR: boolean,
): string {
  let updatedContent = content.replace(
    // Matches both static and dynamic imports that start with "~"
    /(from\s+['"]|import\s*\(\s*['"])(~\/?[^'"]*)(['"]\s*\)?)/g,
    (_match, prefix, importPath, suffix) => {
      // For both JSR and NPM builds, we need to look in the bin directory
      const targetDir = path.join(rootDir, "bin");
      const relativePathToRoot = path.relative(fileDir, targetDir);
      // Remove leading '~/' or '~' from importPath
      importPath = importPath.replace(/^~\/?/, "");
      let newPath = path.join(relativePathToRoot, importPath);
      // Replace backslashes with forward slashes (for Windows)
      newPath = newPath.replace(/\\/g, "/");
      // Ensure the path starts with './' or '../'
      if (!newPath.startsWith(".")) {
        newPath = `./${newPath}`;
      }
      return `${prefix}${newPath}${suffix}`;
    },
  );

  // If JSR, replace .js with .ts in import statements
  if (isJSR) {
    updatedContent = updatedContent.replace(/(\.js)(?=['"])/g, ".ts");
    logger.verbose("Converted .js imports to .ts for JSR build");
  }

  return updatedContent;
}

/**
 * Recursively processes files in a directory to replace import paths if JSR is true.
 */
async function processFilesForJSR(dir: string): Promise<void> {
  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await processFilesForJSR(filePath);
      } else if (
        filePath.endsWith(".ts") ||
        filePath.endsWith(".tsx") ||
        filePath.endsWith(".d.ts") ||
        filePath.endsWith(".js") ||
        filePath.endsWith(".jsx") ||
        filePath.endsWith(".mjs") ||
        filePath.endsWith(".cjs") ||
        filePath.endsWith(".mts") ||
        filePath.endsWith(".cts")
      ) {
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

/**
 * Renames .tsx files to -tsx.txt
 */
async function renameTsxFiles(dir: string): Promise<void> {
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

/**
 * Prepares the distribution directory
 */
async function prepareDistDirectory(): Promise<void> {
  try {
    // Only remove the output directory if not in pause mode
    if (!config.pausePublish && (await fs.pathExists(config.outputDir))) {
      await fs.remove(config.outputDir);
      logger.verbose(`Removed existing '${config.outputDir}' directory`);
    }

    // Create bin directory if it doesn't exist
    const binDir = path.join(config.outputDir, "bin");
    await fs.ensureDir(binDir);

    // Copy source files, overwriting existing ones
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

/**
 * Creates JSR configuration file
 */
async function createJsrConfig(outputDir: string): Promise<void> {
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

/**
 * Copies JSR-specific files from root
 */
async function copyJsrFiles(outputDir: string): Promise<void> {
  try {
    // Generate .gitignore with specific content
    await fs.writeFile(
      path.join(outputDir, ".gitignore"),
      "node_modules/\n.env\n",
      "utf-8",
    );
    logger.verbose("Generated .gitignore file");

    // Generate jsr.jsonc
    await createJsrConfig(outputDir);

    // Copy other JSR files
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

/**
 * Optimizes the build for production
 */
async function optimizeBuildForProduction(): Promise<void> {
  try {
    logger.info(`Creating ${config.isJSR ? "JSR" : "NPM"} distribution...`);

    // Prepare distribution directory
    await prepareDistDirectory();

    // Create package.json
    await createDistPackageJSON(config.outputDir);

    // Process files to rewrite import paths for both JSR and NPM
    await processFilesForJSR(config.outputDir);

    if (config.isJSR) {
      // Create tsconfig.json for JSR
      await createTSConfig(config.outputDir);

      // Copy JSR-specific files
      await copyJsrFiles(config.outputDir);

      // Rename .tsx files
      await renameTsxFiles(config.outputDir);
    } else {
      // Clean up test/temporary files and TypeScript files for NPM
      await deleteFiles(config.filesToDelete, config.outputDir);
    }

    // Copy repository files
    await copyRepoFiles(config.outputDir);

    // Calculate and log directory size
    const size = await getDirectorySize(config.outputDir);
    logger.success(
      `Successfully created ${config.isJSR ? "JSR" : "NPM"} distribution (${size} bytes)`,
    );
  } catch (error) {
    logger.error("Build optimization failed", error);
    process.exit(1);
  }
}

/**
 * Calculates directory size recursively
 */
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

// Run the build optimization
await optimizeBuildForProduction();
