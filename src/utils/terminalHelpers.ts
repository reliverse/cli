import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import { cwd } from "node:process";
import { normalize } from "pathe";

export const handleError = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

/**
 * Changes the current working directory to the specified path.
 * Logs a warning if the target directory does not exist.
 */
export async function cd(dir: string): Promise<void> {
  try {
    await fs.ensureDir(dir);
    await fs.access(dir);
    process.chdir(dir);
    relinka("info-verbose", `Changed directory to: ${process.cwd()}`);
  } catch (error) {
    relinka("warn", `Directory does not exist: ${dir}`, handleError(error));
  }
}

/**
 * Returns the current working directory.
 */
export function pwd() {
  // Re-check the current working directory
  const cwd = getCurrentWorkingDirectory();
  relinka("info-verbose", `Current working directory: ${cwd}`);
}

/**
 * Removes a file or directory (recursively, if it's a directory).
 * Logs an error if removal fails.
 */
export async function rm(target: string): Promise<void> {
  try {
    await fs.remove(target);
    relinka("info-verbose", `Removed: ${target}`);
  } catch (error) {
    relinka("error", `Failed to remove: ${target}`, handleError(error));
  }
}

/**
 * Returns the current working directory.
 */
export function getCurrentWorkingDirectory(useCache = true): string {
  let cachedCWD: null | string = null;
  if (useCache && cachedCWD) {
    return cachedCWD;
  }
  try {
    const currentDirectory = normalize(cwd());
    if (useCache) {
      cachedCWD = currentDirectory;
    }
    return currentDirectory;
  } catch (error) {
    relinka(
      "error",
      "Error getting current working directory:",
      handleError(error),
    );
    throw error;
  }
}
