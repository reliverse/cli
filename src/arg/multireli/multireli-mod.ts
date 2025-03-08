// [isDev example]:
// - `bun dev:multireli`
// - `bun dev:multireli --ts`
// - `bun dev:multireli --jsonc project1 project2 project3`

import { defineCommand } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { parseJSONC } from "confbox";
import { execaCommand } from "execa";
import fs from "fs-extra";
import { jsonrepair } from "jsonrepair";
import { loadFile, writeFile, builders } from "magicast";
import path from "pathe";

import { UNKNOWN_VALUE } from "~/libs/sdk/constants.js";
import { generateReliverseConfig } from "~/utils/reliverseConfig.js";

import {
  downloadFileFromGitHub,
  ensureEnvCacheDir,
  getEnvCacheDir,
  getEnvCachePath,
  logVerbose,
  type GenCfg,
  type GenCfgJsonc,
} from "./multireli-impl.js";

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
    nocache: {
      type: "boolean",
      description: "Disable caching of downloaded .env.example files",
      default: false,
    },
    fresh: {
      type: "boolean",
      description:
        "Redownload all cached .env.example files, ignoring existing cache",
      default: false,
    },
    typesPath: {
      type: "string",
      description: "Custom path to type definitions for TypeScript configs",
      default: "../src/libs/config/config-main.js",
    },
    _: {
      description: "Names of projects to generate configs for",
      required: false,
    },
  },
  run: async ({ args }) => {
    // Determine whether we use JSONC or TS
    const useJsonc = !args.ts;
    // Projects specified from CLI
    const projectNames = args._ || [];
    // If user explicitly passed --dev, that overrides environment checks
    const devFlag = args.dev === true;
    // Final determination whether we're in dev mode
    const isDev = devFlag || process.env.NODE_ENV === "development";

    // Check whether we should use cache or not
    const cacheFlag = !args.nocache;
    // Check if we're redownloading env files
    const freshFlag = args.fresh === true;

    // Quick logs
    logVerbose("Parsed arguments:", args);
    logVerbose("Project names:", projectNames);
    logVerbose("Format:", useJsonc ? "JSONC" : "TypeScript");
    logVerbose("Dev mode:", isDev);
    logVerbose("Using cache:", cacheFlag);
    logVerbose("Fresh mode:", freshFlag);

    // If fresh mode is enabled, let user know
    if (freshFlag) {
      relinka(
        "info",
        "Fresh mode enabled: Will redownload all cached .env.example files",
      );
    }

    // Get current working directory
    const cwd = process.cwd();

    // Create 'multireli' folder if it doesn't exist
    const multireliFolderPath = path.join(cwd, "multireli");
    await fs.ensureDir(multireliFolderPath);

    // Check for and generate gen.cfg file if it doesn't exist
    const genCfgFileName = useJsonc ? "gen.cfg.jsonc" : "gen.cfg.ts";
    const genCfgPath = path.join(multireliFolderPath, genCfgFileName);
    const genCfgExists = await fs.pathExists(genCfgPath);

    // Check if the other format already exists to prevent conflicts
    const oppositeFormatFileName = useJsonc ? "gen.cfg.ts" : "gen.cfg.jsonc";
    const oppositeFormatPath = path.join(
      multireliFolderPath,
      oppositeFormatFileName,
    );
    const oppositeFormatExists = await fs.pathExists(oppositeFormatPath);

    // Throw error if trying to generate one format when the other exists
    if (!genCfgExists && oppositeFormatExists) {
      relinka(
        "error",
        `Cannot generate ${genCfgFileName} when ${oppositeFormatFileName} already exists. ` +
          `Please delete ${oppositeFormatFileName} first or use the appropriate format flag.`,
      );
      // Exit process gracefully without showing stack trace
      process.exit(1);
    }

    let genCfgData: GenCfg[] = [];

    // Check for mixed configuration formats in the directory
    const existingFiles = await fs.readdir(multireliFolderPath);
    const hasJsoncFiles = existingFiles.some(
      (file) => file.endsWith(".jsonc") && file !== "gen.cfg.jsonc",
    );
    const hasTsFiles = existingFiles.some(
      (file) => file.endsWith(".ts") && file !== "gen.cfg.ts",
    );

    // Don't allow mixing of TS and JSONC project files
    if ((useJsonc && hasTsFiles) || (!useJsonc && hasJsoncFiles)) {
      const currentFormat = useJsonc ? "JSONC" : "TypeScript";
      const existingFormat = useJsonc ? "TypeScript" : "JSONC";
      relinka(
        "error",
        `Cannot generate ${currentFormat} files when ${existingFormat} files already exist in the multireli folder. ` +
          `Please use --${useJsonc ? "ts" : "jsonc"} flag to match your existing configuration format.`,
      );
      // Exit process gracefully without showing stack trace
      process.exit(1);
    }

    if (!genCfgExists) {
      relinka("info", `Generating ${genCfgFileName} file...`);

      // Create content for the gen.cfg file
      let genCfgContent = "";
      if (useJsonc) {
        // JSONC format
        genCfgContent = `{
  // @reliverse/cli multireli mode
  // 👉 ${isDev ? "`bun dev:multireli`" : "`reliverse multireli`"}
  "genCfg": [
    {
      "projectName": "project1",
      "projectTemplate": "blefnk/relivator-nextjs-template",
      "getEnvExample": true
    },
    {
      "projectName": "project2",
      "projectTemplate": "blefnk/relivator-nextjs-template",
      "getEnvExample": true
    },
    {
      "projectName": "project3",
      "projectTemplate": "blefnk/relivator-nextjs-template",
      "getEnvExample": true
    }
  ]
}`;
      } else {
        // TypeScript format
        genCfgContent = `// @reliverse/cli multireli mode
// 👉 ${isDev ? "`bun dev:multireli`" : "`reliverse multireli`"}

type GenCfg = {
  projectName: string;
  projectTemplate: string;
  getEnvExample: boolean;
  projectPath?: string;
};

export const genCfg: GenCfg[] = [
  {
    projectName: "project1",
    projectTemplate: "blefnk/relivator-nextjs-template",
    getEnvExample: true,
  },
  {
    projectName: "project2",
    projectTemplate: "blefnk/relivator-nextjs-template",
    getEnvExample: true,
  },
  {
    projectName: "project3",
    projectTemplate: "blefnk/relivator-nextjs-template",
    getEnvExample: true,
  },
];
`;
      }

      // Write the gen.cfg file
      if (useJsonc) {
        await fs.writeFile(genCfgPath, genCfgContent);
      } else {
        // For TypeScript files, try magicast for safer formatting
        try {
          const mod = builders.raw(genCfgContent);
          await writeFile(mod, genCfgPath);
        } catch {
          // Fallback to direct write
          await fs.writeFile(genCfgPath, genCfgContent);
        }
      }

      relinka("success", `Generated ${genCfgFileName} in multireli folder`);

      // Default data for new file
      genCfgData = [
        {
          projectName: "project1",
          projectTemplate: "blefnk/relivator-nextjs-template",
          getEnvExample: true,
        },
        {
          projectName: "project2",
          projectTemplate: "blefnk/relivator-nextjs-template",
          getEnvExample: true,
        },
        {
          projectName: "project3",
          projectTemplate: "blefnk/relivator-nextjs-template",
          getEnvExample: true,
        },
      ];

      // If no project names were specified, exit after creating the gen.cfg file
      if (projectNames.length === 0) {
        relinka(
          "info",
          "No project names specified. Only generated the config file.",
        );
        return;
      }
    } else {
      relinka("info", `Using existing ${genCfgFileName} file`);

      try {
        // Read and parse gen.cfg file
        if (useJsonc) {
          const fileContent = await fs.readFile(genCfgPath, "utf-8");
          try {
            // Parse JSONC
            const parsedData = parseJSONC(fileContent) as GenCfgJsonc;
            genCfgData = parsedData.genCfg || [];
          } catch (parseError) {
            // Attempt to repair the JSON
            relinka(
              "warn",
              `JSONC parsing failed, attempting to repair the file: ${
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError)
              }`,
            );

            try {
              // Remove comments before running jsonrepair
              const commentStrippedContent = fileContent
                .replace(/\/\/.*$/gm, "")
                .replace(/\/\*[\s\S]*?\*\//g, "");

              // Repair JSON
              const repairedJson = jsonrepair(commentStrippedContent);
              const parsedData = JSON.parse(repairedJson) as GenCfgJsonc;
              genCfgData = parsedData.genCfg || [];

              relinka("success", "JSON repaired successfully");
            } catch (repairError) {
              relinka(
                "error",
                `Failed to repair JSON: ${
                  repairError instanceof Error
                    ? repairError.message
                    : String(repairError)
                }`,
              );
              throw new Error(
                "Unable to parse or repair the JSON configuration file",
              );
            }
          }
        } else {
          // TypeScript - use magicast
          try {
            const mod = await loadFile(genCfgPath);
            if (mod.exports && mod.exports["genCfg"]) {
              // Convert the result to a plain object
              genCfgData = JSON.parse(
                JSON.stringify(mod.exports["genCfg"]),
              ) as GenCfg[];
            } else {
              relinka(
                "warn",
                "The gen.cfg.ts file does not export a 'genCfg' array",
              );
              genCfgData = [];
            }
          } catch (error) {
            relinka(
              "error",
              `Error loading TypeScript file: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            genCfgData = [];
          }
        }

        logVerbose("Loaded gen.cfg data:", genCfgData);
      } catch (error) {
        relinka(
          "error",
          `Error parsing ${genCfgFileName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        relinka("warn", "Continuing with empty configuration");
        genCfgData = [];
      }
    }

    // Determine which projects to process
    let projectsToProcess: string[] = [];

    if (projectNames.length > 0) {
      // Filter only projects present in gen.cfg if there's a match
      const matchingProjects = projectNames.filter((name) =>
        genCfgData.some((cfg) => cfg.projectName === name),
      );

      if (matchingProjects.length > 0) {
        projectsToProcess = matchingProjects;
        relinka(
          "info",
          `Found ${matchingProjects.length} matching projects in ${genCfgFileName}`,
        );
      } else {
        // If no matching config, process the user-specified projects anyway
        projectsToProcess = projectNames;
      }
    } else if (genCfgExists) {
      // If no projects specified but gen.cfg exists, process all from gen.cfg
      projectsToProcess = genCfgData.map((cfg) => cfg.projectName);
      relinka(
        "info",
        `Processing all ${projectsToProcess.length} projects from ${genCfgFileName}`,
      );
    }

    // If no projects remain to process, exit
    if (projectsToProcess.length === 0) {
      relinka(
        "info",
        "No projects to process. Either specify project names or populate the gen.cfg file.",
      );
      return;
    }

    // Ensure env cache directory exists if needed
    if (
      cacheFlag &&
      genCfgData.some((cfg) => cfg.getEnvExample && cfg.projectTemplate)
    ) {
      await ensureEnvCacheDir();
      logVerbose(`Env cache directory: ${getEnvCacheDir()}`);
    }

    // Track operation counts
    let generatedCount = 0;
    let envFilesDownloaded = 0;
    let envFilesFromCache = 0;
    let envFilesRefreshed = 0;

    // Generate config for each project
    for (const projectName of projectsToProcess) {
      relinka("info-verbose", `Generating config for project: ${projectName}`);

      try {
        // Find matching project configuration
        const projectConfig = genCfgData.find(
          (cfg) => cfg.projectName === projectName,
        );
        logVerbose(`Found config for ${projectName}:`, projectConfig);

        // Check if we need to retrieve .env.example
        if (projectConfig?.getEnvExample && projectConfig?.projectTemplate) {
          const cachePath = getEnvCachePath(projectConfig.projectTemplate);
          const cacheExists = cacheFlag && (await fs.pathExists(cachePath));

          if (cacheExists && !freshFlag) {
            relinka(
              "info",
              `Using cached .env.example for ${projectName} from ${projectConfig.projectTemplate}`,
            );
            // Copy cached env file
            const envFilePath = path.join(
              multireliFolderPath,
              `${projectName}.env`,
            );
            await fs.copy(cachePath, envFilePath);
            relinka("success", `Created ${projectName}.env from cache`);
            envFilesFromCache++;
          } else {
            // Possibly refreshing or first-time download
            const isRefreshing = freshFlag && cacheExists;

            if (isRefreshing) {
              relinka(
                "info",
                `Refreshing .env.example for ${projectName} from ${projectConfig.projectTemplate}`,
              );
            } else {
              relinka(
                "info",
                `Downloading .env.example for ${projectName} from ${projectConfig.projectTemplate}`,
              );
            }

            const envContent = await downloadFileFromGitHub(
              projectConfig.projectTemplate,
              ".env.example",
              "main",
              cacheFlag,
              freshFlag,
            );

            if (envContent) {
              const envFilePath = path.join(
                multireliFolderPath,
                `${projectName}.env`,
              );
              await fs.writeFile(envFilePath, envContent);

              if (isRefreshing) {
                relinka("success", `Refreshed and saved ${projectName}.env`);
                envFilesRefreshed++;
              } else {
                relinka("success", `Downloaded and saved ${projectName}.env`);
                envFilesDownloaded++;
              }
            } else {
              relinka(
                "warn",
                `Could not download .env.example for ${projectName}`,
              );
            }
          }
        }

        // Construct final config filename
        const configFileName = useJsonc
          ? `${projectName}.jsonc`
          : `${projectName}.ts`;
        const configPath = path.join(multireliFolderPath, configFileName);

        // Check if config file already exists
        const fileExists = await fs.pathExists(configPath);
        logVerbose(`File ${configPath} already exists: ${fileExists}`);

        // Skip if it already exists
        if (fileExists) {
          relinka(
            "warn",
            `Skipping ${projectName} - file already exists: ${configFileName}`,
          );
          continue;
        }

        // Some defaults
        const githubUsername = UNKNOWN_VALUE;
        // For TS configs in dev mode, skip any installation prompts
        const skipInstallPrompt = !useJsonc && isDev;

        // Custom path to the types
        let customTypeImportPath: string | undefined;
        if (!useJsonc && isDev) {
          // Use the value from typesPath flag if provided
          customTypeImportPath = args.typesPath;
        }

        logVerbose("Using custom type import path:", customTypeImportPath);

        // Generate the actual config file
        await generateReliverseConfig({
          projectName,
          frontendUsername: UNKNOWN_VALUE,
          deployService: "vercel",
          primaryDomain: `https://${projectName}.vercel.app`,
          projectPath: projectConfig?.projectPath || cwd,
          githubUsername,
          isDev,
          customOutputPath: multireliFolderPath,
          customFilename: configFileName,
          skipInstallPrompt,
          ...(customTypeImportPath
            ? { customPathToTypes: customTypeImportPath }
            : {}),
          // Override project config fields
          ...(projectConfig?.projectTemplate
            ? { projectTemplate: projectConfig.projectTemplate }
            : {}),
        });

        relinka("success", `Generated ${configFileName} in multireli folder`);
        generatedCount++;
      } catch (error) {
        relinka(
          "error",
          `Failed to generate config for ${projectName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Summaries
    if (
      generatedCount > 0 ||
      envFilesDownloaded > 0 ||
      envFilesFromCache > 0 ||
      envFilesRefreshed > 0
    ) {
      if (generatedCount > 0) {
        relinka(
          "success",
          `Generated ${generatedCount} configs in the multireli folder.`,
        );
      }
      if (envFilesDownloaded > 0) {
        relinka(
          "success",
          `Downloaded ${envFilesDownloaded} .env files from templates.`,
        );
      }
      if (envFilesFromCache > 0) {
        relinka("success", `Used ${envFilesFromCache} .env files from cache.`);
      }
      if (envFilesRefreshed > 0) {
        relinka(
          "success",
          `Refreshed ${envFilesRefreshed} .env files from templates.`,
        );
      }
    } else {
      relinka("info", "No new files were generated.");
    }

    // For dev environment, copy schema.json and run biome check
    if (isDev) {
      await fs.copy(
        path.join(cwd, "schema.json"),
        path.join(multireliFolderPath, "schema.json"),
      );
      await execaCommand("bunx biome check --write .", {
        cwd: multireliFolderPath,
        stdio: "inherit",
      });
    }
  },
});
