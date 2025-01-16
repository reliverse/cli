import { defineCommand } from "@reliverse/prompts";

import { authCheck } from "~/args/login/login-impl.js";
import { handleReliverseConfig } from "~/utils/reliverseConfig.js";
import { handleReliverseMemory } from "~/utils/reliverseMemory.js";
import { getCurrentWorkingDirectory } from "~/utils/terminalHelpers.js";

import { app } from "./app-impl.js";
import { useLocalhost } from "./constants.js";
import { showStartPrompt } from "./menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";

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
    await showStartPrompt(isDev);
    const cwd = getCurrentWorkingDirectory();

    const memory = await handleReliverseMemory();
    const { config, reli } = await handleReliverseConfig(cwd);

    await authCheck(isDev, memory, useLocalhost);
    await app({ cwd, isDev, config, memory, reli });

    process.exit(0);
  },
});
