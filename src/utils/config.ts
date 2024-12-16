import { destr } from "destr";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "~/utils/console.js";

import type { ReliverseConfig } from "../types/config.js";

import { MEMORY_FILE } from "../app/data/constants.js";
import { DEFAULT_CONFIG } from "../types/config.js";

export const isConfigExists = async () => {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, MEMORY_FILE);
    return await fs.pathExists(filePath);
  } catch (error) {
    relinka("error", "Error checking if config file exists:", error.toString());
    return false;
  }
};

export async function readConfig(cwd: string): Promise<ReliverseConfig> {
  const configPath = path.join(cwd, "reliverse.json");

  try {
    if (await fs.pathExists(configPath)) {
      const configContent = await fs.readFile(configPath, "utf-8");
      const userConfig = destr<Partial<ReliverseConfig>>(configContent);
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
  } catch (error) {
    console.warn("Error reading reliverse.json:", error);
  }

  return DEFAULT_CONFIG;
}

export function parseCliArgs(args: string[]): Partial<ReliverseConfig> {
  const config: Partial<ReliverseConfig> = {};

  // Process boolean flags first - these are automatic answers to prompts
  for (const arg of args) {
    switch (arg) {
      // Automatic "yes" answers
      case "--deploy":
        config.shouldDeploy = true;
        break;

      // Automatic "no" answers
      case "--no-deps":
        config.shouldInstallDependencies = false;
        break;
      case "--no-git":
        config.shouldInitGit = false;
        break;
      case "--no-i18n":
        config.shouldUseI18n = false;
        break;
      case "--no-db":
        config.shouldRunDbScripts = false;
        break;
    }
  }

  // Process value flags - these set default values
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--template":
        if (i + 1 < args.length) {
          const templateValue = args[++i];
          if (
            templateValue === "blefnk/relivator" ||
            templateValue === "blefnk/next-react-ts-src-minimal"
          ) {
            config.defaultTemplate = templateValue;
          }
        }
        break;
      case "--username":
        if (i + 1 < args.length) {
          config.defaultUsername = args[++i];
        }
        break;
      case "--github-username":
        if (i + 1 < args.length) {
          config.defaultGithubUsername = args[++i];
        }
        break;
      case "--vercel-username":
        if (i + 1 < args.length) {
          config.defaultVercelUsername = args[++i];
        }
        break;
      case "--domain":
        if (i + 1 < args.length) {
          config.defaultDomain = args[++i];
        }
        break;
      case "--category":
        if (i + 1 < args.length) {
          const value = args[++i];
          if (value === "development") {
            config.defaultCategory = value;
          }
        }
        break;
      case "--project-type":
        if (i + 1 < args.length) {
          const value = args[++i];
          if (value === "website") {
            config.defaultProjectType = value;
          }
        }
        break;
      case "--framework":
        if (i + 1 < args.length) {
          const value = args[++i];
          if (value === "nextjs") {
            config.defaultFramework = value;
          }
        }
        break;
      case "--website-category":
        if (i + 1 < args.length) {
          const value = args[++i];
          if (value === "e-commerce") {
            config.defaultWebsiteCategory = value;
          }
        }
        break;
    }
  }

  return config;
}
