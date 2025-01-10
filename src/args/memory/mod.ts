import { defineCommand } from "@reliverse/prompts";

import { relinka } from "~/utils/loggerRelinka.js";
import { getReliverseMemory } from "~/utils/reliverseMemory.js";

export default defineCommand({
  meta: {
    name: "memory",
    description: "Displays the data stored in Reliverse's memory",
    hidden: true,
  },
  run: async () => {
    const memory = await getReliverseMemory();
    relinka("info", "Current memory values:");
    console.log({
      code: memory.code === "" ? "" : "exists",
      key: memory.key === "" ? "" : "exists",
      githubKey: memory.githubKey === "" ? "" : "exists",
      vercelKey: memory.vercelKey === "" ? "" : "exists",
      name: memory.name ?? "",
      email: memory.email ?? "",
      githubUsername: memory.githubUsername ?? "",
      vercelUsername: memory.vercelUsername ?? "",
    });
    process.exit(0);
  },
});
