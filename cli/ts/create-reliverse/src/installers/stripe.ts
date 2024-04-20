import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { Installer } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

export const stripeInstaller: Installer = ({ projectDir, appRouter }) => {
	addPackageDependency({
		projectDir,
		dependencies: ["@stripe/stripe-js"],
		devMode: false,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	// Copy the necessary files for library configuration
	if (appRouter) {
		const configSrc = path.join(extrasDir, "src/app/api/stripe/route.ts");
		const configDest = path.join(projectDir, "src/app/api/stripe/route.ts");
		fs.copySync(configSrc, configDest);
	} else {
		const configSrc = path.join(extrasDir, "src/pages/api/stripe/index.ts");
		const configDest = path.join(projectDir, "src/pages/api/stripe/index.ts");
		fs.copySync(configSrc, configDest);
	}
};
