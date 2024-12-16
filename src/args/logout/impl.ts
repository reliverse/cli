import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "~/utils/console.js";
import { MEMORY_FILE } from "~/utils/data/constants.js";

export async function deleteConfig() {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, MEMORY_FILE);
  relinka("info-verbose", `Deleting config file: ${filePath}`);
  await fs.remove(filePath);
}
