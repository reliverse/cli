import fs from "fs-extra";
import { cwd } from "node:process";
import { normalize } from "pathe";

import { relinka } from "./logger.js";

export const handleError = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

/**
 * Changes the current working directory to the specified path.
 * Logs a warning if the target directory does not exist.
 *
 * @param dir - The directory to change to.
 */
export async function cd(dir: string): Promise<void> {
  try {
    await fs.access(dir);
    process.chdir(dir);
    relinka("info", `Changed directory to: ${process.cwd()}`);
  } catch (error) {
    relinka("warn", `Directory does not exist: ${dir}`, handleError(error));
  }
}

/**
 * Returns the current working directory.
 */
export function pwd() {
  const cwd = getCurrentWorkingDirectory();
  relinka("info", `Current working directory: ${cwd}`);
}

/**
 * Lists the contents of a directory. If no directory is specified,
 * the current working directory is used. Logs a warning if the directory
 * does not exist.
 *
 * @param dir - The directory to list (optional, defaults to process.cwd()).
 * @returns A Promise that resolves with an array of file and directory names.
 */
export async function ls(dir?: string): Promise<string[]> {
  const targetDir = dir ?? process.cwd();
  try {
    await fs.access(targetDir);
    return await fs.readdir(targetDir);
  } catch (error) {
    relinka(
      "warn",
      `Directory does not exist: ${targetDir}`,
      handleError(error),
    );
    return [];
  }
}

/**
 * Creates a directory (recursively by default). Logs an error if creation fails.
 *
 * @param dir - The path to the directory to create.
 */
export async function mkdir(dir: string): Promise<void> {
  try {
    await fs.mkdirp(dir);
    relinka("info", `Directory created: ${dir}`);
  } catch (error) {
    relinka("error", `Failed to create directory: ${dir}`, handleError(error));
  }
}

/**
 * Removes a file or directory (recursively, if it's a directory).
 * Logs an error if removal fails.
 *
 * @param target - The path to remove.
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
 *
 * @param filePath - The path to the file.
 * @param content - The content to write.
 */
export async function echo(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, "utf8");
    relinka("info", `Wrote to file: ${filePath}`);
  } catch (error) {
    relinka("error", `Failed to write file: ${filePath}`, handleError(error));
  }
}

/**
 * Reads and returns the content of a file.
 * Logs an error if reading fails.
 *
 * @param filePath - The path to the file.
 * @returns The file contents as a string.
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
 *
 * @param filePath - The path to the file.
 * @param n - Number of lines to show (defaults to 10).
 * @returns The first n lines of the file as a string.
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
 *
 * @param filePath - The path to the file.
 * @param n - Number of lines to show (defaults to 10).
 * @returns The last n lines of the file as a string.
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
 *
 * @param src - The source path.
 * @param dest - The destination path.
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
 *
 * @param src - The source path.
 * @param dest - The destination path.
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
 *
 * @param useCache - Whether to use a cached value.
 * @returns The current working directory.
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
