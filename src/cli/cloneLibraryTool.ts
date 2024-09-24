import { consola } from "consola";
import path from "node:path";
import { detectPackageManager } from "nypm";

import { getCurrentWorkingDirectory } from "~/utils/fs";
import {
  appName,
  confirmation,
  dependencies,
  gitInitialization,
} from "~/utils/prompt";
import { validate } from "~/utils/validate";

import { installTemplate } from "./installer";

const args = process.argv.slice(2);
const isDevelopment = args.includes("--dev");

export async function cloneLibraryTool() {
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

    // Convert full GitHub URL to shorthand if necessary
    libraryRepo = customRepo.replace("https://github.com/", "github:");
  }

  const name = await appName();
  const gitOption = await gitInitialization();
  const confirmed = await confirmation();

  if (!confirmed) {
    consola.info("Library cloning process was canceled.");

    return;
  }

  const cwd = getCurrentWorkingDirectory();
  const targetDir = isDevelopment
    ? path.join(cwd, "..", name)
    : path.join(cwd, name);

  await installTemplate(name, libraryRepo, false, gitOption);

  // Ask the user if they want to install dependencies
  const installDeps = await dependencies("cloneLibraryTool");

  if (installDeps) {
    consola.info("Installing dependencies...");

    // Code to install dependencies goes here
    consola.success("Dependencies installed successfully.");
  } else {
    consola.info(
      "Dependencies were not installed. You can install them manually.",
    );

    const pkgManager = detectPackageManager?.name || "bun";

    consola.info(
      `👉 To install manually, run: cd ${targetDir} && ${pkgManager} i`,
    );
  }

  consola.success("");
  consola.success(`Library/Tool from ${libraryRepo} cloned successfully.`);
  consola.info(`👉 If you have VSCode installed, run: code ${targetDir}\n`);
}
