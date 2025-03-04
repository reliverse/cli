// 👉 `bun src/main.ts multireli --dev --jsonc project1 project2 project3`

import { defineCommand } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { execaCommand } from "execa";
import fs from "fs-extra";
import path from "pathe";

import { generateReliverseConfig } from "~/utils/reliverseConfig.js";

const verbose = false;

/**
 * Generates reliverse config files for multiple projects
 */
export default defineCommand({
  meta: {
    name: "multireli",
    description: "Generate reliverse config files for multiple projects",
    hidden: true,
  },
  args: {
    ts: {
      type: "boolean",
      description: "Generate TypeScript config files (default is JSONC)",
      default: false,
    },
    dev: {
      type: "boolean",
      description: "Generate configs in development mode",
      default: false,
    },
    jsonc: {
      type: "boolean",
      description: "Generate JSONC config files (default)",
      default: true,
    },
    _: {
      description: "Names of projects to generate configs for",
      required: true,
    },
  },
  run: async ({ args }) => {
    const useJsonc = !args.ts; // Use TS if --ts flag is present, otherwise default to JSONC
    const projectNames = args._ || [];
    const forceDev = args.dev === true;
    const isDev = forceDev || process.env.NODE_ENV === "development";

    if (verbose) {
      console.log("Debug - Parsed arguments:", JSON.stringify(args));
      console.log("Debug - Project names:", projectNames);
      console.log("Debug - Format:", useJsonc ? "JSONC" : "TypeScript");
      console.log("Debug - Dev mode:", forceDev ? "Yes" : "No");
    }

    if (projectNames.length === 0) {
      relinka("error", "Error: No project names provided.");
      relinka(
        "error",
        "Usage: reliverse multireli [--dev] [--jsonc|--ts] project1 project2 project3 ...",
      );
      process.exit(1);
    }

    // Get current working directory
    const cwd = process.cwd();

    // Create 'reli' folder if it doesn't exist
    const reliFolderPath = path.join(cwd, "reli");
    await fs.ensureDir(reliFolderPath);

    // Track how many configs we actually generated
    let generatedCount = 0;

    // Generate config for each project
    for (const projectName of projectNames) {
      relinka("info-verbose", `Generating config for project: ${projectName}`);

      try {
        // Determine config file path (in the reli folder)
        const configFileName = useJsonc
          ? `${projectName}.jsonc`
          : `${projectName}.ts`;
        const configPath = path.join(reliFolderPath, configFileName);

        // Debug: Check if a file already exists
        const fileExists = await fs.pathExists(configPath);
        if (verbose) {
          console.log(
            `Debug - File ${configPath} already exists: ${fileExists}`,
          );
        }

        // Skip if file already exists
        if (fileExists) {
          relinka(
            "warn",
            `Skipping ${projectName} - file already exists: ${configFileName}`,
          );
          continue;
        }

        // Set the development mode - either from the flag or from NODE_ENV
        const githubUsername = "unknown";

        if (!useJsonc && !isDev) {
          relinka(
            "warn",
            "Creating TypeScript configs in non-dev mode will require '@reliverse/config' package.",
          );
        }

        // For TypeScript configs in dev mode, we'll use skipInstallPrompt to avoid the installation prompt
        const skipInstallPrompt = !useJsonc && isDev;

        // For TypeScript configs, simulate tests-runtime environment to use local import paths
        const effectiveProjectPath =
          !useJsonc && isDev
            ? cwd // Make sure path.dirname(configPath) === process.cwd() for the isTestsRuntimeDir check
            : cwd;

        // For TypeScript configs in dev mode, determine the correct import path
        let customTypeImportPath: string | undefined;
        if (!useJsonc && isDev) {
          // When running from the CLI tool in the reli folder, use this relative path to point to the schema
          customTypeImportPath = "../src/utils/libs/config/schemaConfig.js";
        }

        if (verbose) {
          console.log(
            "Debug - Using custom type import path:",
            customTypeImportPath,
          );
        }

        // Generate config directly to the target file using the new parameters
        await generateReliverseConfig({
          projectName,
          frontendUsername: "unknown",
          deployService: "vercel",
          primaryDomain: `https://${projectName}.vercel.app`,
          projectPath: effectiveProjectPath,
          githubUsername,
          isDev,
          customOutputPath: reliFolderPath,
          customFilename: configFileName,
          skipInstallPrompt,
          ...(customTypeImportPath
            ? { customPathToTypes: customTypeImportPath }
            : {}),
        });

        relinka("success", `Generated ${configFileName} in reli folder`);
        generatedCount++;
      } catch (error) {
        relinka(
          "error",
          `Failed to generate config for ${projectName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    relinka(
      "success",
      `Generated ${generatedCount} configs in the reli folder.`,
    );

    if (isDev) {
      await fs.copy(
        path.join(cwd, "schema.json"),
        path.join(reliFolderPath, "schema.json"),
      );
      await execaCommand("bunx biome check --write .", {
        cwd: reliFolderPath,
        stdio: "inherit",
      });
    }
  },
});
