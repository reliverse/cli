import relinka from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE, verbose } from "~/app/data/constants.js";

export async function deleteConfig() {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, MEMORY_FILE);
  verbose && relinka.info("Deleting config file:", filePath);
  await fs.remove(filePath);
}
