import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE } from "~/app/db/constants.js";
import { readConfig } from "~/utils/configs/miscellaneousConfigHelpers.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import { app, checkIfUserIsAuthenticated } from "./impl.js";
import { showStartPrompt } from "./menu/showStartEndPrompt.js";

export default defineCommand({
  meta: {
    name: "cli",
    description: "Runs the @reliverse/cli",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Runs the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    await showStartPrompt({ dev: args.dev });
    const homeDir = os.homedir();
    const memoryFile = path.join(homeDir, MEMORY_FILE);
    await fs.ensureDir(path.dirname(memoryFile));
    const cwd = getCurrentWorkingDirectory();
    const config = await readConfig(cwd);
    // await checkIfUserIsAuthenticated({ dev: args.dev });
    await app({ isDev: args.dev, config });
    process.exit(0);
  },
});
