import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";

import { CREATE_RELIVERSE, DEFAULT_APP_NAME } from "~/consts.js";
import {
	type AvailablePackages,
	type DatabaseProvider,
	databaseProviders,
} from "~/installers/index.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";
import { getVersion } from "~/utils/getVersion.js";
import { IsTTYError } from "~/utils/isTTYError.js";
import { logger } from "~/utils/logger.js";
import { validateAppName } from "~/utils/validateAppName.js";
import { validateImportAlias } from "~/utils/validateImportAlias.js";

interface CliFlags {
	noGit: boolean;
	noInstall: boolean;
	default: boolean;
	importAlias: string;

	/** @internal Used in CI. */
	CI: boolean;
	/** @internal Used in CI. */
	tailwind: boolean;
	/** @internal Used in CI. */
	shadcn: boolean;
	/** @internal Used in CI. */
	trpc: boolean;
	/** @internal Used in CI. */
	prisma: boolean;
	/** @internal Used in CI. */
	drizzle: boolean;
	/** @internal Used in CI. */
	nextAuth: boolean;
	/** @internal Used in CI. */
	appRouter: boolean;
	/** @internal Used in CI. */
	nextIntl: boolean;
	/** @internal Used in CI. */
	nextInternational: boolean;
	/** @internal Used in CI. */
	stripe: boolean;
	/** @internal Used in CI. */
	lemonSqueezy: boolean;
	/** @internal Used in CI. */
	prettier: boolean;
	/** @internal Used in CI. */
	biome: boolean;
	/** @internal Used in CI. */
	testing: boolean;
	/** @internal Used in CI. */
	others: boolean;
}

interface CliResults {
	appName: string;
	packages: AvailablePackages[];
	flags: CliFlags;
	databaseProvider: DatabaseProvider;
	styling: "none" | "tailwind" | "shadcn";
	i18n: "none" | "next-intl" | "next-international";
	paymentProvider: "none" | "stripe" | "lemon-squeezy";
	formatter: "none" | "prettier" | "biome";
	template:
		| "versator"
		| "create-t3-app"
		| "create-vite"
		| "create-remix"
		| "create-next-app"
		| "create-medusa-app"
		| "create-strapi-app"
		| "create-payload-app";
}

const defaultOptions: CliResults = {
	appName: DEFAULT_APP_NAME,
	packages: ["nextAuth", "prisma", "tailwind", "trpc"],
	flags: {
		noGit: false,
		noInstall: false,
		default: false,
		CI: false,
		tailwind: false,
		trpc: false,
		prisma: false,
		drizzle: false,
		nextAuth: false,
		importAlias: "~/",
		appRouter: false,
		nextIntl: false,
		nextInternational: false,
		stripe: false,
		lemonSqueezy: false,
		shadcn: false,
		prettier: false,
		biome: false,
		testing: false,
		others: false,
	},
	databaseProvider: "sqlite",
	styling: "none",
	i18n: "none",
	formatter: "prettier",
	paymentProvider: "none",
	template: "versator",
};

