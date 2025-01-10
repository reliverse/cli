import { execa } from "execa";
import ora from "ora";
import pc from "picocolors";

import type { PkgInstallerMap } from "~/app/menu/create-project/cp-modules/use-composer-mode/opts.js";
import type { InstallerOptions } from "~/app/menu/create-project/cp-modules/use-composer-mode/opts.js";

import { relinka } from "~/utils/loggerRelinka.js";

type InstallPackagesOptions = InstallerOptions & {
  packages: PkgInstallerMap;
};
// This runs the installer for all the packages that the user has selected
export const installPackages = async (options: InstallPackagesOptions) => {
  const { packages } = options;
  relinka("info", "Adding boilerplate...");

  for (const [name, pkgOpts] of Object.entries(packages)) {
    if (pkgOpts.inUse) {
      const spinner = ora(`Boilerplating ${name}...`).start();
      await pkgOpts.installer(options);
      spinner.succeed(
        pc.green(`Successfully setup boilerplate for ${pc.bold(name)}`),
      );
    }
  }

  relinka("info", "");
};

const trpcDependencies = {
  "@tanstack/react-query": "^5.17.19",
  "@trpc/client": "^11.0.0",
  "@trpc/next": "^11.0.0",
  "@trpc/react-query": "^11.0.0",
  "@trpc/server": "^11.0.0",
  superjson: "^2.2.1",
};

export async function installTRPCDependencies(projectDir: string) {
  const deps = Object.entries(trpcDependencies)
    .map(([pkg, version]) => `${pkg}@${version}`)
    .join(" ");

  await execa(`npm install ${deps}`, { cwd: projectDir });
}
