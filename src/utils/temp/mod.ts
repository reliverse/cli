import { relinka } from "~/utils/console.js";

import { installWithPackageManager } from "./menu/utils/dependenciesInstall.js";
import {
  getBunVersion,
  getPackageManager,
  isBunInstalled,
} from "./menu/utils/packageManager.js";

const cwd = process.cwd();

async function main() {
  const args = process.argv.slice(2);
  const devMode = args.includes("--dev");
  const { pmName, pmVersion } = await getPackageManager(cwd, args);
  let pm = pmName;
  let pmv = pmVersion;

  if (await isBunInstalled()) {
    pm = "bun";
    pmv = await getBunVersion();
  }

  relinka(
    "info",
    `\n✨ @reliverse/cli 1.3.22 | 🧩 ${pm} ${pmv ? `v${pmv}` : ""}\n`,
  );

  if (pmName !== "unknown") {
    await installWithPackageManager(pmName, devMode, cwd);
  } else {
    relinka(
      "error",
      "Unknown package manager. Please contact support: https://discord.gg/Pb8uKbwpsJ",
    );
  }
}

main().catch((error) => {
  relinka("error", "An error occurred:", error.toString());
});
