import { consola } from "consola";

import { validate } from "~/prompts/utils/validate";

export async function askInstallDependencies(
  mode: "buildOwnRelivator" | "installAnyGitRepo" | "justInstallRelivator",
): Promise<boolean> {
  if (mode === "installAnyGitRepo") {
    consola.info(
      "In `installAnyGitRepo` mode, dependencies may not be installed automatically. Run `bun i` manually if needed.",
    );
  }

  const deps = await consola.prompt(
    "Do you want to install the project dependencies? [🚨 Select No if issues occur]",
    { initial: false, type: "confirm" },
  );

  validate(deps, "boolean", "Installation canceled by the user.");

  return deps;
}
