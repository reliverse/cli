import { defineCommand } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";

import { showAnykeyPrompt } from "~/app/data/prompts.js";
import { isConfigExists } from "~/utils/config.js";

import { auth } from "./impl.js";

export default defineCommand({
  meta: {
    name: "login",
    description: "Authenticate your device",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    const config = await isConfigExists();
    if (config) {
      relinka.success("You're already logged in.");
      args.dev
        ? relinka.info("Try `bun dev:logout` cmd.")
        : relinka.info("Try `reliverse logout` cmd.");
      process.exit(0);
    }
    await showAnykeyPrompt("welcome");
    await showAnykeyPrompt("privacy");
    await auth({ dev: args.dev });
    args.dev
      ? relinka.success("You can run `bun dev` now! Happy Reliversing! 🎉")
      : relinka.success("You can run `reliverse` now! Happy Reliversing! 🎉");
    process.exit(0);
  },
});
