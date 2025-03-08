import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function setHiddenAttributeOnWindows(
  folderPath: string,
): Promise<void> {
  if (process.platform === "win32") {
    try {
      if (await fs.pathExists(folderPath)) {
        const isAlreadyHidden = await isHidden(folderPath);
        if (!isAlreadyHidden) {
          await execAsync(`attrib +h "${folderPath}"`);
        }
      }
    } catch (error) {
      relinka("warn", "Failed to set hidden attribute:", String(error));
    }
  }
}

export async function isHidden(filePath: string): Promise<boolean> {
  if (process.platform === "win32") {
    const attributes = await execAsync(`attrib "${filePath}"`);
    return attributes.stdout.includes("H");
  }
  return false;
}

/**
 * Checks if a directory is empty
 * @param directory Path to the directory
 * @returns Boolean indicating if the directory is empty
 */
export async function isDirectoryEmpty(directory: string): Promise<boolean> {
  try {
    const files = await fs.readdir(directory);
    return files.length === 0;
  } catch (_error) {
    // If there's an error reading the directory, assume it's not empty
    return false;
  }
}
