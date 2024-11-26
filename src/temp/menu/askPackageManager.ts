import { prompt } from "@reliverse/prompts";

import {
  PACKAGE_MANAGERS,
  getBunVersion,
  getPackageManagerVersion,
} from "./utils/packageManager.js";

export async function promptForPackageManager(): Promise<string> {
  try {
    const choices = await Promise.all(
      Object.keys(PACKAGE_MANAGERS).map(async (pm) => {
        try {
          const version =
            pm === "bun"
              ? await getBunVersion()
              : await getPackageManagerVersion(pm);

          const versionDisplay =
            version === "not installed"
              ? "(not installed)"
              : version
                ? `v${version.replace(/^v/, "")}`
                : "";

          return {
            title: `${pm} ${versionDisplay}`,
            value: pm,
            disabled: version === "not installed",
            id: pm,
          };
        } catch (err) {
          console.warn(`Failed to get version for ${pm}:`, err);
          return {
            title: `${pm} (version unknown)`,
            value: pm,
            id: pm,
          };
        }
      }),
    );

    const { npmClient } = await prompt({
      id: "npmClient",
      type: "select",
      title: "Select package manager to use:",
      choices: choices.filter((choice) => choice !== null),
      defaultValue:
        choices.findIndex((c) => !c.disabled) !== -1
          ? choices.findIndex((c) => !c.disabled)
          : 0,
    });

    if (typeof npmClient !== "string") {
      throw new Error("Package manager selection was cancelled");
    }

    return npmClient;
  } catch (error) {
    console.error("Failed to prompt for package manager:", error);
    // Default to npm as fallback
    return "npm";
  }
}
