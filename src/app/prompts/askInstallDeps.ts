import { confirmPrompt, relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import { installDependencies } from "nypm";

/**
 * Asks the user if they want to install dependencies and attempts to install them if confirmed.
 * @param cwd The current working directory
 * @returns true if dependencies are still missing (installation failed or user declined),
 *          false if dependencies are now installed
 */
export async function askInstallDeps(cwd: string): Promise<boolean> {
  // Constants for return values to make the code more readable
  const DEPS_INSTALLED = false;
  const DEPS_MISSING = true;

  try {
    const shouldInstall = await confirmPrompt({
      title:
        "Dependencies are missing from your project. Would you like to install them?",
      content: re.bold(
        "🚨 Note: Certain addons will be disabled until the dependencies are installed.",
      ),
    });

    if (!shouldInstall) {
      relinka("info", "Skipping dependency installation.");
      return DEPS_MISSING; // User declined installation
    }

    relinka("info", "Installing dependencies...");
    try {
      await installDependencies({ cwd });
      relinka("success", "Dependencies installed successfully");
      return DEPS_INSTALLED;
    } catch (error) {
      relinka(
        "error",
        "Failed to install dependencies:",
        error instanceof Error ? error.message : String(error),
      );
      return DEPS_MISSING;
    }
  } catch (error) {
    // Handle any unexpected errors in the prompt itself
    relinka(
      "error",
      "An unexpected error occurred during dependency installation:",
      error instanceof Error ? error.message : String(error),
    );
    return DEPS_MISSING;
  }
}
