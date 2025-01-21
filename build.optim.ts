import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";
import { fileURLToPath } from "url";

// Verbose logging
export const verbose = false;

// Parse command-line arguments to check for '--jsr' flag
const args: string[] = process.argv.slice(2);
const isJSR: boolean = args.includes("--jsr");

// Get current directory using import.meta.url
const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Directories based on the presence of '--jsr' flag
const sourceDir: string = path.resolve(currentDir, "src");
const outputDir: string = path.resolve(
  currentDir,
  isJSR ? "dist-jsr" : "dist-npm",
);

// Separate patterns for files to delete in different modes
const arrayFilesToDelete: string[] = [
  "**/*.test.js",
  "**/*.test.ts",
  "**/*.test.d.ts",
  "types/internal.js",
  "types/internal.d.ts",
  "**/*.temp.js",
  "**/*.temp.d.ts",
];

/**
 * Deletes files matching the provided patterns within the base directory.
 */
async function deleteFiles(patterns: string[], baseDir: string): Promise<void> {
  try {
    const files: string[] = await globby(patterns, {
      cwd: baseDir,
      absolute: true,
    });

    if (files.length === 0) {
      console.log("No files matched the deletion patterns.");
      return;
    }

    for (const filePath of files) {
      try {
        await fs.remove(filePath);
        if (verbose) {
          console.log(`Deleted: ${filePath}`);
        }
      } catch (error) {
        console.error(
          `Error deleting file ${filePath}:`,
          error instanceof Error ? error.message : JSON.stringify(error),
        );
      }
    }
  } catch (error) {
    console.error(
      "Error processing deletion patterns:",
      error instanceof Error ? error.message : JSON.stringify(error),
    );
  }
}

/**
 * Replaces import paths that use '~/' with relative paths.
 * If `isJSR` is true, also replaces '.js' extensions with '.ts'.
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
      const relativePathToRoot: string = path.relative(fileDir, rootDir);
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

    if (verbose) {
      console.log("Replaced '.js' with '.ts' in import paths.");
    }
  }

  return updatedContent;
}

/**
 * Removes comments from the given content string.
 * - Strips block comments using `strip-comments`.
 * @returns The content without unwanted comments.
 */
// function removeComments(content: string, filePath: string): string {
function removeComments(content: string): string {
  // When not in JSR mode, strip all comments using strip-comments
  // const stripped = strip(content, {
  //   line: true,
  //   block: true,
  //   keepProtected: true,
  //   preserveNewlines: false,
  // });

  // if (debug) {
  //   console.log(`\nProcessing file: ${filePath}`);
  //   console.log("Stripped all comments.");
  // }

  return content; // return stripped;
}

/**
 * Processes all relevant files in the given directory
 * by replacing import paths and removing comments.
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
      if (verbose) {
        console.log(`\nProcessing file: ${filePath}`);
      }

      try {
        const content: string = await fs.readFile(filePath, "utf8");

        let updatedContent: string = replaceImportPaths(
          content,
          path.dirname(filePath),
          outputDir,
          isJSR,
        );

        if (!isJSR) {
          // updatedContent = removeComments(updatedContent, filePath);
          updatedContent = removeComments(updatedContent);
        }

        if (content !== updatedContent) {
          await fs.writeFile(filePath, updatedContent, "utf8");
          if (verbose) {
            console.log(`Updated file: ${filePath}`);
          }
        }
      } catch (error) {
        console.error(
          `Error processing file ${filePath}:`,
          error instanceof Error ? error.message : JSON.stringify(error),
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
      if (verbose) {
        console.log(`Removed existing '${outputDir}' directory.`);
      }
    }
  } catch (error) {
    console.error(
      `Error removing '${outputDir}' directory:`,
      error instanceof Error ? error.message : JSON.stringify(error),
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
    if (verbose) {
      console.log(`Copied 'src' to '${outputDir}'`);
    }
  } catch (error) {
    console.error(
      `Error copying 'src' to '${outputDir}':`,
      error instanceof Error ? error.message : JSON.stringify(error),
    );
    throw error;
  }
}

/**
 * Renames all .tsx files to -tsx.txt in the specified directory and its subdirectories.
 */
async function renameTsxFiles(dir: string): Promise<void> {
  try {
    const files = await globby("**/*.tsx", {
      cwd: dir,
      absolute: true,
    });

    for (const filePath of files) {
      const newPath = filePath.replace(/\.tsx$/, "-tsx.txt");
      await fs.rename(filePath, newPath);
      if (verbose) {
        console.log(`Renamed: ${filePath} -> ${newPath}`);
      }
    }
  } catch (error) {
    console.error(
      `Error renaming .tsx files: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
    );
  }
}

/**
 * Optimizes the build for production by processing files and deleting unnecessary ones.
 */
async function optimizeBuildForProduction(dir: string): Promise<void> {
  if (isJSR) {
    console.log("Preparing JSR build by removing existing output directory...");
    await removeOutputDirectory(); // Remove outputDir before copying
    console.log("Copying 'src' to output directory...");
    await copySrcToOutput();
    console.log("Processing copied files to replace import paths...");
    await processFiles(outputDir); // Process files after copying
    console.log("Renaming .tsx files to -tsx.txt for JSR compatibility...");
    await renameTsxFiles(outputDir);
  } else {
    console.log("Creating an optimized production build...");
    await processFiles(dir);
    console.log("Cleaning up unnecessary files...");
    const filesToDelete: string[] = arrayFilesToDelete;
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
        console.log(`Total size of ${outputDir}: ${String(size)} bytes`);
      })
      .catch((error: unknown) => {
        console.error(
          `Error calculating directory size for ${outputDir}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      });
  })
  .catch((error: unknown) => {
    console.log(error instanceof Error ? error.message : JSON.stringify(error));
  });
