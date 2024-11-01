import consola from "consola";
// import { buildOwnRelivator } from "./02-buildOwnRelivator";
import { justInstallRelivator } from "./01-justInstallRelivator";
// import { installAnyGitRepo } from "./03-installAnyGitRepo";

export async function showReliverseMenu() {
  await webProjectMenu();
}

async function webProjectMenu() {
  consola.success("✨ Reliverse CLI v1.0.10");
  consola.info(
    "👋 Welcome! Reliverse CLI already can create new web projects and make some codebase modifications, with more features coming soon.",
  );

  const option = await consola.prompt("How would you like to proceed?", {
    options: [
      "1. Install the pre-configured Relivator",
      "2. Build your own Relivator from scratch",
      "3. Install any web-related repository from GitHub",
      // "4. Run code modifications on the existing codebase",
      // "5. Update your GitHub clone with the latest changes",
      // "6. Add, remove, or replace the Relivator's features",
    ] as const,
    type: "select",
  });

  if (option === "1. Install the pre-configured Relivator") {
    await justInstallRelivator();
  } else if (option === "2. Build your own Relivator from scratch") {
    // await buildOwnRelivator();
    consola.warn("Not implemented yet 2.");
  } else if (option === "3. Install any web-related repository from GitHub") {
    // await installAnyGitRepo();
    consola.warn("Not implemented yet 3.");
  }
  // else if (option === "4. Run code modifications on the existing codebase") {
  //   await askCodemodUserCodebase();
  // } else if (option === "5. Update your GitHub clone with the latest changes") {
  //   await showUpdateCloneMenu();
  // } else if (option === "6. Add, remove, or replace the Relivator's features") {
  //   await showRelivatorFeatEditor();
  // }
  else {
    consola.error("Invalid option selected. Exiting.");
  }
}
