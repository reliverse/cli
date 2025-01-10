import fs from "fs-extra";
import path from "pathe";

import { relinka } from "../handlers/logger.js";
import { getDefaultReliverseConfig } from "./reliverseReadWrite.js";

export async function validateAndInsertMissingKeys(cwd: string): Promise<void> {
  try {
    const configPath = path.join(cwd, ".reliverse");

    // Check if .reliverse exists
    if (!(await fs.pathExists(configPath))) {
      return;
    }

    // Read current config
    const content = await fs.readFile(configPath, "utf-8");

    // Only proceed if file is empty or contains only {}
    if (!content.trim() || content.trim() === "{}") {
      const defaultRules = await getDefaultReliverseConfig(
        path.basename(cwd),
        "user",
        "nextjs", // fallback default
      );

      await fs.writeFile(configPath, JSON.stringify(defaultRules, null, 2));
      relinka(
        "info",
        "Created initial .reliverse configuration. Please review and adjust as needed.",
      );
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error validating .reliverse:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
