import { defineCommand, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { execaCommand } from "execa";

import { cliName } from "~/libs/sdk/constants.js";
import {
  getAllPkgManagers,
  type PackageManager,
} from "~/utils/dependencies/getUserPkgManager.js";
import { getCurrentWorkingDirectory } from "~/utils/terminalHelpers.js";

async function getPmOptions() {
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
  // Get default value from detected PMs or fallback to npm
  const defaultValue = [...detectedPMMap.keys()][0] ?? "npm";
  // Return options and default value
  return { pmOptions, defaultValue };
}

export default defineCommand({
  meta: {
    name: "update",
    description: "Updates the CLI to the latest version",
    hidden: false,
  },
  run: async () => {
    try {
      const { pmOptions, defaultValue } = await getPmOptions();
      const pm = await selectPrompt({
        title: `Select a package manager to update the ${cliName}`,
        options: pmOptions,
        defaultValue,
      });
      await execaCommand(`${pm} -g update --latest`, { stdio: "inherit" });
      relinka(
        "success",
        "Updated successfully!",
        "You can now use the latest `reliverse cli` version.",
      );
    } catch (error) {
      relinka(
        "error",
        "Failed to update @reliverse/cli",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
    process.exit(0);
  },
});
