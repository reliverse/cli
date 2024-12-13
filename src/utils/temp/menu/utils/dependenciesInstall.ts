import { confirmPrompt } from "@reliverse/prompts";
import { execaCommand } from "execa";

import { relinka } from "~/utils/console.js";

export async function installWithPackageManager(
  npmClient: string,
  devMode: boolean,
  cwd: string,
) {
  if (devMode) {
    const confirmInstall = await confirmPrompt({
      title:
        "You are in dev mode. Are you sure you want to install dependencies?",
      defaultValue: false,
    });

    if (!confirmInstall) {
      relinka("info", "Installation cancelled.");
      return;
    }
  }

  try {
    relinka("info", `Installing dependencies with ${npmClient}...`);
    await execaCommand(`${npmClient} install`, { cwd, stdio: "inherit" });
  } catch (error) {
    if (error instanceof Error) {
      relinka(
        "error",
        `Error using ${npmClient} for installation:`,
        error.message,
      );
    } else {
      relinka(
        "error",
        `An unknown error occurred using ${npmClient} for installation:`,
        error.toString(),
      );
    }
  }
}
