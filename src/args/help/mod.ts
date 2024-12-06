import { defineCommand } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";

export default defineCommand({
  meta: {
    name: "help",
    description: "Shows the help message",
    hidden: true,
  },
  args: {
    dev: {
      type: "boolean",
      description: "Runs the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    args.dev
      ? relinka.info("Use `bun dev --help` instead.")
      : relinka.info("Use `reliverse --help` instead.");
    process.exit(0);
  },
});
