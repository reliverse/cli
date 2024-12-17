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
      code: memory.code === "" ? "" : "exists",
      key: memory.key === "" ? "" : "exists",
      githubKey: memory.githubKey === "" ? "" : "exists",
      vercelKey: memory.vercelKey === "" ? "" : "exists",
      name: memory.name || "",
      email: memory.email || "",
      githubUsername: memory.githubUsername || "",
      vercelUsername: memory.vercelUsername || "",
    });
    process.exit(0);
  },
});
