import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { Installer } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

export const biomeInstaller: Installer = ({ projectDir }) => {
	addPackageDependency({
		projectDir,
		dependencies: ["@biomejs/biome"],
		devMode: true,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	const biomeSrc = path.join(extrasDir, "config/biome.json");
	const biomeDest = path.join(projectDir, "biome.json");

	fs.copySync(biomeSrc, biomeDest);
};
