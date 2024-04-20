import fs from "node:fs";
import path from "node:path";
import { PKG_ROOT } from "../consts.js";
import { installPackages } from "../helpers/installPackages.js";
import { scaffoldProject } from "../helpers/scaffoldProject.js";
import {
	selectAppFile,
	selectIndexFile,
	selectLayoutFile,
	selectPageFile,
} from "../helpers/selectBoilerplate.js";
import type { DatabaseProvider, PkgInstallerMap } from "../installers/index.js";
import removeExpectErrors from "../scripts/removeExpectErrors";
import { getUserPkgManager } from "../utils/getUserPkgManager.js";

interface CreateProjectOptions {
	projectName: string;
	packages: PkgInstallerMap;
	scopedAppName: string;
	noInstall: boolean;
	importAlias: string;
	appRouter: boolean;
	databaseProvider: DatabaseProvider;
}

export const createProject = async ({
	projectName,
	scopedAppName,
	packages,
	noInstall,
	appRouter,
	databaseProvider,
}: CreateProjectOptions) => {
	const pkgManager = getUserPkgManager();
	const projectDir = path.resolve(process.cwd(), projectName);

	const usingTailwind = packages.tailwind.inUse;
	const usingShadcn = packages.shadcn.inUse;
	const usingComponents = packages.components.inUse;

	// Bootstraps the base Next.js application
	await scaffoldProject({
		projectName,
		projectDir,
		pkgManager,
		scopedAppName,
		noInstall,
		appRouter,
		databaseProvider,
	});

	// Install the selected packages
	installPackages({
		projectName,
		scopedAppName,
		projectDir,
		pkgManager,
		packages,
		noInstall,
		appRouter,
		databaseProvider,
	});

	// Install the selected i18n package
	if (packages.nextIntl.inUse || packages.nextInternational.inUse) {
		const i18nPackage = packages.nextIntl.inUse
			? "nextIntl"
			: "nextInternational";
		packages[i18nPackage].installer({
			projectDir,
			pkgManager,
			noInstall,
			packages,
			appRouter,
			projectName,
			scopedAppName,
			databaseProvider,
		});
	}

	// Install the selected payment package
	if (packages.stripe.inUse || packages.lemonSqueezy.inUse) {
		const paymentPackage = packages.stripe.inUse ? "stripe" : "lemonSqueezy";
		packages[paymentPackage].installer({
			projectDir,
			pkgManager,
			noInstall,
			packages,
			appRouter,
			projectName,
			scopedAppName,
			databaseProvider,
		});
	}

	// Select necessary _app,index / layout,page files
	if (appRouter) {
		// Replace next.config
		fs.copyFileSync(
			path.join(PKG_ROOT, "template/extras/config/next-config-appdir.js"),
			path.join(projectDir, "next.config.js"),
		);

		selectLayoutFile({ projectDir, packages });
		selectPageFile({ projectDir, packages });
	} else {
		selectAppFile({ projectDir, packages });
		selectIndexFile({ projectDir, packages });
	}

	// If no tailwind, shadcn, or components, then use css modules
	if (!(usingTailwind || usingShadcn || usingComponents)) {
		const indexModuleCss = path.join(
			PKG_ROOT,
			"template/extras/src/index.module.css",
		);
		const indexModuleCssDest = path.join(
			projectDir,
			"src",
			appRouter ? "app" : "pages",
			"index.module.css",
		);
		fs.copyFileSync(indexModuleCss, indexModuleCssDest);
	}

	// Remove @ts-expect-error comments
	removeExpectErrors(projectDir);

	return projectDir;
};
