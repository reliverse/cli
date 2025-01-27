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
