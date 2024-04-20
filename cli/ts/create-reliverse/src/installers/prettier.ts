import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { Installer } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

export const prettierInstaller: Installer = ({ projectDir }) => {
	addPackageDependency({
		projectDir,
		dependencies: ["prettier"],
		devMode: true,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	const prettierSrc = path.join(extrasDir, "config/_prettier.config.js");
	const prettierDest = path.join(projectDir, "prettier.config.js");

	fs.copySync(prettierSrc, prettierDest);
};
