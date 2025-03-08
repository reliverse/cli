import { relinka } from "@reliverse/prompts";
import escapeStringRegexp from "escape-string-regexp";
import fs from "fs-extra";
import path from "pathe";

/**
 * Utility to extract author and project name from template URL
 */
export function extractRepoInfo(templateUrl: string): {
  inputRepoAuthor: string;
  inputRepoName: string;
} {
  // Ensure the template URL has the correct github: prefix
  const formattedTemplateUrl = templateUrl.startsWith("github:")
    ? templateUrl
    : `github:${templateUrl}`;

  // Extract author and project name from the URL
  // Example: github:user/project or github:user/project.git
  const match = /^github:(?:https?:\/\/github\.com\/)?([^/]+)\/([^/]+)/.exec(
    formattedTemplateUrl,
  );

  if (!match) {
    return { inputRepoAuthor: "", inputRepoName: "" };
  }

  const [, repoAuthor, repoName] = match;
  const inputRepoAuthor = repoAuthor ?? "";
  const inputRepoName = repoName?.replace(".git", "") ?? "";

  return {
    inputRepoAuthor,
    inputRepoName,
  };
}

// Type for optional configuration object
export type ReplaceConfig = {
  fileExtensions?: string[]; // e.g. [".js", ".ts", ".json"]
  excludedDirs?: string[]; // e.g. ["node_modules", ".git"]
  stringExclusions?: string[]; // Values we never want to replace
  verbose?: boolean; // Show which files got changed
  dryRun?: boolean; // If true, do not write changes, only log
  skipBinaryFiles?: boolean; // If true, skip binary files
  maxConcurrency?: number; // Limit concurrency for file processing
  stopOnError?: boolean; // Whether to stop immediately if a file fails
};

/**
 * Check if a buffer looks like binary content
 * (very naive approach: if we see a null byte or lots of weird chars early on).
 */
function looksLikeBinary(buffer: Buffer, size: number): boolean {
  for (let i = 0; i < size; i++) {
    // If there's a null character, let's treat it as binary
    if (buffer[i] === 0) return true;
  }
  return false;
}

/**
 * Asynchronously checks if a file is "binary" by reading the first chunk.
 */
async function isBinaryFile(
  filePath: string,
  chunkSize = 1000,
): Promise<boolean> {
  const fd = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await fd.read(buffer, 0, chunkSize, 0);
    return looksLikeBinary(buffer, bytesRead);
  } finally {
    await fd.close();
  }
}

/**
 * Recursively gathers all files from a directory and its subdirectories.
 * Skips directories based on the provided filter function.
 *
 * @param dir - The root directory to start gathering files from
 * @param shouldSkipDir - Function that determines if a directory should be skipped
 * @returns Promise resolving to an array of absolute file paths
 */
async function gatherAllFiles(
  dir: string,
  shouldSkipDir: (dirName: string) => boolean,
): Promise<string[]> {
  const filesInDir = await fs.promises.readdir(dir);
  const result: string[] = [];

  for (const file of filesInDir) {
    const fullPath = path.join(dir, file);
    const stat = await fs.promises.lstat(fullPath);

    if (stat.isDirectory()) {
      if (!shouldSkipDir(file)) {
        const nested = await gatherAllFiles(fullPath, shouldSkipDir);
        result.push(...nested);
      }
    } else {
      result.push(fullPath);
    }
  }

  return result;
}

/**
 * Executes tasks with limited concurrency. Provides error handling and progress tracking.
 *
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent tasks
 * @param taskFn - Async function to execute for each item
 * @param stopOnError - If true, stops processing on first error; if false, continues with remaining items
 * @returns Promise that resolves when all tasks complete or rejects if stopOnError is true and an error occurs
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  taskFn: (item: T) => Promise<void>,
  stopOnError: boolean,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let index = 0;
    let active = 0;
    let isRejected = false;
    let completedCount = 0;

    const next = () => {
      if (isRejected) return;
      if (completedCount === items.length) {
        return resolve();
      }
      while (active < concurrency && index < items.length) {
        const currentItem = items[index];
        if (currentItem === undefined) {
          index++;
          continue;
        }
        active++;
        index++;
        taskFn(currentItem)
          .catch((err) => {
            if (stopOnError) {
              isRejected = true;
              return reject(
                err instanceof Error ? err : new Error(String(err)),
              );
            } else {
              relinka("error", `Error processing item: ${String(err)}`);
            }
          })
          .finally(() => {
            active--;
            completedCount++;
            next();
          });
      }
    };

    next();
  });
}

/**
 * Replaces specified strings in files under a target directory.
 * Supports concurrent processing, binary file detection, and dry runs.
 *
 * @param projectPath - Root directory to process files in
 * @param oldValues - Map of strings to replace (key) with their replacements (value)
 * @param config - Optional configuration for file processing:
 *   - fileExtensions: File types to process (e.g., [".js", ".ts"])
 *   - excludedDirs: Directories to skip (e.g., ["node_modules"])
 *   - stringExclusions: Strings to never replace
 *   - verbose: Enable detailed logging
 *   - dryRun: Preview changes without writing
 *   - skipBinaryFiles: Skip processing of binary files
 *   - maxConcurrency: Limit parallel processing
 *   - stopOnError: Stop on first error
 * @throws Error if target directory doesn't exist or processing fails
 */
