import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import type { Installer } from "~/installers/index.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";

export const trpcInstaller: Installer = ({
	projectDir,
	packages,
	appRouter,
}) => {
	addPackageDependency({
		projectDir,
		dependencies: [
			"@tanstack/react-query",
			"superjson",
			"@trpc/server",
			"@trpc/client",
			"@trpc/next",
			"@trpc/react-query",
		],
		devMode: false,
	});

	const usingAuth = packages?.nextAuth.inUse;
	const usingPrisma = packages?.prisma.inUse;
	const usingDrizzle = packages?.drizzle.inUse;
	const usingDb = usingPrisma || usingDrizzle;
	const usingTailwind = packages?.tailwind.inUse;
	const usingShadcn = packages?.shadcn.inUse;
	const usingComponents = packages?.components.inUse;

	const extrasDir = path.join(PKG_ROOT, "template/extras");

	const apiHandlerFile = "src/pages/api/trpc/[trpc].ts";
	const routeHandlerFile = "src/app/api/trpc/[trpc]/route.ts";
	const srcToUse = appRouter ? routeHandlerFile : apiHandlerFile;

	const apiHandlerSrc = path.join(extrasDir, srcToUse);
	const apiHandlerDest = path.join(projectDir, srcToUse);

	const trpcFile =
		usingAuth && usingDb
			? "with-auth-db.ts"
			: usingAuth
				? "with-auth.ts"
				: usingDb
					? "with-db.ts"
					: "base.ts";
	const trpcSrc = path.join(
		extrasDir,
		"src/core/server/api",
		appRouter ? "trpc-app" : "trpc-pages",
		trpcFile,
	);
	const trpcDest = path.join(projectDir, "src/core/server/api/trpc.ts");

	const rootRouterSrc = path.join(extrasDir, "src/core/server/api/root.ts");
	const rootRouterDest = path.join(projectDir, "src/core/server/api/root.ts");

	const exampleRouterFile =
		usingAuth && usingPrisma
			? "with-auth-prisma.ts"
			: usingAuth && usingDrizzle
				? "with-auth-drizzle.ts"
				: usingAuth
					? "with-auth.ts"
					: usingPrisma
						? "with-prisma.ts"
						: usingDrizzle
							? "with-drizzle.ts"
							: "base.ts";

	const exampleRouterSrc = path.join(
		extrasDir,
		"src/core/server/api/routers/post",
		exampleRouterFile,
	);
	const exampleRouterDest = path.join(
		projectDir,
		"src/core/server/api/routers/post.ts",
	);

	const copySrcDest: [string, string][] = [
		[apiHandlerSrc, apiHandlerDest],
		[trpcSrc, trpcDest],
		[rootRouterSrc, rootRouterDest],
		[exampleRouterSrc, exampleRouterDest],
	];

	if (appRouter) {
		addPackageDependency({
			dependencies: ["server-only"],
			devMode: false,
			projectDir,
		});

		const trpcDir = path.join(extrasDir, "src/core/utils/trpc");
		copySrcDest.push(
			[
				path.join(trpcDir, "server.ts"),
				path.join(projectDir, "src/core/utils/trpc/server.ts"),
			],
			[
				path.join(trpcDir, "react.tsx"),
				path.join(projectDir, "src/core/utils/trpc/react.tsx"),
			],
			[
				path.join(
					extrasDir,
					"src/components",
					usingShadcn || usingComponents
						? "create-post-shadcn.tsx"
						: usingTailwind
							? "create-post-tw.tsx"
							: "create-post.tsx",
				),
				path.join(projectDir, "src/components/create-post.tsx"),
			],
		);

		// If no tailwind, shadcn, or components, then use css modules
		if (!(usingTailwind || usingShadcn || usingComponents)) {
			copySrcDest.push([
				path.join(extrasDir, "src/components", "index.module.css"),
				path.join(projectDir, "src/components/index.module.css"),
			]);
		}
	} else {
		const utilsSrc = path.join(extrasDir, "src/utils/api.ts");
		const utilsDest = path.join(projectDir, "src/utils/api.ts");
		copySrcDest.push([utilsSrc, utilsDest]);
	}

	// biome-ignore lint/complexity/noForEach: <explanation>
	copySrcDest.forEach(([src, dest]) => {
		fs.copySync(src, dest);
	});
};
