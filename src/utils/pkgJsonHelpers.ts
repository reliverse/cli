import type { PackageJson } from "pkg-types";

import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

/**
 * Reads and parses package.json
 */
export async function readPackageJson(
  projectPath: string,
): Promise<PackageJson | null> {
  const packageJsonPath = path.join(projectPath, "package.json");
  try {
    if (await fs.pathExists(packageJsonPath)) {
      return await fs.readJson(packageJsonPath);
    }
    return null;
  } catch (error: unknown) {
    relinka("error", "Error reading package.json:", String(error));
    return null;
  }
}

/**
 * Checks if a specific script exists in package.json
 */
export async function checkScriptExists(
  projectPath: string,
  scriptName: string,
): Promise<boolean> {
  try {
    const packageJson = await readPackageJson(projectPath);
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
