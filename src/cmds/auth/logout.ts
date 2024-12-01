import relinka from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { CONFIG, verbose } from "~/data.js";

export async function deleteConfig() {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, CONFIG);
  verbose && relinka.info("Deleting config file:", filePath);
  await fs.remove(filePath);
}
