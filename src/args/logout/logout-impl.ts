import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

export async function deleteMemory() {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, ".reliverse/reliverse.db");

  relinka("info-verbose", `Deleting config file: ${filePath}`);
  try {
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
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
