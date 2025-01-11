import { defineCommand } from "@reliverse/prompts";

import { useLocalhost } from "~/app/constants.js";
import { showAnykeyPrompt } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showAnykeyPrompt.js";
import { relinka } from "~/utils/loggerRelinka.js";
import { handleReliverseMemory } from "~/utils/reliverseMemory.js";

import { auth } from "./impl.js";

export default defineCommand({
  meta: {
    name: "login",
    description: "Authenticate your device",
    hidden: true,
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    const isDev = args.dev;

    // Check for existing keys in SQLite
    const memory = await handleReliverseMemory();
    const isAuthenticated = memory.code && memory.key;

    if (isAuthenticated) {
      relinka("success", "You're already logged in.");
      if (isDev) {
        relinka("info", "Try `bun dev:logout` cmd.");
      } else {
        relinka("info", "Try `reliverse logout` cmd.");
      }
      process.exit(0);
    }

    await showAnykeyPrompt();
    await auth({ isDev, useLocalhost });

    if (isDev) {
      relinka("success", "You can run `bun dev` now! Happy Reliversing! 🎉");
    } else {
      relinka(
        "success",
        "You can run `reliverse cli` now! Happy Reliversing! 🎉",
      );
    }
    process.exit(0);
  },
});
