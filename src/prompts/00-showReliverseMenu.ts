import consola from "consola";
import { buildOwnRelivator } from "~/prompts/02-buildOwnRelivator";
import { justInstallRelivator } from "~/prompts/01-justInstallRelivator";
import { installAnyGitRepo } from "~/prompts/03-installAnyGitRepo";

export async function showReliverseMenu() {
  const option = await consola.prompt(
    "Welcome to Reliverse! How do you want to proceed? Reliverse will allow you to do many things in the future. It's already able to create new projects and make some codebase modifications.",
    {
      options: [
        "1. Install pre-configured Relivator",
        "2. Build your own Relivator from scratch",
        "3. Install any other repository from GitHub",
      ] as const,
      type: "select",
    },
  );

  if (option === "1. Install pre-configured Relivator") {
    await justInstallRelivator();
  } else if (option === "2. Build your own Relivator from scratch") {
    await buildOwnRelivator();
  } else if (option === "3. Install any other repository from GitHub") {
    await installAnyGitRepo();
  } else {
    consola.error("Invalid option selected. Exiting.");
  }
}
