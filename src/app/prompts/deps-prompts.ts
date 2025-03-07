import { confirmPrompt, relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import { installDependencies } from "nypm";

export async function installDepsPrompt(cwd: string) {
  const shouldInstall = await confirmPrompt({
    title:
      "Dependencies are missing from your project. Would you like to install them?",
    content: re.bold(
      "🚨 Note: Certain addons will be disabled until the dependencies are installed.",
    ),
  });
  if (shouldInstall) {
    relinka("info", "Installing dependencies...");
    try {
      await installDependencies({ cwd });
      relinka("success", "Dependencies installed successfully");
    } catch (error) {
      relinka(
        "error",
        "Failed to install dependencies:",
        error instanceof Error ? error.message : String(error),
      );
      return;
    }
  }
}
