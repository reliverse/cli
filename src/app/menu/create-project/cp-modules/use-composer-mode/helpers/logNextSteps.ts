import { relinka } from "@reliverse/relinka";

import { DEFAULT_APP_NAME } from "~/app/constants.js";
import { type InstallerOptions } from "~/app/menu/create-project/cp-modules/use-composer-mode/opts.js";
import { getUserPkgManager } from "~/utils/dependencies/getUserPkgManager.js";

import { isInsideGitRepo, isRootGitRepo } from "./git.js";

// This logs the next steps that the user should take in order to advance the project
export const logNextSteps = async ({
  projectName = DEFAULT_APP_NAME,
  packages,
  noInstall,
  projectDir,
  databaseProvider,
}: Pick<
  InstallerOptions,
  | "projectName"
  | "packages"
  | "noInstall"
  | "projectDir"
  | "framework"
  | "databaseProvider"
>) => {
  const pkgManager = await getUserPkgManager();

  relinka("info", "Next steps:");
  if (projectName !== ".") {
    relinka("info", `  cd ${projectName}`);
  }
  if (noInstall) {
    // To reflect yarn's default behavior of installing packages when no additional args provided
    if (pkgManager.packageManager === "yarn") {
      relinka("info", `  ${pkgManager.packageManager}`);
    } else {
      relinka("info", `  ${pkgManager.packageManager} install`);
    }
  }

  if (["postgres", "mysql"].includes(databaseProvider)) {
    relinka(
      "info",
      "  Start up a database, if needed using './start-database.sh'",
    );
  }

  if (packages?.prisma.inUse || packages?.drizzle.inUse) {
    if (["npm", "bun"].includes(pkgManager.packageManager)) {
      relinka("info", `  ${pkgManager.packageManager} run db:push`);
    } else {
      relinka("info", `  ${pkgManager.packageManager} db:push`);
    }
  }

  if (packages?.nextAuth.inUse) {
    relinka(
      "info",
      "  Fill in your .env with necessary values. See https://docs.reliverse.org/en/usage/first-steps for more info.",
    );
  }

  if (["npm", "bun"].includes(pkgManager.packageManager)) {
    relinka("info", `  ${pkgManager.packageManager} run dev`);
  } else {
    relinka("info", `  ${pkgManager.packageManager} dev`);
  }

  if (!(await isInsideGitRepo(projectDir)) && !isRootGitRepo(projectDir)) {
    relinka("info", "  git init");
  }
  relinka("info", "  git commit -m 'initial commit'");
};
