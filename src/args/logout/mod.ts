import {
  confirmPrompt,
  defineCommand,
  deleteLastLine,
  msg,
} from "@reliverse/prompts";

import { isConfigExists } from "~/utils/config.js";
import { relinka } from "~/utils/console.js";

import { deleteConfig } from "./impl.js";

export default defineCommand({
  meta: {
    name: "logout",
    description: "Ask Reliverse to forget your data",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    const config = await isConfigExists();
    if (!config) {
      relinka("success", "You're not logged in.");
      if (args.dev) {
        relinka("info", "Try `bun dev:login` cmd.");
      } else {
        relinka("info", "Try `reliverse login` cmd.");
      }
      process.exit(0);
    }
    const danger = await confirmPrompt({
      title:
        "Are you sure you want to log out? Reliverse will delete its local memory. This action cannot be undone.",
      titleColor: "redBright",
    });
    if (danger) {
      await deleteConfig();
      deleteLastLine();
      msg({
        type: "M_MIDDLE",
      });
      relinka("success", "`You're logged out now!` 👋");
    }
    process.exit(0);
  },
});
