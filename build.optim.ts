import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";
import { fileURLToPath } from "url";

import { relinka } from "~/utils/console.js";

// Parse command-line arguments to check for '--jsr' flag
const args: string[] = process.argv.slice(2);
const isJSR: boolean = args.includes("--jsr");

// Get current directory using import.meta.url
const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Define directories based on the presence of '--jsr' flag
const sourceDir: string = path.resolve(currentDir, "src");
const outputDir: string = path.resolve(
  currentDir,
  isJSR ? "dist-jsr" : "dist-npm",
);

// Separate patterns for files to delete in different modes
const npmFilesToDelete: string[] = [
  "**/*.test.js",
  "**/*.test.d.ts",
  "types/internal.js",
  "types/internal.d.ts",
  "**/*.temp.js",
  "**/*.temp.d.ts",
];

const jsrFilesToDelete: string[] = ["**/*.test.ts", "**/*.temp.ts"];

/**
 * Deletes files matching the provided patterns within the base directory.
 * @param patterns - Array of glob patterns to match files for deletion.
 * @param baseDir - The base directory to search for files.
 */
async function deleteFiles(patterns: string[], baseDir: string): Promise<void> {
  try {
    const files: string[] = await globby(patterns, {
      cwd: baseDir,
      absolute: true,
    });

    if (files.length === 0) {
      relinka("info", "No files matched the deletion patterns.");
      return;
    }

    for (const filePath of files) {
      try {
        await fs.remove(filePath);
        relinka("info-verbose", `Deleted: ${filePath}`);
      } catch (error) {
        relinka("error", `Error deleting file ${filePath}:`, error.toString());
      }
    }
  } catch (error) {
    relinka("error", "Error processing deletion patterns:", error.toString());
  }
}

/**
 * Replaces import paths that use '~/' with relative paths.
 * If `isJSR` is true, also replaces '.js' extensions with '.ts'.
 * @param content - The file content.
 * @param fileDir - The directory of the current file.
 * @param rootDir - The root directory to resolve relative paths.
 * @param isJSR - Flag indicating whether to apply JSR-specific transformations.
 * @returns The updated file content with modified import paths.
 */
function replaceImportPaths(
  content: string,
  fileDir: string,
  rootDir: string,
  isJSR: boolean,
): string {
  let updatedContent = content.replace(
    // Matches both static and dynamic imports
    /(from\s+['"]|import\s*\(\s*['"])(~\/?[^'"]*)(['"]\s*\)?)/g,
    (
      _match: string,
      prefix: string,
      importPath: string,
      suffix: string,
    ): string => {
      const relativePathToRoot: string = path.relative(fileDir, rootDir) || ".";
      // Remove leading '~/' or '~' from importPath
      importPath = importPath.replace(/^~\/?/, "");
      let newPath: string = path.join(relativePathToRoot, importPath);
      // Replace backslashes with forward slashes
      newPath = newPath.replace(/\\/g, "/");
      // Ensure the path starts with './' or '../'
      if (!newPath.startsWith(".")) {
        newPath = `./${newPath}`;
      }
      return `${prefix}${newPath}${suffix}`;
    },
  );

  if (isJSR) {
    // Replace '.js' extensions with '.ts' in import paths
    // @see https://jsr.io/docs/publishing-packages#relative-imports
    updatedContent = updatedContent.replace(/(\.js)(?=['";])/g, ".ts");

    relinka("info-verbose", "Replaced '.js' with '.ts' in import paths.");
  }

  return updatedContent;
}

/**
 * Removes comments from the given content string.
 * - Strips block comments using `strip-comments`.
 * @param content - The file content.
 * @param filePath - The path of the file being processed.
 * @returns The content without unwanted comments.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function removeComments(content: string, filePath: string): string {
  // When not in JSR mode, strip all comments using strip-comments
  // const stripped = strip(content, {
  //   line: true,
  //   block: true,
  //   keepProtected: true,
  //   preserveNewlines: false,
  // });

  // if (debug) {
  //   relinka("info", `\nProcessing file: ${filePath}`);
  //   relinka("info", "Stripped all comments.");
  // }

  return content; // return stripped;
}

/**
 * Processes all relevant files in the given directory
 * by replacing import paths and removing comments.
 * @param dir - The directory to process.
 */
async function processFiles(dir: string): Promise<void> {
  const files: string[] = await fs.readdir(dir);

  for (const file of files) {
    const filePath: string = path.join(dir, file);
    const stat: fs.Stats = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await processFiles(filePath);
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
      relinka("info-verbose", `\nProcessing file: ${filePath}`);

      try {
        const content: string = await fs.readFile(filePath, "utf8");

        let updatedContent: string = replaceImportPaths(
          content,
          path.dirname(filePath),
          outputDir,
          isJSR,
        );

        if (!isJSR) {
          updatedContent = removeComments(updatedContent, filePath);
        }

        if (content !== updatedContent) {
          await fs.writeFile(filePath, updatedContent, "utf8");
          relinka("info-verbose", `Updated file: ${filePath}`);
        }
      } catch (error) {
        relinka(
          "error",
          `Error processing file ${filePath}:`,
          error.toString(),
        );
      }
    }
  }
}

/**
 * Removes the output directory ('dist-jsr' or 'dist-npm') if it exists.
 */
async function removeOutputDirectory(): Promise<void> {
  try {
    const exists: boolean = await fs.pathExists(outputDir);
    if (exists) {
      await fs.remove(outputDir);
      relinka("info-verbose", `Removed existing '${outputDir}' directory.`);
    }
  } catch (error) {
    relinka(
      "error",
      `Error removing '${outputDir}' directory:`,
      error.toString(),
    );
    throw error;
  }
}

/**
 * Copies the 'src' directory to the output directory when '--jsr' flag is provided.
 */
async function copySrcToOutput(): Promise<void> {
  try {
    await fs.copy(sourceDir, outputDir, {
      overwrite: true,
      errorOnExist: false,
    });
    relinka("info-verbose", `Copied 'src' to '${outputDir}'`);
  } catch (error) {
    relinka(
      "error",
      `Error copying 'src' to '${outputDir}':`,
      error.toString(),
    );
    throw error;
  }
}

/**
 * Optimizes the build for production by processing files and deleting unnecessary ones.
 * @param dir - The directory to optimize.
 */
async function optimizeBuildForProduction(dir: string): Promise<void> {
  if (isJSR) {
    relinka(
      "info",
      "Preparing JSR build by removing existing output directory...",
    );
    await removeOutputDirectory(); // Remove outputDir before copying
    relinka("info", "Copying 'src' to output directory...");
    await copySrcToOutput();
    relinka("info", "Processing copied files to replace import paths...");
    await processFiles(outputDir); // Process files after copying
  } else {
    relinka("info", "Creating an optimized production build...");
    await processFiles(dir);
    relinka("info", "Cleaning up unnecessary files...");
    const filesToDelete: string[] = isJSR ? jsrFilesToDelete : npmFilesToDelete;
    await deleteFiles(filesToDelete, dir);
  }
}

async function getDirectorySize(dirPath: string): Promise<number> {
  const files = await fs.readdir(dirPath);
  let totalSize = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      totalSize += await getDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

await optimizeBuildForProduction(outputDir)
  .then(() => {
    getDirectorySize(outputDir)
      .then((size) => {
        relinka("info", `Total size of ${outputDir}: ${size} bytes`);
      })
      .catch((error) => {
        relinka(
          "error",
          `Error calculating directory size for ${outputDir}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      });
  })
  .catch((error: Error) => relinka("error", error.message));
