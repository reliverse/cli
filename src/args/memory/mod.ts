import { defineCommand } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";

import { isConfigExists } from "~/utils/config.js";

import { readReliverseMemory } from "./impl.js";

export default defineCommand({
  meta: {
    name: "memory",
    description: "See what Reliverse knows about you",
  },
  run: async () => {
    const config = await isConfigExists();
    if (!config) {
      relinka.warn("Reliverse could not recognize you. Please login first.");
      process.exit(0);
    }

    relinka.info("What Reliverse knows about you:");
    const { user } = await readReliverseMemory();
    console.log({ user });

    process.exit(0);
  },
});
