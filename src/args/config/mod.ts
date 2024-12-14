import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { DEFAULT_CONFIG, type ReliverseConfig } from "~/types/config.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

export default defineCommand({
  meta: {
    name: "config",
    description: "Generate a reliverse.json file in the current directory",
  },
  args: {
    defaults: {
      type: "boolean",
      description: "Generate config with default values",
    },
  },
  run: async ({ args }) => {
    const cwd = getCurrentWorkingDirectory();
    const configPath = path.join(cwd, "reliverse.json");

    if (await fs.pathExists(configPath)) {
      relinka(
        "error",
        "reliverse.json already exists in the current directory",
      );
      process.exit(1);
    }

    const config: ReliverseConfig = args.defaults
      ? DEFAULT_CONFIG
      : {
          shouldDeploy: false,
          shouldInstallDependencies: true,
          shouldInitGit: true,
          shouldUseI18n: true,
          shouldRunDbScripts: true,
          defaultDeploymentService: "Vercel",
          defaultTemplate: "",
          defaultUsername: "",
          defaultGithubUsername: "",
          defaultVercelUsername: "",
          defaultDomain: "",
          defaultCategory: "development",
          defaultProjectType: "website",
          defaultFramework: "nextjs",
          defaultWebsiteCategory: "e-commerce",
        };

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
