import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE } from "~/app/db/constants.js";
import { readConfig } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/miscellaneousConfigHelpers.js";
import { validateAndInsertMissingKeys } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/validateAndInsertMissingKeys.js";
import { getCurrentWorkingDirectory } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { showStartPrompt } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { checkIfUserIsAuthenticated } from "~/args/login/impl.js";

import { app } from "./app-impl.js";

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
    await checkIfUserIsAuthenticated({ dev: args.dev });
    await validateAndInsertMissingKeys(cwd);
    await app({ isDev: args.dev, config });
    process.exit(0);
  },
});
