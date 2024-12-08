import { relinka } from "@reliverse/relinka";

// import { pkg } from "~/utils/pkg.js";
import { installWithPackageManager } from "./menu/utils/dependenciesInstall.js";
import { getPackageManager } from "./menu/utils/packageManager.js";

const cwd = process.cwd();

async function main() {
  const args = process.argv.slice(2);
  const devMode = args.includes("--dev");
  const { pmName, pmVersion } = await getPackageManager(args, cwd);

  relinka.log(
    `\n✨ @reliverse/cli 1.3.4 | 🧩 ${pmName} ${pmVersion ? `v${pmVersion}` : ""}\n`,
  );

  // relinka.log(
  //   `\n✨ reliverse ${pkg.version ? `v${pkg.version}` : ""} | 🧩 ${pmName} ${pmVersion ? `v${pmVersion}` : ""}\n`,
  // );

  if (pmName !== "unknown") {
    await installWithPackageManager(pmName, devMode, cwd);
  } else {
    relinka.error(
      "Unknown package manager. Please contact support: https://discord.gg/Pb8uKbwpsJ",
    );
  }
}

main().catch((error) => {
  relinka.error("An error occurred:", error);
});
