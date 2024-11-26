import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { choosePackageManager } from "~/utils/choosePackageManager.js";
import { validate } from "~/utils/validate.js";

export async function askInstallDependencies(
  mode: "buildOwnRelivator" | "installAnyGitRepo" | "justInstallRelivator",
): Promise<boolean> {
  if (mode === "installAnyGitRepo") {
    const cwd = process.cwd();
    const pkgManager = await choosePackageManager(cwd);

    relinka.info(
      `In installAnyGitRepo mode, dependencies may not be installed automatically. If something, after project is created, you can run the following command to manually install deps: ${pkgManager} i`,
    );
  }

  const deps = await confirmPrompt({
    title:
      "Do you want to install the project dependencies? [🚨 Select No if issues occur]",
    defaultValue: false,
  });

  validate(deps, "boolean", "Installation canceled by the user.");

  return deps;
}
