import { DEFAULT_APP_NAME } from "~/app/db/constants.js";

import { dbContainerInstaller } from "./installers/dbContainer.js";
import { drizzleInstaller } from "./installers/drizzle.js";
import { envVariablesInstaller } from "./installers/envVars.js";
import { dynamicEslintInstaller } from "./installers/eslint.js";
import { nextAuthInstaller } from "./installers/nextAuth.js";
import { prismaInstaller } from "./installers/prisma.js";
import { tailwindInstaller } from "./installers/tailwind.js";
import { trpcInstaller } from "./installers/trpc.js";
import { type PackageManager } from "./utils/getUserPkgManager.js";

// Turning this into a const allows the list to be iterated over for programmatically creating prompt options
// Should increase extensibility in the future
export const availablePackages = [
  "nextAuth",
  "prisma",
  "drizzle",
  "tailwind",
  "trpc",
  "envVariables",
  "eslint",
  "dbContainer",
] as const;
export type AvailablePackages = (typeof availablePackages)[number];

export const databaseProviders = [
  "mysql",
  "postgres",
  "sqlite",
  "planetscale",
] as const;
export type DatabaseProvider = (typeof databaseProviders)[number];

export type InstallerOptions = {
  projectDir: string;
  pkgManager: PackageManager;
  noInstall: boolean;
  packages?: PkgInstallerMap;
  framework?: boolean;
  projectName: string;
  scopedAppName: string;
  databaseProvider: DatabaseProvider;
};

export type Installer = (opts: InstallerOptions) => void;

export type PkgInstallerMap = Record<
  AvailablePackages,
  {
    inUse: boolean;
    installer: Installer;
  }
>;

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
  tailwind: {
    inUse: packages.includes("tailwind"),
    installer: tailwindInstaller,
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
});

export type CliFlags = {
  noGit: boolean;
  noInstall: boolean;
  default: boolean;
  importAlias: string;

  /** @internal Used in CI. */
  CI: boolean;
  /** @internal Used in CI. */
  tailwind: boolean;
  /** @internal Used in CI. */
  trpc: boolean;
  /** @internal Used in CI. */
  prisma: boolean;
  /** @internal Used in CI. */
  drizzle: boolean;
  /** @internal Used in CI. */
  nextAuth: boolean;
  /** @internal Used in CI. */
  framework: boolean;
  /** @internal Used in CI. */
  dbProvider: DatabaseProvider;
};

export const defaultOptions: CliResults = {
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
    framework: false,
    dbProvider: "sqlite",
  },
  databaseProvider: "sqlite",
};

export type CliResults = {
  appName: string;
  packages: AvailablePackages[];
  flags: CliFlags;
  databaseProvider: DatabaseProvider;
};