export const runCli = async (): Promise<CliResults> => {
	const cliResults = defaultOptions;

	const program = new Command()
		.name(CREATE_RELIVERSE)
		.description("A CLI for creating web applications with the Reliverse stack")
		.arguments(
			"[dir]",
			// "The name of the application, as well as the name of the directory to create",
		)
		.option(
			"--noGit",
			"Explicitly tell the CLI to not initialize a new git repo in the project",
			false,
		)
		.option(
			"--noInstall",
			"Explicitly tell the CLI to not run the package manager's install command",
			false,
		)
		.option(
			"-y, --default",
			"Bypass the CLI and use all default options to bootstrap a new Reliverse app",
			false,
		)
		/** START CI-FLAGS */
		/**
		 * @experimental Used for CI E2E tests. If any of the following option-flags are provided, we
		 *               skip prompting.
		 */
		.option("--CI", "Boolean value if we're running in CI", false)
		/** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
		.option(
			"--tailwind [boolean]",
			"Experimental: Boolean value if we should install Tailwind CSS. Must be used in conjunction with `--CI`.",
			(value) => !!value && value !== "false",
		)
		/** @experimental Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
		.option(
			"--nextAuth [boolean]",
			"Experimental: Boolean value if we should install NextAuth.js. Must be used in conjunction with `--CI`.",
			(value) => !!value && value !== "false",
		)
		/** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
		.option(
			"--prisma [boolean]",
			"Experimental: Boolean value if we should install Prisma. Must be used in conjunction with `--CI`.",
			(value) => !!value && value !== "false",
		)
		/** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
		.option(
			"--drizzle [boolean]",
			"Experimental: Boolean value if we should install Drizzle. Must be used in conjunction with `--CI`.",
			(value) => !!value && value !== "false",
		)
		/** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
		.option(
			"--trpc [boolean]",
			"Experimental: Boolean value if we should install tRPC. Must be used in conjunction with `--CI`.",
			(value) => !!value && value !== "false",
		)
		/** @experimental - Used for CI E2E tests. Used in conjunction with `--CI` to skip prompting. */
		.option(
			"-i, --import-alias",
			"Explicitly tell the CLI to use a custom import alias",
			defaultOptions.flags.importAlias,
		)
		.option(
			"--dbProvider [provider]",
			`Choose a database provider to use. Possible values: ${databaseProviders.join(
				", ",
			)}`,
			defaultOptions.flags.importAlias,
		)
		.option(
			"--appRouter [boolean]",
			"Explicitly tell the CLI to use the new Next.js app router",
			(value) => !!value && value !== "false",
		)
		/** END CI-FLAGS */
		.version(getVersion(), "-v, --version", "Display the version number")
		.addHelpText(
			"afterAll",
			`\n The Reliverse stack was built by ${chalk
				.hex("#E8DCFF")
				.bold(
					"@blefnk",
				)} and has been used to build awesome fullstack applications like ${chalk
				.hex("#E24A8D")
				.underline("https://github.com/blefnk/versator")} \n`,
		)
		.parse(process.argv);

	// FIXME: TEMPORARY WARNING WHEN USING YARN 3. SEE ISSUE #57
	if (process.env.npm_config_user_agent?.startsWith("yarn/3")) {
		logger.warn(`  WARNING: It looks like you are using Yarn 3. This is currently not supported,
  and likely to result in a crash. Please run create-reliverse with another
  package manager such as pnpm, npm, or Yarn Classic.`);
	}

	// Needs to be separated outside the if statement
	// to correctly infer the type as string | undefined
	const cliProvidedName = program.args[0];
	if (cliProvidedName) {
		cliResults.appName = cliProvidedName;
	}

	cliResults.flags = program.opts() as CliFlags;

	/** @internal Used for CI E2E tests. */
	if (cliResults.flags.CI) {
		cliResults.packages = [];
		if (cliResults.flags.trpc) cliResults.packages.push("trpc");
		if (cliResults.flags.tailwind) cliResults.packages.push("tailwind");
		if (cliResults.flags.prisma) cliResults.packages.push("prisma");
		if (cliResults.flags.drizzle) cliResults.packages.push("drizzle");
		if (cliResults.flags.nextAuth) cliResults.packages.push("nextAuth");

		if (cliResults.flags.prisma && cliResults.flags.drizzle) {
			// We test a matrix of all possible combination of packages in CI. Checking for impossible
			// combinations here and exiting gracefully is easier than changing the CI matrix to exclude
			// invalid combinations. We are using an "OK" exit code so CI continues with the next combination.
			logger.warn("Incompatible combination Prisma + Drizzle. Exiting.");
			process.exit(0);
		}

		cliResults.databaseProvider = cliResults.packages.includes("drizzle")
			? "planetscale"
			: "sqlite";

		return cliResults;
	}

	if (cliResults.flags.default) {
		return cliResults;
	}

	// Explained below why this is in a try/catch block
	try {
		if (process.env.TERM_PROGRAM?.toLowerCase().includes("mintty")) {
			logger.warn(`  WARNING: It looks like you are using MinTTY, which is non-interactive. This is most likely because you are 
  using Git Bash. If that's that case, please use Git Bash from another terminal, such as Windows Terminal. Alternatively, you 
  can provide the arguments from the CLI directly: https://docs.bleverse.com/en/installation#experimental-usage to skip the prompts.`);

			throw new IsTTYError("Non-interactive environment");
		}

		// if --CI flag is set, we are running in CI mode and should not prompt the user

		const pkgManager = getUserPkgManager();

		const project = await p.group(
			{
				...(!cliProvidedName && {
					name: () =>
						p.text({
							message: "[1/18] How your project be called?",
							defaultValue: cliProvidedName,
							validate: validateAppName,
						}),
				}),
				language: () => {
					return p.select({
						message: "[2/18] Will you be using TypeScript or JavaScript?",
						options: [
							{ value: "typescript", label: "TypeScript" },
							{ value: "javascript", label: "JavaScript" },
						],
						initialValue: "typescript",
					});
				},
				_: ({ results }) =>
					results.language === "javascript"
						? p.note(
								chalk.dim(
									"JS-only support is coming soon.\nLet's use TypeScript instead! 🚀",
								),
							)
						: undefined,
				monorepo: () => {
					return p.select({
						message: `${chalk.bgGray(
							" OPTIONAL ",
						)} [3/18] Would you like to have a regular repo or a monorepo?`,
						options: [
							{ value: "regular", label: "Regular" },
							{ value: "monorepo", label: "Monorepo" },
						],
						initialValue: "regular",
					});
				},
				styling: () => {
					return p.select({
						message: "[4/18] What do you want to use for styling?",
						options: [
							{ value: "none", label: "Only CSS" },
							{ value: "tailwind", label: "Tailwind" },
							{ value: "shadcn", label: "Tailwind - Shadcn" },
							{ value: "components", label: "Tailwind - Shadcn - Components" },
						],
						initialValue: "none",
					});
				},
				trpc: () => {
					return p.confirm({
						message: "[5/18] Would you like to use tRPC?",
					});
				},
				authentication: () => {
					return p.select({
						message:
							"[6/18] What auth provider would you like to use? (clerk, supabase, lucia are coming soon)",
						options: [
							{ value: "none", label: "None" },
							{ value: "next-auth", label: "NextAuth.js" },
							// TODO: Implement Clerk as auth provider
							// { value: "clerk", label: "Clerk" },
							// TODO: Implement Supabase as auth provider
							// { value: "supabase", label: "Supabase" },
							// TODO: Implement Lucia as auth provider
							// { value: "lucia-auth", label: "Lucia" },
						],
						initialValue: "none",
					});
				},
				database: () => {
					return p.select({
						message: "[7/18] What database ORM would you like to use?",
						options: [
							{ value: "none", label: "None" },
							{ value: "prisma", label: "Prisma" },
							{ value: "drizzle", label: "Drizzle" },
						],
						initialValue: "none",
					});
				},
				appRouter: () => {
					return p.confirm({
						message: `${chalk.bgCyan(
							" RECOMMENDED ",
						)} [8/18] Would you like to use Next.js App Router?`,
						initialValue: true,
					});
				},
				i18n: () => {
					return p.select({
						message:
							"[9/18] What internationalization library would you like to use?",
						options: [
							{ value: "none", label: "None" },
							{ value: "next-intl", label: "next-intl" },
							{ value: "next-international", label: "next-international" },
						],
						initialValue: "none",
					});
				},
				paymentProvider: () => {
					return p.select({
						message: "[10/18] What payment provider would you like to use?",
						options: [
							{ value: "none", label: "None" },
							{ value: "stripe", label: "Stripe" },
							{ value: "lemon-squeezy", label: "LemonSqueezy" },
						],
						initialValue: "none",
					});
				},
				formatter: () => {
					return p.select({
						message: "[11/18] What formatter would you like to use?",
						options: [
							{ value: "none", label: "None" },
							{ value: "prettier", label: "Prettier" },
							{ value: "biome", label: "Biome" },
						],
						initialValue: "none",
					});
				},
				databaseProvider: ({ results }) => {
					if (results.database === "none") return;
					return p.select({
						message: "[12/18] What database provider would you like to use?",
						options: [
							{ value: "sqlite", label: "SQLite" },
							{ value: "mysql", label: "MySQL" },
							{ value: "postgres", label: "PostgreSQL" },
							{ value: "planetscale", label: "PlanetScale" },
						],
						initialValue: "sqlite",
					});
				},
				testing: () => {
					return p.confirm({
						message: `${chalk.bgGray(
							" ADVANCED ",
						)} [13/18] Would you like to install Vitest and add some testing files?`,
						initialValue: false,
					});
				},
				template: () => {
					return p.select({
						message: "[14/18] What template/cms would you like to use?",
						options: [
							{ value: "versator", label: "versator/relivator" },
							{ value: "create-t3-app", label: "create-t3-app" },
							{ value: "create-vite", label: "[soon] create-vite" },
							{ value: "create-remix", label: "[soon] create-remix" },
							{ value: "create-next-app", label: "[soon] create-next-app" },
							{ value: "create-medusa-app", label: "[soon] create-medusa-app" },
							{ value: "create-strapi-app", label: "[soon] create-strapi-app" },
							{
								value: "create-payload-app",
								label: "[soon] create-payload-app",
							},
						],
						initialValue: "versator",
					});
				},
				others: () => {
					return p.confirm({
						message: `${chalk.bgCyan(
							" RECOMMENDED ",
						)} [15/18] Would you like to install Knip and eslint-plugin-perfectionist?`,
						initialValue: true,
					});
				},
				...(!cliResults.flags.noGit && {
					git: () => {
						return p.confirm({
							message: "[16/18] Should we init a Git repo and stage changes?",
							initialValue: !defaultOptions.flags.noGit,
						});
					},
				}),
				...(!cliResults.flags.noInstall && {
					install: () => {
						return p.confirm({
							message: `[17/18] Should we run '${pkgManager}${
								pkgManager === "yarn" ? `'?` : ` install' for you?`
							}`,
							initialValue: !defaultOptions.flags.noInstall,
						});
					},
				}),
				importAlias: () => {
					return p.text({
						message: "[18/18] What import alias would you like to use?",
						defaultValue: defaultOptions.flags.importAlias,
						placeholder: defaultOptions.flags.importAlias,
						validate: validateImportAlias,
					});
				},
			},
			{
				onCancel() {
					process.exit(1);
				},
			},
		);

		const packages: AvailablePackages[] = [];
		if (project.testing) packages.push("testing");
		if (project.others) packages.push("others");
		if (project.styling === "components") packages.push("components");
		if (project.styling === "tailwind") packages.push("tailwind");
		if (project.styling === "shadcn") packages.push("shadcn");
		if (project.trpc) packages.push("trpc");
		if (project.authentication === "next-auth") packages.push("nextAuth");
		if (project.database === "prisma") packages.push("prisma");
		if (project.database === "drizzle") packages.push("drizzle");
		if (project.i18n === "next-intl") packages.push("nextIntl");
		if (project.i18n === "next-international")
			packages.push("nextInternational");
		if (project.paymentProvider === "stripe") packages.push("stripe");
		if (project.paymentProvider === "lemon-squeezy")
			packages.push("lemonSqueezy");
		if (project.formatter === "biome") packages.push("biome");
		if (project.formatter === "prettier") packages.push("prettier");

		return {
			appName: project.name ?? cliResults.appName,
			packages,
			databaseProvider:
				(project.databaseProvider as DatabaseProvider) || "sqlite",
			styling: project.styling as CliResults["styling"],
			i18n: project.i18n as CliResults["i18n"],
			paymentProvider: project.paymentProvider as CliResults["paymentProvider"],
			formatter: project.formatter as CliResults["formatter"],
			template: project.template as CliResults["template"],
			flags: {
				...cliResults.flags,
				appRouter: project.appRouter ?? cliResults.flags.appRouter,
				noGit: !project.git || cliResults.flags.noGit,
				noInstall: !project.install || cliResults.flags.noInstall,
				importAlias: project.importAlias ?? cliResults.flags.importAlias,
			},
		};
	} catch (err) {
		// If the user is not calling create-reliverse from an interactive terminal, inquirer will throw
		// an IsTTYError. If this happens, we catch the error, tell the user what has happened,
		// and then continue to run the program with a default Reliverse app.
		if (err instanceof IsTTYError) {
			logger.warn(`
  ${CREATE_RELIVERSE} needs an interactive terminal to provide options`);

			const shouldContinue = await p.confirm({
				message: "Continue scaffolding a default Reliverse app?",
				initialValue: true,
			});

			if (!shouldContinue) {
				logger.info("Exiting...");
				process.exit(0);
			}

			logger.info(
				`Bootstrapping a default Reliverse app in ./${cliResults.appName}`,
			);
		} else {
			throw err;
		}
	}

	return cliResults;
};
