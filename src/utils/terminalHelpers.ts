import { relinka } from "@reliverse/relinka";
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
 * Lists the contents of a directory. If no directory is specified,
 * the current working directory is used. Logs a warning if the directory
 * does not exist.
 */
export async function ls(dir?: string): Promise<string[]> {
  const projectPath = dir ?? process.cwd();
  try {
    await fs.access(projectPath);
    return await fs.readdir(projectPath);
  } catch (error) {
    relinka(
      "warn",
      `Directory does not exist: ${projectPath}`,
      handleError(error),
    );
    return [];
  }
}

/**
 * Creates a directory (recursively by default). Logs an error if creation fails.
 */
export async function mkdir(dir: string): Promise<void> {
  try {
    await fs.mkdirp(dir);
    relinka("info-verbose", `Directory created: ${dir}`);
  } catch (error) {
    relinka("error", `Failed to create directory: ${dir}`, handleError(error));
  }
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
 * Writes content to a file. If the file does not exist, it is created.
 * Logs an error if write fails.
 */
export async function echo(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, "utf8");
    relinka("info-verbose", `Wrote to file: ${filePath}`);
  } catch (error) {
    relinka("error", `Failed to write file: ${filePath}`, handleError(error));
  }
}

/**
 * Reads and returns the content of a file.
 * Logs an error if reading fails.
 */
export async function cat(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    relinka("error", `Failed to read file: ${filePath}`, handleError(error));
    throw error;
  }
}

/**
 * Shows the first n lines of a file.
 */
export async function head(filePath: string, n = 10): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content.split("\n").slice(0, n).join("\n");
  } catch (error) {
    relinka("error", `Failed to read file: ${filePath}`, handleError(error));
    throw error;
  }
}

/**
 * Shows the last n lines of a file.
 */
export async function tail(filePath: string, n = 10): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n");
    return lines.slice(-n).join("\n");
  } catch (error) {
    relinka("error", `Failed to read file: ${filePath}`, handleError(error));
    throw error;
  }
}

/**
 * Copies a file or directory from one location to another.
 * Logs an error if copying fails.
 */
export async function cp(src: string, dest: string): Promise<void> {
  try {
    await fs.copy(src, dest);
    relinka("info", `Copied from ${src} to ${dest}`);
  } catch (error) {
    relinka(
      "error",
      `Failed to copy from ${src} to ${dest}`,
      handleError(error),
    );
  }
}

/**
 * Moves a file or directory from one location to another.
 * Logs an error if moving fails.
 */
export async function mv(src: string, dest: string): Promise<void> {
  try {
    await fs.move(src, dest, { overwrite: true });
    relinka("info", `Moved from ${src} to ${dest}`);
  } catch (error) {
    relinka(
      "error",
      `Failed to move from ${src} to ${dest}`,
      handleError(error),
    );
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
