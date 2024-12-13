import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "~/utils/console.js";

import { MEMORY_FILE } from "../app/data/constants.js";

export const isConfigExists = async () => {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, MEMORY_FILE);
    return await fs.pathExists(filePath);
  } catch (error) {
    relinka("error", "Error checking if config file exists:", error.toString());
    return false;
  }
};
