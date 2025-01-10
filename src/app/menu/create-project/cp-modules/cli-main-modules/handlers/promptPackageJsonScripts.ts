import { msg, multiselectPrompt } from "@reliverse/prompts";
import { execa } from "execa";
import pc from "picocolors";

import { checkScriptExists } from "~/app/menu/create-project/cp-impl.js";
import { relinka } from "~/utils/loggerRelinka.js";

export type ScriptStatus = {
  dbPush: boolean;
  dbGenerate: boolean;
  dbMigrate: boolean;
  dbSeed: boolean;
  check: boolean;
};

type ScriptOption = {
  label: string;
  value: string;
  hint: string;
};

const SCRIPT_DEFINITIONS = {
  latest: {
    label: "Update dependencies to latest version",
    hint: pc.redBright(
      "may break project if dependencies have critical changes",
    ),
  },
  dbGenerate: {
    label: "Generate database schema files",
    hint: "recommended first step for database setup",
  },
  dbMigrate: {
    label: "Apply database migrations",
    hint: "apply pending migrations",
  },
  dbPush: {
    label: "Initialize database schema",
    hint: "push schema to database",
  },
  dbSeed: {
    label: "Populate database with initial data",
    hint: "add sample data [🚨 Experimental]",
  },
  check: {
    label: "Run all code quality checks",
    hint: "includes typecheck, lint, and format",
  },
  typecheck: {
    label: "Run type checking",
    hint: "verify types",
  },
  lint: {
    label: "Run linting",
    hint: "check code style",
  },
  format: {
    label: "Run formatting",
    hint: "fix code style",
  },
} as const;

const BOOTSTRAP_SCRIPTS = ["latest", "db:push", "db:seed", "check"];
const DEFAULT_BOOTSTRAP_SCRIPTS = ["db:push", "check"];

export async function promptPackageJsonScripts(
  projectPath: string,
  shouldRunDbPush: boolean,
  isProjectBootstrapping: boolean,
): Promise<ScriptStatus> {
  const status: ScriptStatus = {
    dbPush: shouldRunDbPush,
    dbGenerate: false,
    dbMigrate: false,
    dbSeed: false,
    check: false,
  };

  // Check for available scripts with correct script names
  const scripts = {
    latest: await checkScriptExists(projectPath, "latest"),
    dbPush: await checkScriptExists(projectPath, "db:push"),
    dbSeed: await checkScriptExists(projectPath, "db:seed"),
    dbGenerate: await checkScriptExists(projectPath, "db:generate"),
    dbMigrate: await checkScriptExists(projectPath, "db:migrate"),
    check: await checkScriptExists(projectPath, "check"),
    typecheck: await checkScriptExists(projectPath, "typecheck"),
    lint: await checkScriptExists(projectPath, "lint"),
    format: await checkScriptExists(projectPath, "format"),
  };

  const scriptOptions: ScriptOption[] = [];

  // Add scripts based on availability and mode
  Object.entries(scripts).forEach(([key, exists]) => {
    if (!exists) return;

    const scriptKey = key as keyof typeof SCRIPT_DEFINITIONS;
    const def = SCRIPT_DEFINITIONS[scriptKey];

    if (!def) return;

    // Convert internal key to package.json script name
    const scriptName =
      key === "dbPush"
        ? "db:push"
        : key === "dbSeed"
          ? "db:seed"
          : key === "dbGenerate"
            ? "db:generate"
            : key === "dbMigrate"
              ? "db:migrate"
              : key;

    if (isProjectBootstrapping) {
      if (BOOTSTRAP_SCRIPTS.includes(scriptName)) {
        scriptOptions.push({
          label: def.label,
          value: scriptName,
          hint: def.hint,
        });
      }
    } else {
      if (key === "check") {
        scriptOptions.push({
          label: def.label,
          value: scriptName,
          hint: def.hint,
        });
      } else if (
        !scripts.check ||
        !["typecheck", "lint", "format"].includes(key)
      ) {
        scriptOptions.push({
          label: def.label,
          value: scriptName,
          hint: def.hint,
        });
      }
    }
  });

  if (scriptOptions.length > 0) {
    isProjectBootstrapping && msg({ type: "M_BAR" });
    const selectedScripts = await multiselectPrompt({
      title: "Select detected package.json scripts to run",
      content: "Choose which setup and maintenance scripts to execute",
      options: scriptOptions,
      defaultValue: isProjectBootstrapping ? DEFAULT_BOOTSTRAP_SCRIPTS : [],
      displayInstructions: true,
    });

    // Execute selected scripts in the correct order
    for (const script of selectedScripts) {
      try {
        // Update status based on script execution
        const statusKey = script.replace("db:", "db") as keyof ScriptStatus;
        if (statusKey in status) {
          status[statusKey] = true;
        }

        relinka("info", `Running ${script}...`);
        await execa("bun", [script], {
          cwd: projectPath,
          stdio: "inherit",
        });
        msg({ type: "M_BAR" });
      } catch (error) {
        relinka(
          "error",
          `Error running ${script}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  return status;
}
