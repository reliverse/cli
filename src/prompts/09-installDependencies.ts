import { consola } from "consola";

import { validate } from "~/prompts/utils/validate";

// Prompt user for confirmation about installing dependencies
export async function dependencies(
  mode: "buildRelivator" | "installLibrariesMenu" | "justInstallRelivator",
): Promise<boolean> {
  if (mode === "installLibrariesMenu") {
    consola.info(
      // eslint-disable-next-line @stylistic/max-len
      "In `installLibrariesMenu` mode, dependencies may not be installed automatically. Run `bun i` manually if needed.",
    );
  }

  const deps = await consola.prompt(
    "Do you want to install the project dependencies? [🚨 Select No if issues occur]",
    { initial: false, type: "confirm" },
  );

  validate(deps, "boolean", "Installation canceled by the user.");

  return deps;
}
