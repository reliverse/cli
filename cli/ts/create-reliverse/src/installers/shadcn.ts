import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { Installer } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

export const shadcnInstaller: Installer = ({ projectDir }) => {
	addPackageDependency({
		projectDir,
		dependencies: [
			"postcss",
			"tailwindcss",
			"lucide-react",
			"tailwind-merge",
			"tailwindcss-animate",
			"@radix-ui/react-slot",
			"class-variance-authority",
		],
		devMode: true,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	const twCfgSrc = path.join(extrasDir, "shadcn/tailwind.config.ts");
	const twCfgDest = path.join(projectDir, "tailwind.config.ts");

	const postcssCfgSrc = path.join(extrasDir, "config/postcss.config.cjs");
	const postcssCfgDest = path.join(projectDir, "postcss.config.cjs");

	const cssSrc = path.join(extrasDir, "shadcn/globals.css");
	const cssDest = path.join(projectDir, "src/core/styles/globals.css");

	const shadcnCfgSrc = path.join(extrasDir, "shadcn/components.json");
	const shadcnCfgDest = path.join(projectDir, "components.json");

	const utilsSrc = path.join(extrasDir, "shadcn/utils/ui.ts");
	const utilsDest = path.join(projectDir, "src/core/utils/ui.ts");

	const primitivesSrc = path.join(
		extrasDir,
		"shadcn/components/primitives/button.tsx",
	);
	const primitivesDest = path.join(
		projectDir,
		"components/primitives/button.tsx",
	);

	fs.copySync(twCfgSrc, twCfgDest);
	fs.copySync(postcssCfgSrc, postcssCfgDest);
	fs.copySync(cssSrc, cssDest);
	fs.copySync(shadcnCfgSrc, shadcnCfgDest);
	fs.copySync(primitivesSrc, primitivesDest);
	fs.copySync(utilsSrc, utilsDest);
};
