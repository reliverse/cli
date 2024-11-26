import type { PackageManagerName } from "nypm";

import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { detectPackageManager } from "nypm";

export async function choosePackageManager(
  cwd: string,
): Promise<PackageManagerName> {
  const detectedPkgManager = (await detectPackageManager(cwd))?.name || "pnpm";

  let pkgManager: PackageManagerName = detectedPkgManager;

  if (pkgManager === "bun") {
    relinka.warn("bun might not work for installing dependencies.");
    const selectedPkgManager = await selectPrompt({
      title:
        "bun was detected. Do you want to use `pnpm`, `npm`, `yarn`, or continue with bun ?",
      defaultValue: "pnpm",
      options: [
        {
          label: "pnpm",
          value: "pnpm",
          hint: "The most popular package manager",
        },
        {
          label: "npm",
          value: "npm",
          hint: "The most compatible package manager",
        },
        { label: "yarn", value: "yarn", hint: "The safest package manager" },
        { label: "bun", value: "bun", hint: "The fastest package manager" },
      ],
    });

    pkgManager = selectedPkgManager;
  }

  return pkgManager;
}
