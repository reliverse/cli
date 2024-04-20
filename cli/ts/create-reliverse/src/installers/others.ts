import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { Installer } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

export const othersInstaller: Installer = ({ projectDir }) => {
	addPackageDependency({
		projectDir,
		dependencies: ["knip", "eslint-plugin-perfectionist"],
		devMode: true,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	const knipCfgSrc = path.join(extrasDir, "others/knip.json");
	const knipCfgDest = path.join(projectDir, "knip.json");

	fs.copySync(knipCfgSrc, knipCfgDest);
};
