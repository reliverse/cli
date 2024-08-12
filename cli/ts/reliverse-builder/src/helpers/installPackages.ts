import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";

import type { InstallerOptions, PkgInstallerMap } from "../installers/index.js";
import { logger } from "../utils/logger.js";

type InstallPackagesOptions = InstallerOptions & {
	packages: PkgInstallerMap;
};

// This runs the installer for all the packages that the user has selected
export const installPackages = (options: InstallPackagesOptions) => {
	const { packages, projectDir, projectName } = options;
	logger.info("Adding boilerplate...");

	const installedPackages: string[] = [];

	for (const [name, pkgOpts] of Object.entries(packages)) {
		if (pkgOpts.inUse) {
			const spinner = ora(`Boilerplating ${name}...`).start();
			pkgOpts.installer(options);
			spinner.succeed(
				chalk.green(
					`Successfully setup boilerplate for ${chalk.green.bold(name)}`,
				),
			);
			installedPackages.push(name);
		}
	}

	logger.info("");

	// Write the output to README.md
	const readmePath = path.join(projectDir, "README.md");
	const output = `## Generated output

✔ ${projectName} scaffolded successfully with Reliverse CLI!

✔ Successfully setup boilerplate for ${installedPackages.join(", ")}.

If you encounter any issues, please open an issue! Remember to fill the .env file.`;

	fs.appendFileSync(readmePath, `\n${output}\n`);
};
