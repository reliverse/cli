import { defineCommand } from "@reliverse/prompts";

import { relinka } from "~/utils/console.js";

import { readReliverseMemory } from "./impl.js";

export default defineCommand({
  meta: {
    name: "memory",
    description: "Displays the data stored in Reliverse's memory",
    hidden: true,
  },
  run: async () => {
    const memory = await readReliverseMemory();
    relinka("info", "Current memory values:");
    console.log({
      code: memory.code === "missing" ? "missing" : "exists",
      key: memory.key === "missing" ? "missing" : "exists",
      githubKey: memory.githubKey === "missing" ? "missing" : "exists",
      vercelKey: memory.vercelKey === "missing" ? "missing" : "exists",
      name: memory.name || "missing",
      email: memory.email || "missing",
      githubUsername: memory.githubUsername || "missing",
      vercelUsername: memory.vercelUsername || "missing",
    });
    process.exit(0);
  },
});
