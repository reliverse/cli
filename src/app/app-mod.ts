import { defineCommand } from "@reliverse/prompts";

import { getCurrentWorkingDirectory } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { showStartPrompt } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { authCheck } from "~/args/login/impl.js";
import { getReliverseMemory } from "~/utils/reliverseMemory.js";

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

    await showStartPrompt(isDev);
    const cwd = getCurrentWorkingDirectory();
    const memory = await getReliverseMemory();

    // TODO: fix reliverse config and enable it back
    // const config = await getReliverseConfig(cwd);

    await authCheck(isDev, memory, useLocalhost);
    await app({ cwd, isDev, config: {}, memory });

    process.exit(0);
  },
});
