import { envVariablesInstaller } from "../installers/envVars.js";
import { nextAuthInstaller } from "../installers/nextAuth.js";
import { prismaInstaller } from "../installers/prisma.js";
import { tailwindInstaller } from "../installers/tailwind.js";
import { trpcInstaller } from "../installers/trpc.js";
import type { PackageManager } from "../utils/getUserPkgManager.js";
import { biomeInstaller } from "./biome.js";
import { componentsInstaller } from "./components.js";
import { dbContainerInstaller } from "./dbContainer.js";
import { drizzleInstaller } from "./drizzle.js";
import { dynamicEslintInstaller } from "./eslint.js";
import { lemonSqueezyInstaller } from "./lemonSqueezy.js";
import { nextInternationalInstaller } from "./nextInternational.js";
import { nextIntlInstaller } from "./nextIntl.js";
import { othersInstaller } from "./others.js";
import { prettierInstaller } from "./prettier.js";
import { shadcnInstaller } from "./shadcn.js";
import { stripeInstaller } from "./stripe.js";
import { testingInstaller } from "./testing.js";

// Turning this into a const allows the list to be iterated over for programatically
// creating prompt options. This is should increase extensability in the future.
export const availablePackages = [
	"nextAuth",
	"prisma",
	"drizzle",
	"prettier",
	"biome",
	"tailwind",
	"shadcn",
	"trpc",
	"envVariables",
	"eslint",
	"dbContainer",
	"nextIntl",
	"nextInternational",
	"stripe",
	"lemonSqueezy",
	"components",
	"testing",
	"others",
] as const;
export type AvailablePackages = (typeof availablePackages)[number];

export const databaseProviders = [
	"mysql",
	"postgres",
	"sqlite",
	"planetscale",
] as const;
export type DatabaseProvider = (typeof databaseProviders)[number];

export const formatterProvider = ["prettier", "biome"] as const;
export type Formatter = (typeof formatterProvider)[number];

export interface InstallerOptions {
	projectDir: string;
	pkgManager: PackageManager;
	noInstall: boolean;
	packages?: PkgInstallerMap;
	appRouter?: boolean;
	projectName: string;
	scopedAppName: string;
	databaseProvider: DatabaseProvider;
}

export type Installer = (opts: InstallerOptions) => void;

export type PkgInstallerMap = {
	[pkg in AvailablePackages]: {
		inUse: boolean;
		installer: Installer;
	};
};

export const buildPkgInstallerMap = (
	packages: AvailablePackages[],
	databaseProvider: DatabaseProvider,
): PkgInstallerMap => ({
	nextAuth: {
		inUse: packages.includes("nextAuth"),
		installer: nextAuthInstaller,
	},
	prisma: {
		inUse: packages.includes("prisma"),
		installer: prismaInstaller,
	},
	drizzle: {
		inUse: packages.includes("drizzle"),
		installer: drizzleInstaller,
	},
	prettier: {
		inUse: packages.includes("prettier"),
		installer: prettierInstaller,
	},
	biome: {
		inUse: packages.includes("biome"),
		installer: biomeInstaller,
	},
	tailwind: {
		inUse: packages.includes("tailwind"),
		installer: tailwindInstaller,
	},
	shadcn: {
		inUse: packages.includes("shadcn"),
		installer: shadcnInstaller,
	},
	trpc: {
		inUse: packages.includes("trpc"),
		installer: trpcInstaller,
	},
	dbContainer: {
		inUse: ["mysql", "postgres"].includes(databaseProvider),
		installer: dbContainerInstaller,
	},
	envVariables: {
		inUse: true,
		installer: envVariablesInstaller,
	},
	eslint: {
		inUse: true,
		installer: dynamicEslintInstaller,
	},
	nextIntl: {
		inUse: packages.includes("nextIntl"),
		installer: nextIntlInstaller,
	},
	nextInternational: {
		inUse: packages.includes("nextInternational"),
		installer: nextInternationalInstaller,
	},
	stripe: {
		inUse: packages.includes("nextIntl"),
		installer: stripeInstaller,
	},
	lemonSqueezy: {
		inUse: packages.includes("lemonSqueezy"),
		installer: lemonSqueezyInstaller,
	},
	components: {
		inUse: packages.includes("components"),
		installer: componentsInstaller,
	},
	testing: {
		inUse: packages.includes("testing"),
		installer: testingInstaller,
	},
	others: {
		inUse: packages.includes("others"),
		installer: othersInstaller,
	},
});
