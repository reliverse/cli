import { defineCommand } from "@reliverse/prompts";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

export default defineCommand({
  meta: {
    name: "studio",
    description: "Provides information on how to open Reliverse Studio",
    hidden: true,
  },
  run: () => {
    relinka(
      "info",
      "Reliverse Studio",
      "Allows you to read and edit Reliverse's memory",
    );
    relinka("info", "To open the editor, run:", "bunx drizzle-kit studio");
    relinka(
      "info",
      "You can also specify a custom port:",
      "bunx drizzle-kit studio --port 4984",
    );
    relinka(
      "info",
      "Don't touch the following fields: code, key, githubKey, vercelKey",
      "They are encrypted and used by Reliverse to verify your identity",
    );
    process.exit(0);
  },
});
