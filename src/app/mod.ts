import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE } from "~/app/menu/data/constants.js";
import { auth } from "~/args/login/impl.js";
import { readReliverseMemory } from "~/args/memory/impl.js";
import { readConfig } from "~/utils/configs/miscellaneousConfigHelpers.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import { app } from "./menu/appMainMenuImpl.js";
import { showAnykeyPrompt } from "./menu/showAnykeyPrompt.js";
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
    await showStartPrompt();

    const homeDir = os.homedir();
    const memoryFile = path.join(homeDir, MEMORY_FILE);

    // Ensure .reliverse directory exists
    await fs.ensureDir(path.dirname(memoryFile));

    const cwd = getCurrentWorkingDirectory();
    const config = await readConfig(cwd);

    // Check for existing authentication in SQLite
    const memory = await readReliverseMemory();
    const isAuthenticated =
      memory.code &&
      memory.code !== "missing" &&
      memory.key &&
      memory.key !== "missing";

    if (!isAuthenticated) {
      await showAnykeyPrompt();
      await auth({ dev: args.dev, useLocalhost: false });

      // Re-check authentication after auth flow
      const updatedMemory = await readReliverseMemory();
      const authSuccess =
        updatedMemory.code &&
        updatedMemory.code !== "missing" &&
        updatedMemory.key &&
        updatedMemory.key !== "missing";

      if (!authSuccess) {
        relinka("error", "Authentication failed. Please try again.");
        process.exit(1);
      }
    }

    await app({ isDev: args.dev, config });
    process.exit(0);
  },
});
