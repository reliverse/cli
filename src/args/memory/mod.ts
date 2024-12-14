import { defineCommand } from "@reliverse/prompts";

import { relinka } from "~/utils/console.js";

import { readReliverseMemory } from "./impl.js";

export default defineCommand({
  meta: {
    name: "memory",
    description: "Displays the data stored in Reliverse's memory",
  },
  run: async () => {
    const memory = await readReliverseMemory();
    relinka("info", "Current memory values:");
    console.log({
      code: memory.code ? "exists" : "missing",
      key: memory.key ? "exists" : "missing",
      githubKey: memory.githubKey ? "exists" : "missing",
      vercelKey: memory.vercelKey ? "exists" : "missing",
      user: memory.user
        ? {
            name: memory.user.name || "missing",
            githubName: memory.user.githubName || "missing",
            vercelName: memory.user.vercelName || "missing",
            shouldDeploy: memory.user.shouldDeploy ?? "missing",
          }
        : "missing",
    });
    process.exit(0);
  },
});
