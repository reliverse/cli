import { defineCommand } from "@reliverse/prompts";

import { getReliverseConfig } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/miscellaneousConfigHelpers.js";
import { getCurrentWorkingDirectory } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { showStartPrompt } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { ensureUserAuthenticated } from "~/args/login/impl.js";

import { app } from "./app-impl.js";
import { getReliverseMemory } from "./app-utils.js";

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
    const memory = await getReliverseMemory();
    const config = await getReliverseConfig(cwd);
    await ensureUserAuthenticated(isDev, memory);
    await app({ cwd, isDev, config, memory });
    process.exit(0);
  },
});