export async function replaceStringsInFiles(
  projectPath: string,
  oldValues: Record<string, string>,
  config: ReplaceConfig = {},
): Promise<void> {
  // Validate inputs
  if (!projectPath || typeof projectPath !== "string") {
    throw new Error("Target directory is required and must be a string");
  }
  if (!oldValues || typeof oldValues !== "object") {
    throw new Error("oldValues must be a non-null object");
  }

  // Merge defaults with user-provided config
  const {
    fileExtensions = [
      ".js",
      ".ts",
      ".json",
      ".md",
      ".mdx",
      ".html",
      ".jsx",
      ".tsx",
      ".css",
      ".scss",
      ".mjs",
      ".cjs",
    ],
    excludedDirs = [
      "node_modules",
      ".git",
      "build",
      ".next",
      "dist",
      "dist-jsr",
      "dist-npm",
      "coverage",
    ],
    stringExclusions = [
      "https://api.github.com/repos/blefnk/relivator",
      "https://api.github.com/repos/blefnk/relivator-nextjs-template",
      "https://api.github.com/repos/blefnk/versator",
      "https://api.github.com/repos/blefnk/versator-nextjs-template",
    ],
    verbose = false,
    dryRun = false,
    skipBinaryFiles = false,
    maxConcurrency = 8,
    stopOnError = false,
  } = config;

  // We'll split config.fileExtensions into actual file extensions & exact file names
  const exactFileNames = new Set<string>();
  const extensionSet = new Set<string>();

  for (const pattern of fileExtensions) {
    if (pattern.startsWith(".")) {
      // treat it as an extension
      extensionSet.add(pattern.toLowerCase());
    } else {
      // treat it as an exact filename match
      exactFileNames.add(pattern.toLowerCase());
    }
  }

  function shouldProcessFile(filePath: string): boolean {
    const base = path.basename(filePath).toLowerCase();
    const ext = path.extname(base).toLowerCase();

    // If the file's full name is in the set, or its extension is in the set,
    // then we consider it for replacements.
    if (exactFileNames.has(base)) {
      return true;
    }
    return extensionSet.has(ext);
  }

  function shouldSkipDirectory(dirName: string): boolean {
    return excludedDirs.includes(dirName);
  }

  /**
   * Processes a single file, replacing specified strings while tracking changes.
   *
   * @param filePath - Path to the file being processed
   * @throws Error if file processing fails
   */
  async function replaceInFile(filePath: string) {
    try {
      // Skip binary files if configured
      if (skipBinaryFiles && (await isBinaryFile(filePath))) {
        verbose && relinka("info-verbose", `Skipping binary file: ${filePath}`);
        return;
      }

      const fileContent = await fs.promises.readFile(filePath, "utf8");
      let newContent = fileContent;
      let hasChanges = false;
      const changesMade: string[] = [];

      // Process each replacement pattern
      for (const [key, value] of Object.entries(oldValues)) {
        // Skip invalid patterns or excluded strings
        if (!key || !value || stringExclusions.includes(key)) continue;

        // Create a safe regex pattern and track replacements
        const safeKey = escapeStringRegexp(key);
        const regex = new RegExp(safeKey, "g");
        let localChangeCount = 0;

        // Perform replacements and track count
        newContent = newContent.replace(regex, (_match) => {
          hasChanges = true;
          localChangeCount++;
          return value;
        });

        // Record changes if any occurred
        if (localChangeCount > 0) {
          changesMade.push(`${key} => ${value} (${localChangeCount}x)`);
        }
      }

      // Apply changes if any were made
      if (hasChanges) {
        // Write changes unless in dry-run mode
        if (!dryRun) {
          await fs.promises.writeFile(filePath, newContent, "utf8");
        }

        // Log changes based on verbosity setting
        if (verbose) {
          const relativePath = path.relative(projectPath, filePath);
          relinka("info-verbose", `Updated ${relativePath}:`);
          changesMade.forEach((c) => relinka("info-verbose", `  - ${c}`));
        } else {
          relinka("info-verbose", `Updated strings in ${filePath}`);
        }
      }
    } catch (error) {
      throw new Error(`Error processing file ${filePath}: ${String(error)}`);
    }
  }

  // Start the process
  const errors: string[] = [];

  // 1. Ensure the target dir exists
  const exists = await fs.pathExists(projectPath);
  if (!exists) {
    throw new Error(`Target directory does not exist: ${projectPath}`);
  }

  // 2. Gather all files
  let allFiles: string[] = [];
  try {
    allFiles = await gatherAllFiles(projectPath, shouldSkipDirectory);
  } catch (err) {
    const e = `Error reading directory structure: ${String(err)}`;
    errors.push(e);
    relinka("error", e);
  }

  // 3. Filter files by extension / name
  const targetFiles = allFiles.filter((filePath) =>
    shouldProcessFile(filePath),
  );

  // 4. Process them with concurrency
  try {
    await runWithConcurrency(
      targetFiles,
      maxConcurrency,
      replaceInFile,
      stopOnError,
    );
  } catch (err) {
    errors.push(String(err));
  }

  // If any errors occurred, log them and throw
  if (errors.length > 0) {
    relinka(
      "error",
      `Some files could not be processed:\n${errors.join(", ")}`,
    );
    throw new Error("Failed to replace strings in some files.");
  }
}
