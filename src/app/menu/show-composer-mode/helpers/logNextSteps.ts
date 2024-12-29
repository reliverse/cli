import { DEFAULT_APP_NAME } from "~/app/db/constants.js";
import { relinka } from "~/utils/console.js";

import { type InstallerOptions } from "../opts.js";
import { getUserPkgManager } from "../utils/getUserPkgManager.js";
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
  const pkgManager = getUserPkgManager();

  relinka("info", "Next steps:");
  if (projectName !== ".") {
    relinka("info", `  cd ${projectName}`);
  }
  if (noInstall) {
    // To reflect yarn's default behavior of installing packages when no additional args provided
    if (pkgManager === "yarn") {
      relinka("info", `  ${pkgManager}`);
    } else {
      relinka("info", `  ${pkgManager} install`);
    }
  }

  if (["postgres", "mysql"].includes(databaseProvider)) {
    relinka(
      "info",
      "  Start up a database, if needed using './start-database.sh'",
    );
  }

  if (packages?.prisma.inUse || packages?.drizzle.inUse) {
    if (["npm", "bun"].includes(pkgManager)) {
      relinka("info", `  ${pkgManager} run db:push`);
    } else {
      relinka("info", `  ${pkgManager} db:push`);
    }
  }

  if (packages?.nextAuth.inUse) {
    relinka(
      "info",
      "  Fill in your .env with necessary values. See https://docs.reliverse.org/en/usage/first-steps for more info.",
    );
  }

  if (["npm", "bun"].includes(pkgManager)) {
    relinka("info", `  ${pkgManager} run dev`);
  } else {
    relinka("info", `  ${pkgManager} dev`);
  }

  if (!(await isInsideGitRepo(projectDir)) && !isRootGitRepo(projectDir)) {
    relinka("info", "  git init");
  }
  relinka("info", "  git commit -m 'initial commit'");
};
