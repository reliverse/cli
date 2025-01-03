import * as p from "@clack/prompts";
import pc from "picocolors";

import { CREATE_RELIVERSE_APP } from "~/app/db/constants.js";
import { relinka } from "~/utils/console.js";

import {
  defaultOptions,
  type AvailablePackages,
  type CliResults,
  type DatabaseProvider,
} from "./opts.js";
import { getUserPkgManager } from "./utils/getUserPkgManager.js";
import { IsTTYError } from "./utils/isTTYError.js";
import { validateAppName } from "./utils/validateAppName.js";
import { validateImportAlias } from "./utils/validateImportAlias.js";

export async function runComposerMode(
  cliResults: CliResults,
): Promise<CliResults> {
  // Explained below why this is in a try/catch block
  try {
    if (process.env["TERM_PROGRAM"]?.toLowerCase().includes("mintty")) {
      relinka(
        "warn",
        `  WARNING: It looks like you are using MinTTY, which is non-interactive. This is most likely because you are
  using Git Bash. If that's that case, please use Git Bash from another terminal, such as Windows Terminal. Alternatively, you
  can provide the arguments from the CLI directly: https://docs.reliverse.org/en/installation#experimental-usage to skip the prompts.`,
      );

      throw new IsTTYError("Non-interactive environment");
    }

    // if --CI flag is set, we are running in CI mode and should not prompt the user
    // const isCI = process.argv.includes("--CI");
    const cliProvidedName = cliResults.appName;

    const pkgManager = getUserPkgManager();

    const project = await p.group(
      {
        ...(!cliProvidedName && {
          name: () =>
            p.text({
              message: "What will your project be called?",
              defaultValue: cliProvidedName,
              validate: validateAppName,
            }),
        }),
        language: () => {
          return p.select({
            message: "Will you be using TypeScript or JavaScript?",
            options: [
              { value: "typescript", label: "TypeScript" },
              { value: "javascript", label: "JavaScript" },
            ],
            initialValue: "typescript",
          });
        },
        _: ({ results }) => {
          if (results.language === "javascript") {
            p.note(pc.redBright("Wrong answer, using TypeScript instead"));
          }
          return undefined;
        },
        styling: () => {
          return p.confirm({
            message: "Will you be using Tailwind CSS for styling?",
          });
        },
        trpc: () => {
          return p.confirm({
            message: "Would you like to use tRPC?",
          });
        },
        authentication: () => {
          return p.select({
            message: "What authentication provider would you like to use?",
            options: [
              { value: "none", label: "None" },
              { value: "next-auth", label: "NextAuth.js" },
              // Maybe later
              // { value: "clerk", label: "Clerk" },
            ],
            initialValue: "none",
          });
        },
        database: () => {
          return p.select({
            message: "What database ORM would you like to use?",
            options: [
              { value: "none", label: "None" },
              { value: "prisma", label: "Prisma" },
              { value: "drizzle", label: "Drizzle" },
            ],
            initialValue: "none",
          });
        },
        framework: () => {
          return p.confirm({
            message: "Would you like to use Next.js App Router?",
            initialValue: true,
          });
        },
        databaseProvider: ({ results }) => {
          if (results.database === "none") return;
          return p.select({
            message: "What database provider would you like to use?",
            options: [
              { value: "sqlite", label: "SQLite (LibSQL)" },
              { value: "mysql", label: "MySQL" },
              { value: "postgres", label: "PostgreSQL" },
              { value: "planetscale", label: "PlanetScale" },
            ],
            initialValue: "sqlite",
          });
        },
        ...(!cliResults.flags.noGit && {
          git: () => {
            return p.confirm({
              message:
                "Should we initialize a Git repository and stage the changes?",
              initialValue: !defaultOptions.flags.noGit,
            });
          },
        }),
        ...(!cliResults.flags.noInstall && {
          install: () => {
            return p.confirm({
              message: `Should we run '${pkgManager}${pkgManager === "yarn" ? `'?` : ` install' for you?`}`,
              initialValue: !defaultOptions.flags.noInstall,
            });
          },
        }),
        importAlias: () => {
          return p.text({
            message: "What import alias would you like to use?",
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
    if (project.styling) packages.push("tailwind");
    if (project.trpc) packages.push("trpc");
    if (project.authentication === "next-auth") packages.push("nextAuth");
    if (project.database === "prisma") packages.push("prisma");
    if (project.database === "drizzle") packages.push("drizzle");

    return {
      appName: project.name ?? cliResults.appName,
      packages,
      databaseProvider:
        (project.databaseProvider as DatabaseProvider) || "sqlite",
      flags: {
        ...cliResults.flags,
        framework: project.framework ?? cliResults.flags.framework,
        noGit: !project.git || cliResults.flags.noGit,
        noInstall: !project.install || cliResults.flags.noInstall,
        importAlias: project.importAlias ?? cliResults.flags.importAlias,
      },
    };
  } catch (err) {
    // If the user is not calling @reliverse/cli from an interactive terminal, inquirer will throw an IsTTYError
    // If this happens, we catch the error, tell the user what has happened, and then continue to run the program with a default Reliverse app
    if (err instanceof IsTTYError) {
      relinka(
        "warn",
        `
  ${CREATE_RELIVERSE_APP} needs an interactive terminal to provide options`,
      );

      const shouldContinue = await p.confirm({
        message: "Continue scaffolding a default Reliverse app?",
        initialValue: true,
      });

      if (!shouldContinue) {
        relinka("info", "Exiting...");
        process.exit(0);
      }

      relinka(
        "info",
        `Bootstrapping a default Reliverse app in ./${cliResults.appName}`,
      );
    } else {
      throw err;
    }
  }

  return cliResults;
}
