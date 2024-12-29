import ora from "ora";
import pc from "picocolors";

import { relinka } from "~/utils/console.js";

import {
  type InstallerOptions,
  type PkgInstallerMap,
} from "../../installers/index.js";

type InstallPackagesOptions = InstallerOptions & {
  packages: PkgInstallerMap;
};
// This runs the installer for all the packages that the user has selected
export const installPackages = (options: InstallPackagesOptions) => {
  const { packages } = options;
  relinka("info", "Adding boilerplate...");

  for (const [name, pkgOpts] of Object.entries(packages)) {
    if (pkgOpts.inUse) {
      const spinner = ora(`Boilerplating ${name}...`).start();
      pkgOpts.installer(options);
      spinner.succeed(
        pc.green(`Successfully setup boilerplate for ${pc.bold(name)}`),
      );
    }
  }

  relinka("info", "");
};
