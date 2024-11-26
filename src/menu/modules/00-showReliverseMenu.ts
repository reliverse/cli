import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { pkg } from "~/utils/pkg.js";

import { justInstallRelivator } from "./01-justInstallRelivator.js";

// import { installAnyGitRepo } from "./03-installAnyGitRepo";
// import { shadcnComponents } from "~/utils/shadcnComponents";
// import { buildOwnRelivator } from "./02-buildOwnRelivator";

// export async function showReliverseMenu(program: Command) {
export async function showReliverseMenu() {
  await webProjectMenu();
}

async function webProjectMenu() {
  console.log("");
  relinka.success(`✨ Reliverse CLI ${pkg.version}`);

  const option = await selectPrompt({
    title: "How would you like to proceed?",
    options: [
      { label: "1. Install the pre-configured Relivator", value: "1" },
      { label: "2. Build your own Relivator from scratch", value: "2" },
      {
        label: "3. Install any web-related repository from GitHub",
        value: "3",
      },
      // "4. Add shadcn/ui components to your React/Vue/Svelte project",
      // "5. Run code modifications on the existing codebase",
      // "6. Update your GitHub clone with the latest changes",
      // "7. Add, remove, or replace the Relivator's features",
    ],
  });

  if (option === "1") {
    await justInstallRelivator();
  } else if (option === "2") {
    // await buildOwnRelivator();
    relinka.warn("Not implemented yet 2.");
  } else if (option === "3") {
    // await installAnyGitRepo();
    relinka.warn("Not implemented yet 3.");
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
    relinka.error("Invalid option selected. Exiting.");
  }
}
