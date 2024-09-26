import { consola } from "consola";
import path from "node:path";

import { appName } from "~/prompts/05-appName";
import { gitInitialization } from "~/prompts/08-gitInitialization";
import { dependencies } from "~/prompts/09-installDependencies";
import { confirmation } from "~/prompts/10-confirmation";
import { choosePackageManager } from "~/prompts/utils/choosePackageManager";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { installTemplate } from "~/prompts/utils/installTemplate";
import { validate } from "~/prompts/utils/validate";
import { isDevelopment } from "~/settings";

export async function installLibrariesMenu() {
  consola.info("You can clone any JavaScript/TypeScript library or tool.");

  const libraryOption = await consola.prompt("Select an option to proceed:", {
    options: [
      "1. Clone Reliverse CLI repository",
      "2. Provide a custom GitHub URL",
    ] as const,
    type: "select",
  });

  let libraryRepo = "";

  if (libraryOption === "1. Clone Reliverse CLI repository") {
    libraryRepo = "reliverse/cli"; // Shorthand for the GitHub repo
  } else if (libraryOption === "2. Provide a custom GitHub URL") {
    const customRepo = await consola.prompt(
      "Enter the GitHub repository link:",
      {
        type: "text",
      },
    );

    validate(customRepo, "string", "Custom repository selection canceled.");
    libraryRepo = customRepo.replace("https://github.com/", "github:");
  }

  const projectName = await appName();
  const gitOption = await gitInitialization();
  const installDeps = await dependencies("installLibrariesMenu");

  // Call confirmation with all necessary params
  const confirmed = await confirmation(
    libraryRepo, // Template
    projectName, // Project Name
    "", // GitHub User (none in this case)
    "", // Website (none in this case)
    gitOption, // Git Option
    installDeps, // Install dependencies boolean
  );

  if (!confirmed) {
    consola.info("Library cloning process was canceled.");

    return;
  }

  const cwd = getCurrentWorkingDirectory();
  const targetDir = isDevelopment
    ? path.join(cwd, "..", projectName)
    : path.join(cwd, projectName);

  await installTemplate(projectName, libraryRepo, installDeps, gitOption);

  if (installDeps) {
    const pkgManager = await choosePackageManager(cwd);

    consola.info(`Using ${pkgManager} to install dependencies...`);

    try {
      consola.success("Dependencies installed successfully.");
    } catch (error) {
      consola.error("Failed to install dependencies:", error);
    }
  } else {
    const pkgManager = await choosePackageManager(cwd);

    consola.info(
      `👉 To install manually, run: cd ${targetDir} && ${pkgManager} i`,
    );
  }

  consola.success(`Library/Tool from ${libraryRepo} cloned successfully.`);
  consola.info(`👉 If you have VSCode installed, run: code ${targetDir}\n`);
}
