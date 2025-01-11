import { defineCommand } from "@reliverse/prompts";

import { authCheck } from "~/args/login/impl.js";
import { handleReliverseConfig } from "~/utils/reliverseConfig.js";
import { handleReliverseMemory } from "~/utils/reliverseMemory.js";
import { getCurrentWorkingDirectory } from "~/utils/terminalHelpers.js";

import { app } from "./app-impl.js";
import { useLocalhost } from "./constants.js";

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
    const isDev = args.dev;
    const cwd = getCurrentWorkingDirectory();

    const memory = await handleReliverseMemory();
    const config = await handleReliverseConfig(cwd);

    await authCheck(isDev, memory, useLocalhost);
    await app({ cwd, isDev, config, memory });

    process.exit(0);
  },
});
