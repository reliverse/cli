import { defineCommand } from "@reliverse/prompts";

import { relinka } from "~/utils/console.js";

export default defineCommand({
  meta: {
    name: "help",
    description: "Shows the help message",
    hidden: true,
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    if (args.dev) {
      relinka("info", "Use `bun dev --help` instead.");
    } else {
      relinka("info", "Use `reliverse --help` instead.");
    }
    process.exit(0);
  },
});
