import { defineCommand } from "@reliverse/prompts";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

export default defineCommand({
  meta: {
    name: "help",
    description: "Displays the help message",
    hidden: true,
  },
  args: {
    dev: {
      type: "boolean",
      description: "Displays the help message for the dev command",
    },
  },
  run: ({ args }) => {
    if (args.dev) {
      relinka("info", "Use `bun dev --help` instead.");
    } else {
      relinka("info", "Use `reliverse --help` instead.");
    }
    process.exit(0);
  },
});
