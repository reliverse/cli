import { prompt } from "@reliverse/prompts";
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
      console.log("Installation cancelled.");
      return;
    }
  }

  try {
    console.log(`Installing dependencies with ${npmClient}...`);
    await execaCommand(`${npmClient} install`, { cwd, stdio: "inherit" });
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error using ${npmClient} for installation:`,
        error.message,
      );
    } else {
      console.error(
        `An unknown error occurred using ${npmClient} for installation:`,
        error,
      );
    }
  }
}
