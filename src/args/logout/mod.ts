import { defineCommand } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";

import { isConfigExists } from "~/utils/config.js";

import { deleteConfig } from "./impl.js";

export default defineCommand({
  meta: {
    name: "logout",
    description: "Forgets your credentials",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Runs the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    const config = await isConfigExists();
    if (!config) {
      relinka.success("You're not logged in.");
      args.dev
        ? relinka.info("Try `bun dev:login` cmd.")
        : relinka.info("Try `reliverse login` cmd.");
      process.exit(0);
    }
    await deleteConfig();
    relinka.success("`You're logged out now!` 👋");
    process.exit(0);
  },
});
