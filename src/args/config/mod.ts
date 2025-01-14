import { defineCommand } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/utils/reliverseSchema.js";

import {
  DEFAULT_CONFIG,
  getDefaultReliverseConfig,
} from "~/utils/reliverseConfig.js";
import { getCurrentWorkingDirectory } from "~/utils/terminalHelpers.js";
export default defineCommand({
  meta: {
    name: "config",
    description: "Generate configuration files in the current directory",
    hidden: true,
  },
  args: {
    defaults: {
      type: "boolean",
      description: "Generate config with default values",
    },
    rules: {
      type: "boolean",
      description: "Generate .reliverse file with all codemods",
    },
  },
  run: async ({ args }) => {
    const cwd = getCurrentWorkingDirectory();

    if (args.rules) {
      const configPath = path.join(cwd, ".reliverse");
      if (await fs.pathExists(configPath)) {
        relinka("error", ".reliverse already exists in the current directory");
        process.exit(1);
      }

      const rules = await getDefaultReliverseConfig(
        cwd,
        "my-app",
        "user",
        "nextjs",
      );
      // Create a config that includes both rules and legacy config fields
      const config: ReliverseConfig = {
        // General project information
        projectName: rules.projectName ?? "my-app",
        projectAuthor: rules.projectAuthor ?? "user",
        projectDescription: rules.projectDescription ?? "",
        projectVersion: rules.projectVersion ?? "0.1.0",
        projectLicense: rules.projectLicense ?? "MIT",
        projectRepository: rules.projectRepository ?? "",
        projectActivation: rules.projectActivation ?? "auto",
        projectCategory: rules.projectCategory ?? "webapp",
        projectType: rules.projectType ?? "library",
        projectDeployService: rules.projectDeployService ?? "vercel",
        projectDisplayName: rules.projectDisplayName ?? "",
        projectDomain: rules.projectDomain ?? "",
        projectState: rules.projectState ?? "creating",
        projectSubcategory: rules.projectSubcategory ?? "e-commerce",

        // Primary tech stack/framework
        projectTemplate: rules.projectTemplate ?? "blefnk/relivator",
        projectFramework: rules.projectFramework ?? "nextjs",
        projectFrameworkVersion: rules.projectFrameworkVersion ?? "latest",
        projectPackageManager: rules.projectPackageManager ?? "bun",
        nodeVersion: rules.nodeVersion ?? "latest",
        runtime: rules.runtime ?? "nodejs",
        productionBranch: rules.productionBranch ?? "main",
        deployUrl: rules.deployUrl ?? "",

        // Development preferences
        monorepo: rules.monorepo ?? {
          type: "turborepo",
          packages: [],
          sharedPackages: [],
        },

        preferredLibraries: {
          stateManagement: "zustand",
          styling: "tailwind",
          database: "drizzle",
          testing: "vitest",
          linting: "eslint",
          formatting: "biome",
          deployment: "vercel",
          authentication: "clerk",
          payment: "stripe",
          analytics: "vercel",
          formManagement: "react-hook-form",
          uiComponents: "shadcn-ui",
          monitoring: "sentry",
          logging: "axiom",
          forms: "react-hook-form",
          validation: "zod",
          documentation: "starlight",
          components: "shadcn",
          icons: "lucide",
          mail: "resend",
          search: "algolia",
          cache: "redis",
          storage: "cloudflare",
          cdn: "cloudflare",
          api: "trpc",
          cms: "contentlayer",
          i18n: "next-intl",
          seo: "next-seo",
          ui: "radix",
          motion: "framer",
          charts: "recharts",
          dates: "dayjs",
          markdown: "mdx",
          security: "auth",
          notifications: "sonner",
          uploads: "uploadthing",
          routing: "next",
          ...rules.preferredLibraries,
        },

        codeStyle: {
          ...rules.codeStyle,
        },

        // Project features
        features: {
          ...rules.features,
        },

        // Dependencies management
        ignoreDependencies: rules.ignoreDependencies ?? [],

        // Custom rules
        customRules: rules.customRules ?? {},

        // Generation preferences
        skipPromptsUseAutoBehavior: rules.skipPromptsUseAutoBehavior ?? false,
        deployBehavior: rules.deployBehavior ?? "prompt",
        depsBehavior: rules.depsBehavior ?? "prompt",
        gitBehavior: rules.gitBehavior ?? "prompt",
        i18nBehavior: rules.i18nBehavior ?? "prompt",
        scriptsBehavior: rules.scriptsBehavior ?? "prompt",
      };

      try {
        await fs.writeFile(
          configPath,
          JSON.stringify(config, null, 2),
          "utf-8",
        );
        relinka(
          "success",
          "Generated .reliverse with rules configuration successfully!",
        );
        process.exit(0);
      } catch (error) {
        relinka(
          "error",
          "Failed to generate config file:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    }

    const configPath = path.join(cwd, ".reliverse");
    if (await fs.pathExists(configPath)) {
      relinka("error", ".reliverse already exists in the current directory");
      process.exit(1);
    }

    const config: ReliverseConfig = {
      ...DEFAULT_CONFIG,
      ...(args.defaults
        ? {}
        : { projectName: "my-app", projectAuthor: "user" }),
    };

    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
      relinka("success", "Generated .reliverse successfully!");
      process.exit(0);
    } catch (error) {
      relinka(
        "error",
        "Failed to generate config file:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  },
});
