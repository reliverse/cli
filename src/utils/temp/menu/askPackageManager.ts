import { selectPrompt } from "@reliverse/prompts";

import { relinka } from "~/utils/console.js";

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
          relinka("warn", `Failed to get version for ${pm}:`, err.toString());
          return {
            title: `${pm} (version unknown)`,
            value: pm,
            id: pm,
          };
        }
      }),
    );

    const npmClient = await selectPrompt({
      title: "Select package manager to use:",
      options: choices
        .filter((choice) => choice !== null)
        .map((choice) => ({
          label: choice.title,
          value: choice.value,
          disabled: choice.disabled,
        })),
      defaultValue:
        choices.findIndex((c) => !c.disabled) !== -1
          ? choices.find((c) => !c.disabled)?.value || choices[0].value
          : choices[0].value,
    });

    if (typeof npmClient !== "string") {
      throw new Error("Package manager selection was cancelled");
    }

    return npmClient;
  } catch (error) {
    relinka("error", "Failed to prompt for package manager:", error.toString());
    // Default to npm as fallback
    return "npm";
  }
}
