import { defineCommand } from "@reliverse/prompts";

import { envArgImpl } from "./env-impl.js";

export default defineCommand({
  meta: {
    name: "env",
    description: "Generate .env file",
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
    await envArgImpl(isDev);
  },
});
