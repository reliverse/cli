// choosePackageManager.ts

import type { PackageManagerName } from "nypm";

import { consola } from "consola";
import { detectPackageManager } from "nypm";

// Function to select the package manager
export async function choosePackageManager(
  cwd: string,
): Promise<PackageManagerName> {
  const detectedPkgManager = (await detectPackageManager(cwd))?.name || "pnpm"; // Fallback to pnpm if detection fails

  let pkgManager: PackageManagerName = detectedPkgManager as PackageManagerName;

  if (pkgManager === "bun") {
    consola.warn("Bun might not work for installing dependencies.");
    const selectedPkgManager = await consola.prompt(
      "Bun was detected. Do you want to use `pnpm`, `npm`, `yarn`, or continue with Bun?",
      {
        default: "pnpm",
        options: ["pnpm", "npm", "yarn", "bun"] as PackageManagerName[],
        type: "select",
      },
    );

    pkgManager = selectedPkgManager as PackageManagerName;
  }

  return pkgManager;
}
