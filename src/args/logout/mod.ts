import { confirmPrompt, defineCommand } from "@reliverse/prompts";
import { deleteLastLine, msg, relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { deleteMemory } from "./impl.js";

const isConfigExists = async () => {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, ".reliverse/reliverse.db");
  if (await fs.pathExists(filePath)) {
    return true;
  }
  return false;
};

export default defineCommand({
  meta: {
    name: "logout",
    description: "Ask Reliverse to forget your data",
    hidden: true,
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
  },
  run: async ({ args }) => {
    if (!(await isConfigExists())) {
      relinka("success", "You're not logged in.");
      if (args.dev) {
        relinka("info", "Try `bun dev:login` cmd.");
      }
      process.exit(0);
    }
    const danger = await confirmPrompt({
      title:
        "Are you sure you want to log out? Reliverse will delete its local memory. This action cannot be undone.",
      titleColor: "redBright",
    });
    if (danger) {
      await deleteMemory();
      deleteLastLine();
      msg({
        type: "M_BAR",
        borderColor: "dim",
      });
      relinka("success", "You're logged out now! 👋");
      process.exit(0);
    }
  },
});
