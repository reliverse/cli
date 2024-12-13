import type { PackageManagerName } from "nypm";

import { selectPrompt } from "@reliverse/prompts";
import { detectPackageManager } from "nypm";

export async function choosePackageManager(
  cwd: string,
): Promise<PackageManagerName> {
  const detectedPkgManager = (await detectPackageManager(cwd))?.name || "pnpm";

  let pkgManager: PackageManagerName = detectedPkgManager;

  if (pkgManager === "bun") {
    // relinka("warn", "bun might not work for installing dependencies.");
    const selectedPkgManager = await selectPrompt({
      title:
        "Let's install the dependencies. I see you have bun installed. Do you want to use pnpm, npm, yarn, or continue with bun?",
      defaultValue: "bun",
      options: [
        { label: "bun", value: "bun", hint: "The fastest package manager" },
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
        {
          label: "yarn",
          value: "yarn",
          hint: "The most resilient package manager",
        },
      ],
    });

    pkgManager = selectedPkgManager;
  }

  return pkgManager;
}
