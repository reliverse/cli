import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "../consts.js";
import type { Installer } from "../installers/index.js";
import { addPackageDependency } from "../utils/addPackageDependency.js";

const copyFile = (srcDir: string, destDir: string, fileName: string) => {
	const srcFile = path.join(srcDir, fileName);
	const destFile = path.join(destDir, fileName);
	fs.copySync(srcFile, destFile);
};

const copyDirectory = (srcDir: string, destDir: string) => {
	fs.copySync(srcDir, destDir);
};

export const nextInternationalInstaller: Installer = ({
	projectDir,
	appRouter,
}) => {
	addPackageDependency({
		projectDir,
		dependencies: ["next-international"],
		devMode: false,
	});

	const extrasDir = path.join(PKG_ROOT, "template/extras");
	const projectSrcDir = path.join(projectDir, "src");

	// Copy the i18n.ts file
	copyFile(path.join(extrasDir, "src"), projectSrcDir, "i18n.ts");

	// Copy the i18n folder and its contents
	const i18nSrcDir = path.join(extrasDir, "src/i18n");
	const i18nDestDir = path.join(projectSrcDir, "i18n");
	copyDirectory(i18nSrcDir, i18nDestDir);

	if (appRouter) {
		// Copy the middleware and navigation files if appRouter is true
		copyFile(path.join(extrasDir, "src"), projectSrcDir, "middleware.ts");
		copyFile(path.join(extrasDir, "src"), projectSrcDir, "navigation.ts");

		// copyFile(path.join(extrasDir, "src"), projectSrcDir, "with-i18n.tsx");
		// copyFile(path.join(extrasDir, "src"), projectSrcDir, "with-i18n.tsx");

		/* const layoutFileI18nDir = path.join(PKG_ROOT, "template/extras/src/app");
		const intlLayoutSrc = path.join(layoutFileI18nDir, "with-i18n.tsx");
		const intlLayoutDest = path.join(projectDir, "src/app/layout.tsx");
		fs.copySync(intlLayoutSrc, intlLayoutDest);

		const pageFileI18nDir = path.join(PKG_ROOT, "template/extras/src/app");
		const intlPageSrc = path.join(pageFileI18nDir, "with-i18n.tsx");
		const intlPageDest = path.join(projectDir, "src/app/page.tsx");
		fs.copySync(intlPageSrc, intlPageDest); */
	}
};
