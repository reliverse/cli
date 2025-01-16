import { relinka } from "@reliverse/relinka";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function setHiddenAttributeOnWindows(
  folderPath: string,
): Promise<void> {
  if (process.platform === "win32") {
    try {
      await execAsync(`attrib +h "${folderPath}"`);
    } catch (error) {
      relinka("warn", "Failed to set hidden attribute:", String(error));
    }
  }
}
