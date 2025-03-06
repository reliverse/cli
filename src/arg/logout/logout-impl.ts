import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";

import { memoryPath } from "~/app/constants.js";

export async function deleteMemory() {
  relinka("info-verbose", `Deleting config file: ${memoryPath}`);

  try {
    if (await fs.pathExists(memoryPath)) {
      await fs.remove(memoryPath);
      relinka("success-verbose", "Config file deleted successfully");
    } else {
      relinka("info-verbose", "Config file not found");
    }
  } catch (error) {
    relinka(
      "error",
      "Failed to delete config file",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
