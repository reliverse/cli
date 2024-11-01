import { consola } from "consola";
import { choosePackageManager } from "~/utils/choosePackageManager";

import { validate } from "~/utils/validate";

export async function askInstallDependencies(
  mode: "buildOwnRelivator" | "installAnyGitRepo" | "justInstallRelivator",
): Promise<boolean> {
  if (mode === "installAnyGitRepo") {
    const cwd = process.cwd();
    const pkgManager = await choosePackageManager(cwd);

    consola.info(
      `In installAnyGitRepo mode, dependencies may not be installed automatically. If something, after project is created, you can run the following command to manually install deps: ${pkgManager} i`,
    );
  }

  const deps = await consola.prompt(
    "Do you want to install the project dependencies? [🚨 Select No if issues occur]",
    { initial: false, type: "confirm" },
  );

  validate(deps, "boolean", "Installation canceled by the user.");

  return deps;
}
