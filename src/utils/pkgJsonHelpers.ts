import { relinka } from "@reliverse/prompts";
import { readPackageJSON } from "pkg-types";

/**
 * Checks if a specific script exists in package.json
 * @param projectPath - Path to the project directory containing package.json
 * @param scriptName - Name of the script to check for
 * @returns Promise resolving to true if the script exists, false otherwise
 */
export async function checkScriptExists(
  projectPath: string,
  scriptName: string,
): Promise<boolean> {
  try {
    const packageJson = await readPackageJSON(projectPath);
    return !!packageJson?.scripts?.[scriptName];
  } catch (error: unknown) {
    relinka(
      "error",
      `Error checking for script ${scriptName}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
