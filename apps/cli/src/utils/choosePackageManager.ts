import type { PackageManagerName } from "nypm";

import { consola } from "consola";
import { detectPackageManager } from "nypm";

export async function choosePackageManager(
  cwd: string,
): Promise<PackageManagerName> {
  const detectedPkgManager = (await detectPackageManager(cwd))?.name || "pnpm";

  let pkgManager: PackageManagerName = detectedPkgManager;

  if (pkgManager === "bun") {
    consola.warn("bun might not work for installing dependencies.");
    const selectedPkgManager = await consola.prompt(
      "bun was detected. Do you want to use `pnpm`, `npm`, `yarn`, or continue with bun ?",
      {
        default: "pnpm",
        options: ["pnpm", "npm", "yarn", "bun"] as PackageManagerName[],
        type: "select",
      },
    );

    pkgManager = selectedPkgManager;
  }

  return pkgManager;
}
