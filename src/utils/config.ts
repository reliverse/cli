import relinka from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { CONFIG } from "../app/data/constants.js";

export const isConfigExists = async () => {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, CONFIG);
    return await fs.pathExists(filePath);
  } catch (error) {
    relinka.error("Error checking if config file exists:", error);
    return false;
  }
};
