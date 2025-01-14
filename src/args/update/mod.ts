import { defineCommand, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execa } from "execa";

export default defineCommand({
  meta: {
    name: "update",
    description: "Updates the CLI to the latest version",
    hidden: true,
  },
  run: async () => {
    const pm = await selectPrompt({
      title: "Select a package manager to update the CLI",
      options: [
        { label: "bun", value: "bun" },
        { label: "pnpm", value: "pnpm" },
        { label: "npm", value: "npm" },
      ],
      defaultValue: "bun",
    });

    try {
      await execa(pm, ["-g", "update", "--latest"]);
      relinka(
        "success",
        "Updated successfully! You can now use the latest `reliverse cli` version.",
      );
    } catch (error) {
      relinka(
        "error",
        "Failed to update Reliverse CLI...",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    process.exit(0);
  },
});
