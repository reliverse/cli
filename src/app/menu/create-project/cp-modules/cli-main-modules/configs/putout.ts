import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { type PutoutConfig, type ConfigPaths } from "~/types.js";
import { addConfigMetadata } from "~/utils/configHandler.js";

const PUTOUT_DEFAULT_CONFIG: PutoutConfig = addConfigMetadata({
  rules: {
    "remove-unused-variables": true,
    "remove-empty-pattern": true,
    "remove-duplicate-keys": true,
    "remove-duplicate-case": true,
    "remove-useless-return": true,
    "remove-useless-else": true,
    "remove-useless-array-constructor": true,
    "remove-useless-arguments": true,
    "remove-useless-spread": true,
    "remove-useless-typeof": true,
    "remove-useless-variables": true,
    "remove-useless-destructuring": true,
    "remove-useless-template-expressions": true,
  },
  match: {
    "*.ts": true,
    "*.tsx": true,
    // "*.js": true,
    "*.jsx": true,
  },
  ignore: ["node_modules", "dist", "build", "coverage", ".next", "*.d.ts"],
});

const PUTOUT_MINIMAL_CONFIG: PutoutConfig = addConfigMetadata({
  rules: {
    "remove-unused-variables": true,
    "remove-duplicate-keys": true,
    "remove-useless-return": true,
  },
  match: {
    "*.ts": true,
    "*.tsx": true,
    // "*.js": true,
    "*.jsx": true,
  },
  ignore: ["node_modules", "dist", "build", "coverage", ".next", "*.d.ts"],
});

async function validateProjectPath(projectPath: string): Promise<void> {
  if (!projectPath) {
    throw new Error("Target directory is required");
  }

  if (!(await fs.pathExists(projectPath))) {
    throw new Error(`Target directory does not exist: ${projectPath}`);
  }

  if (!(await fs.stat(projectPath).then((stat) => stat.isDirectory()))) {
    throw new Error(`Target path is not a directory: ${projectPath}`);
  }
}

export async function configurePutout(
  config: Pick<
    ConfigPaths,
    "putoutConfig" | "putoutRecommendedConfig" | "putoutRulesDisabledConfig"
  >,
) {
  try {
    const projectPath = path.dirname(config.putoutConfig);
    await validateProjectPath(projectPath);

    const putoutConfigPath = config.putoutConfig;
    const putoutConfigExists = await fileExists(putoutConfigPath);

    const putout = await selectPrompt({
      title:
        "Please select which type of Putout configuration you want to use.",
      options: [
        {
          label: "Continue without Putout",
          value: "Skip",
          hint: "Continue without code transformation rules",
        },
        {
          label: "Default Configuration",
          value: "Default",
          hint: "Full set of code transformation rules",
        },
        {
          label: "Minimal Configuration",
          value: "Minimal",
          hint: "Basic code cleanup rules only",
        },
      ],
    });

    if (typeof putout !== "string") {
      process.exit(0);
    }

    if (putout === "Skip") {
      relinka("info", "Continuing without Putout configuration.");
      return;
    }

    // Remove existing config if it exists
    if (putoutConfigExists) {
      await removeFile(putoutConfigPath);
    }

    try {
      // Generate new config
      const config =
        putout === "Default" ? PUTOUT_DEFAULT_CONFIG : PUTOUT_MINIMAL_CONFIG;
      if (!config || typeof config !== "object") {
        throw new Error("Invalid configuration template");
      }

      // Ensure the config has required fields
      if (!config.rules || !config.match || !config.ignore) {
        throw new Error("Configuration is missing required fields");
      }

      await fs.writeFile(putoutConfigPath, JSON.stringify(config, null, 2));
      relinka(
        "success",
        `Generated ${putout.toLowerCase()} Putout configuration.`,
      );
    } catch (error) {
      relinka(
        "error",
        "Failed to generate Putout configuration:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1); // Exit with error code
    }
  } catch (error) {
    relinka(
      "error",
      "Failed to configure Putout:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1); // Exit with error code
  }
}
