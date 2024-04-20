import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { InstallerOptions } from "~/installers/index.js";

type SelectBoilerplateProps = Required<
	Pick<InstallerOptions, "packages" | "projectDir">
>;

// ============= APP ROUTER ===================================================

// This generates the root layout.tsx and locale
// layout.tsx file that is used to wrap the app
// It is similar to _app.tsx, but for app router
export const selectLayoutFile = ({
	projectDir,
	packages,
}: SelectBoilerplateProps) => {
	const usingTw = packages.tailwind.inUse;
	const usingTRPC = packages.trpc.inUse;
	const usingI18n = packages.nextIntl.inUse || packages.nextInternational.inUse;

	let layoutFile = "base.tsx";
	if (usingI18n) {
		if (usingTRPC && usingTw) {
			layoutFile = "[locale]/with-trpc-tw.tsx";
		} else if (usingTRPC && !usingTw) {
			layoutFile = "[locale]/with-trpc.tsx";
		} else if (!usingTRPC && usingTw) {
			layoutFile = "[locale]/with-tw.tsx";
		} else {
			layoutFile = "[locale]/base.tsx";
		}
	} else {
		if (usingTRPC && usingTw) {
			layoutFile = "with-trpc-tw.tsx";
		} else if (usingTRPC && !usingTw) {
			layoutFile = "with-trpc.tsx";
		} else if (!usingTRPC && usingTw) {
			layoutFile = "with-tw.tsx";
		}
	}

	const layoutFileDir = path.join(PKG_ROOT, "template/extras/src/app/layout");

	const layoutSrc = path.join(layoutFileDir, layoutFile);
	const layoutDest = path.join(
		projectDir,
		usingI18n ? "src/app/[locale]/layout.tsx" : "src/app/layout.tsx",
	);
	fs.copySync(layoutSrc, layoutDest);

	if (usingI18n) {
		const intlLayoutSrc = path.join(layoutFileDir, "with-i18n.tsx");
		const intlLayoutDest = path.join(projectDir, "src/app/layout.tsx");
		fs.copySync(intlLayoutSrc, intlLayoutDest);
	}
};

// Similar to index.tsx, but for app router
export const selectPageFile = ({
	projectDir,
	packages,
}: SelectBoilerplateProps) => {
	const usingTRPC = packages.trpc.inUse;
	const usingTw = packages.tailwind.inUse;
	const usingAuth = packages.nextAuth.inUse;
	const usingI18n = packages.nextIntl.inUse || packages.nextInternational.inUse;

	let pageFile = "base.tsx";
	if (usingI18n) {
		if (usingTRPC && usingTw && usingAuth) {
			pageFile = "[locale]/with-auth-trpc-tw.tsx";
		} else if (usingTRPC && !usingTw && usingAuth) {
			pageFile = "[locale]/with-auth-trpc.tsx";
		} else if (usingTRPC && usingTw) {
			pageFile = "[locale]/with-trpc-tw.tsx";
		} else if (usingTRPC && !usingTw) {
			pageFile = "[locale]/with-trpc.tsx";
		} else if (!usingTRPC && usingTw) {
			pageFile = "[locale]/with-tw.tsx";
		}
	} else {
		if (usingTRPC && usingTw && usingAuth) {
			pageFile = "with-auth-trpc-tw.tsx";
		} else if (usingTRPC && !usingTw && usingAuth) {
			pageFile = "with-auth-trpc.tsx";
		} else if (usingTRPC && usingTw) {
			pageFile = "with-trpc-tw.tsx";
		} else if (usingTRPC && !usingTw) {
			pageFile = "with-trpc.tsx";
		} else if (!usingTRPC && usingTw) {
			pageFile = "with-tw.tsx";
		}
	}

	const pageFileDir = path.join(PKG_ROOT, "template/extras/src/app/page");

	const pageSrc = path.join(pageFileDir, pageFile);
	const pageDest = path.join(
		projectDir,
		usingI18n ? "src/app/[locale]/page.tsx" : "src/app/page.tsx",
	);
	fs.copySync(pageSrc, pageDest);

	if (usingI18n) {
		const intlPageSrc = path.join(pageFileDir, "with-i18n.tsx");
		const intlPageDest = path.join(projectDir, "src/app/page.tsx");
		fs.copySync(intlPageSrc, intlPageDest);
	}

	if (usingAuth) {
		const authSrcDir = path.join(PKG_ROOT, "template/extras/src/app/auth");
		const authDestDir = path.join(
			projectDir,
			usingI18n ? "src/app/[locale]/auth" : "src/app/auth",
		);
		fs.copySync(authSrcDir, authDestDir);
	}
};

// ============= PAGES ROUTER =================================================

// This generates the _app.tsx file that is used to render the app
export const selectAppFile = ({
	projectDir,
	packages,
}: SelectBoilerplateProps) => {
	const appFileDir = path.join(PKG_ROOT, "template/extras/src/pages/_app");

	const usingTw = packages.tailwind.inUse;
	const usingTRPC = packages.trpc.inUse;
	const usingNextAuth = packages.nextAuth.inUse;

	let appFile = "base.tsx";
	if (usingTRPC && usingTw && usingNextAuth) {
		appFile = "with-auth-trpc-tw.tsx";
	} else if (usingTRPC && !usingTw && usingNextAuth) {
		appFile = "with-auth-trpc.tsx";
	} else if (usingTRPC && usingTw) {
		appFile = "with-trpc-tw.tsx";
	} else if (usingTRPC && !usingTw) {
		appFile = "with-trpc.tsx";
	} else if (!usingTRPC && usingTw) {
		appFile = "with-tw.tsx";
	} else if (usingNextAuth && usingTw) {
		appFile = "with-auth-tw.tsx";
	} else if (usingNextAuth && !usingTw) {
		appFile = "with-auth.tsx";
	}

	const appSrc = path.join(appFileDir, appFile);
	const appDest = path.join(projectDir, "src/pages/_app.tsx");
	fs.copySync(appSrc, appDest);
};

// This selects the proper index.tsx to be used that showcases the chosen tech
export const selectIndexFile = ({
	projectDir,
	packages,
}: SelectBoilerplateProps) => {
	const indexFileDir = path.join(PKG_ROOT, "template/extras/src/pages/index");

	const usingTRPC = packages.trpc.inUse;
	const usingTw = packages.tailwind.inUse;
	const usingAuth = packages.nextAuth.inUse;

	let indexFile = "base.tsx";
	if (usingTRPC && usingTw && usingAuth) {
		indexFile = "with-auth-trpc-tw.tsx";
	} else if (usingTRPC && !usingTw && usingAuth) {
		indexFile = "with-auth-trpc.tsx";
	} else if (usingTRPC && usingTw) {
		indexFile = "with-trpc-tw.tsx";
	} else if (usingTRPC && !usingTw) {
		indexFile = "with-trpc.tsx";
	} else if (!usingTRPC && usingTw) {
		indexFile = "with-tw.tsx";
	}

	const indexSrc = path.join(indexFileDir, indexFile);
	const indexDest = path.join(projectDir, "src/pages/index.tsx");
	fs.copySync(indexSrc, indexDest);
};
