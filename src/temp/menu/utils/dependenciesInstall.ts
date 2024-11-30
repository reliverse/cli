import { prompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execaCommand } from "execa";

export async function installWithPackageManager(
  npmClient: string,
  devMode: boolean,
  cwd: string,
) {
  if (devMode) {
    const { confirmInstall } = await prompt({
      type: "confirm",
      id: "confirmInstall",
      title:
        "You are in dev mode. Are you sure you want to install dependencies?",
      defaultValue: false,
    });

    if (!confirmInstall) {
      relinka.log("Installation cancelled.");
      return;
    }
  }

  try {
    relinka.log(`Installing dependencies with ${npmClient}...`);
    await execaCommand(`${npmClient} install`, { cwd, stdio: "inherit" });
  } catch (error) {
    if (error instanceof Error) {
      relinka.error(
        `Error using ${npmClient} for installation:`,
        error.message,
      );
    } else {
      relinka.error(
        `An unknown error occurred using ${npmClient} for installation:`,
        error,
      );
    }
  }
}
