#!/usr/bin/env node

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { showAnykeyPrompt } from "./app/menu/showAnykeyPrompt.js";
import { app } from "./app/mod.js";
import { auth } from "./args/login/impl.js";
import { readReliverseMemory } from "./args/memory/impl.js";
import { readConfig } from "./utils/config.js";
import { relinka } from "./utils/console.js";
import { MEMORY_FILE } from "./utils/data/constants.js";
import { getCurrentWorkingDirectory } from "./utils/fs.js";

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: "1.3.22",
    description: "@reliverse/cli",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
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
  subCommands: {
    help: () => import("~/args/help/mod.js").then((r) => r.default),
    login: () => import("~/args/login/mod.js").then((r) => r.default),
    logout: () => import("~/args/logout/mod.js").then((r) => r.default),
    config: () => import("~/args/config/mod.js").then((r) => r.default),
    memory: () => import("~/args/memory/mod.js").then((r) => r.default),
    studio: () => import("~/args/studio/mod.js").then((r) => r.default),
  },
});

await runMain(main).catch((error: Error) =>
  errorHandler(
    error,
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
