import consola from "consola";
import { buildOwnRelivator } from "~/prompts/02-buildOwnRelivator";
import { justInstallRelivator } from "~/prompts/01-justInstallRelivator";
import { installAnyGitRepo } from "~/prompts/03-installAnyGitRepo";
import { askCodemodUserCodebase } from "~/prompts/14-askCodemodUserCodebase";
import { showUpdateCloneMenu } from "~/prompts/17-showUpdateCloneMenu";

export async function showReliverseMenu() {
  const option = await consola.prompt(
    "Welcome to Reliverse! How would you like to proceed? Currently, Reliverse can create new projects and make codebase modifications, with more features coming soon.",
    {
      options: [
        "1. Install the pre-configured Relivator",
        "2. Build your own Relivator from scratch",
        "3. Install any web-related repository from GitHub",
        "4. Run code modifications on the existing codebase",
        "5. Update your GitHub clone with the latest changes",
      ] as const,
      type: "select",
    },
  );

  if (option === "1. Install the pre-configured Relivator") {
    await justInstallRelivator();
  } else if (option === "2. Build your own Relivator from scratch") {
    await buildOwnRelivator();
  } else if (option === "3. Install any web-related repository from GitHub") {
    await installAnyGitRepo();
  } else if (option === "4. Run code modifications on the existing codebase") {
    await askCodemodUserCodebase();
  } else if (option === "5. Update your GitHub clone with the latest changes") {
    await showUpdateCloneMenu();
  } else {
    consola.error("Invalid option selected. Exiting.");
  }
}
