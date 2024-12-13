import { defineCommand } from "@reliverse/prompts";

import { isConfigExists } from "~/utils/config.js";
import { relinka } from "~/utils/console.js";

import { readReliverseMemory } from "./impl.js";

export default defineCommand({
  meta: {
    name: "memory",
    description: "See what Reliverse knows about you",
  },
  run: async () => {
    const config = await isConfigExists();
    if (!config) {
      relinka("warn", "Reliverse could not recognize you. Please login first.");
      process.exit(0);
    }

    relinka("info", "What Reliverse knows about you:");
    const { user } = await readReliverseMemory();
    relinka("info", JSON.stringify(user, null, 2));

    process.exit(0);
  },
});
