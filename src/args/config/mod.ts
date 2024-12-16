import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { DEFAULT_CONFIG, type ReliverseConfig } from "~/types.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { getDefaultReliverseConfig } from "~/utils/rules.js";

export default defineCommand({
  meta: {
    name: "config",
    description: "Generate configuration files in the current directory",
  },
  args: {
    defaults: {
      type: "boolean",
      description: "Generate config with default values",
    },
    rules: {
      type: "boolean",
      description: "Generate reliverse.json file with all codemods",
    },
  },
  run: async ({ args }) => {
    const cwd = getCurrentWorkingDirectory();

    if (args.rules) {
      const configPath = path.join(cwd, "reliverse.json");
      if (await fs.pathExists(configPath)) {
        relinka(
          "error",
          "reliverse.json already exists in the current directory",
        );
        process.exit(1);
      }

      const rules = await getDefaultReliverseConfig("my-app", "user");
      // Create a config that includes both rules and legacy config fields
      const config: ReliverseConfig = {
        ...DEFAULT_CONFIG,
        // Project details
        projectName: rules.projectName,
        projectAuthor: rules.projectAuthor,
        projectDescription: rules.projectDescription,
        projectVersion: rules.projectVersion,
        projectLicense: rules.projectLicense,
        projectRepository: rules.projectRepository,

        // Development preferences
        projectFramework: rules.projectFramework,
        projectFrameworkVersion: rules.projectFrameworkVersion,
        nodeVersion: rules.nodeVersion,
        runtime: rules.runtime,
        projectPackageManager: rules.projectPackageManager,
        monorepo: rules.monorepo,
        preferredLibraries: rules.preferredLibraries,
        codeStyle: {
          ...rules.codeStyle,
          cjsToEsm: true,
          modernize: {
            replaceFs: true,
            replacePath: true,
            replaceHttp: true,
            replaceProcess: true,
            replaceConsole: true,
            replaceEvents: true,
          },
        },

        // Project features
        features: rules.features,

        // Dependencies management
        ignoreDependencies: rules.ignoreDependencies,

        // Config revalidation
        configLastRevalidate: rules.configLastRevalidate,
        configRevalidateFrequency: rules.configRevalidateFrequency,

        // Custom rules
        customRules: rules.customRules,
      };

      try {
        await fs.writeFile(
          configPath,
          JSON.stringify(config, null, 2),
          "utf-8",
        );
        relinka(
          "success",
          "Generated reliverse.json with rules configuration successfully!",
        );
        process.exit(0);
      } catch (error) {
        relinka("error", "Failed to generate config file:", error.toString());
        process.exit(1);
      }
      return;
    }

    const configPath = path.join(cwd, "reliverse.json");
    if (await fs.pathExists(configPath)) {
      relinka(
        "error",
        "reliverse.json already exists in the current directory",
      );
      process.exit(1);
    }

    const config: ReliverseConfig = args.defaults ? DEFAULT_CONFIG : {};

    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
      relinka("success", "Generated reliverse.json successfully!");
      process.exit(0);
    } catch (error) {
      relinka("error", "Failed to generate config file:", error.toString());
      process.exit(1);
    }
  },
});
