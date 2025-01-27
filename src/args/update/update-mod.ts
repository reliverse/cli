import { defineCommand, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import { cliName } from "~/app/constants.js";
import {
  getAllPkgManagers,
  type PackageManager,
} from "~/utils/dependencies/getUserPkgManager.js";
import { execaSpinner } from "~/utils/execaSpinner.js";
import { getCurrentWorkingDirectory } from "~/utils/terminalHelpers.js";

export default defineCommand({
  meta: {
    name: "update",
    description: "Updates the CLI to the latest version",
    hidden: true,
  },
  run: async () => {
    const projectPath = getCurrentWorkingDirectory();
    const detectedPMs = await getAllPkgManagers(projectPath);

    // Get unique detected package managers with their sources
    const detectedPMMap = new Map(
      detectedPMs.map((pm) => [pm.packageManager, pm.source]),
    );

    // Create options list
    const pmOptions = ["bun", "pnpm", "npm", "yarn"].map((pm) => {
      const option: { label: string; value: PackageManager; hint?: string } = {
        label: pm,
        value: pm as PackageManager,
      };
      const source = detectedPMMap.get(pm as PackageManager);
      if (source && source !== "default") {
        option.hint = "detected";
      }
      return option;
    });

    const pm = await selectPrompt({
      title: `Select a package manager to update the ${cliName}`,
      options: pmOptions,
      defaultValue: [...detectedPMMap.keys()][0] ?? "npm",
    });

    try {
      await execaSpinner(projectPath, pm, {
        args: ["-g", "update", "--latest"],
        stdout: "inherit",
      });
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
