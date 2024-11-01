import consola from "consola";
import type { Command } from "commander";
import { justInstallRelivator } from "./01-justInstallRelivator";
import { reliverseVersion } from "~/utils/reliverseVersion";

// import { installAnyGitRepo } from "./03-installAnyGitRepo";
// import { shadcnComponents } from "~/utils/shadcnComponents";
// import { buildOwnRelivator } from "./02-buildOwnRelivator";

// export async function showReliverseMenu(program: Command) {
export async function showReliverseMenu() {
  await webProjectMenu();
}

async function webProjectMenu() {
  console.log("");
  consola.success(`✨ Reliverse CLI ${reliverseVersion}`);
  consola.info(
    "👋 Welcome! This tool already can help you create new web projects and make some codebase modifications, with more features coming soon.",
  );

  const option = await consola.prompt("How would you like to proceed?", {
    options: [
      "1. Install the pre-configured Relivator",
      "2. Build your own Relivator from scratch",
      "3. Install any web-related repository from GitHub",
      // "4. Add shadcn/ui components to your React/Vue/Svelte project",
      // "5. Run code modifications on the existing codebase",
      // "6. Update your GitHub clone with the latest changes",
      // "7. Add, remove, or replace the Relivator's features",
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
  // else if ( option === "4. Add shadcn/ui components to your React/Vue/Svelte project" ) {
  //   await shadcnComponents(program);
  // }
  // else if (option === "5. Run code modifications on the existing codebase") {
  //   await askCodemodUserCodebase();
  // } else if (option === "6. Update your GitHub clone with the latest changes") {
  //   await showUpdateCloneMenu();
  // } else if (option === "7. Add, remove, or replace the Relivator's features") {
  //   await showRelivatorFeatEditor();
  // }
  else {
    consola.error("Invalid option selected. Exiting.");
  }
}
