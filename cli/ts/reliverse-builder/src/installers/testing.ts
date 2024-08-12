import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "../consts.js";
import type { Installer } from "../installers/index.js";
import { addPackageDependency } from "../utils/addPackageDependency.js";

export const testingInstaller: Installer = ({ projectDir }) => {
	addPackageDependency({
		projectDir,
		dependencies: ["knip", "eslint-plugin-perfectionist", "jsdom", "vitest"],
		devMode: true,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	const vitestCfgSrc = path.join(extrasDir, "src/core/tests/vitest.config.ts");
	const vitestCfgDest = path.join(projectDir, "vitest.config.ts");

	const exampleTestSrc = path.join(extrasDir, "src/core/tests/example.test.ts");
	const exampleTestDest = path.join(
		projectDir,
		"src/core/tests/example.test.ts",
	);

	fs.copySync(vitestCfgSrc, vitestCfgDest);
	fs.copySync(exampleTestSrc, exampleTestDest);
};
