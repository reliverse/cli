import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { DEFAULT_CONFIG } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/reliverseDefaultConfig.js";
import { getDefaultReliverseConfig } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/reliverseReadWrite.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { getCurrentWorkingDirectory } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { type ReliverseConfig } from "~/types.js";

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

      const rules = await getDefaultReliverseConfig("my-app", "user");
      // Create a config that includes both rules and legacy config fields
      const config: ReliverseConfig = {
        experimental: {
          // Project details
          projectName: rules.experimental?.projectName ?? "my-app",
          projectAuthor: rules.experimental?.projectAuthor ?? "user",
          projectDescription: rules.experimental?.projectDescription ?? "",
          projectVersion: rules.experimental?.projectVersion ?? "0.1.0",
          projectLicense: rules.experimental?.projectLicense ?? "MIT",
          projectRepository: rules.experimental?.projectRepository ?? "",
          projectActivation: rules.experimental?.projectActivation ?? "auto",
          projectCategory: rules.experimental?.projectCategory ?? "website",
          projectType: rules.experimental?.projectType ?? "development",
          projectDeployService:
            rules.experimental?.projectDeployService ?? "vercel",
          projectDisplayName: rules.experimental?.projectDisplayName ?? "",
          projectDomain: rules.experimental?.projectDomain ?? "",
          projectState: rules.experimental?.projectState ?? "creating",
          projectSubcategory:
            rules.experimental?.projectSubcategory ?? "e-commerce",
          projectTemplate:
            rules.experimental?.projectTemplate ?? "blefnk/relivator",
          projectFramework: rules.experimental?.projectFramework ?? "nextjs",
          projectFrameworkVersion:
            rules.experimental?.projectFrameworkVersion ?? "latest",
          projectPackageManager:
            rules.experimental?.projectPackageManager ?? "npm",
          nodeVersion: rules.experimental?.nodeVersion ?? "latest",
          runtime: rules.experimental?.runtime ?? "nodejs",
          productionBranch: rules.experimental?.productionBranch ?? "main",
          deployUrl: rules.experimental?.deployUrl ?? "",

          // Development preferences
          monorepo: rules.experimental?.monorepo ?? {
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
            ...rules.experimental?.preferredLibraries,
          },

          codeStyle: {
            lineWidth: 80,
            cjsToEsm: true,
            importSymbol: "import",
            indentSize: 2,
            indentStyle: "space",
            dontRemoveComments: false,
            shouldAddComments: true,
            typeOrInterface: "type",
            importOrRequire: "import",
            quoteMark: "double",
            semicolons: true,
            trailingComma: "all",
            bracketSpacing: true,
            arrowParens: "always",
            tabWidth: 2,
            jsToTs: false,
            modernize: {
              replaceFs: true,
              replacePath: true,
              replaceHttp: true,
              replaceProcess: true,
              replaceConsole: true,
              replaceEvents: true,
              ...rules.experimental?.codeStyle?.modernize,
            },
            ...rules.experimental?.codeStyle,
          },

          // Project features
          features: {
            i18n: false,
            analytics: false,
            themeMode: "dark-light",
            authentication: false,
            api: false,
            database: false,
            testing: false,
            docker: false,
            ci: false,
            commands: [],
            webview: [],
            language: [],
            themes: [],
            ...rules.experimental?.features,
          },

          // Dependencies management
          ignoreDependencies: rules.experimental?.ignoreDependencies ?? [],

          // Config revalidation
          configLastRevalidate: rules.experimental?.configLastRevalidate ?? "",
          configRevalidateFrequency:
            rules.experimental?.configRevalidateFrequency ?? "7d",

          // Custom rules
          customRules: rules.experimental?.customRules ?? {},

          // Generation preferences
          skipPromptsUseAutoBehavior:
            rules.experimental?.skipPromptsUseAutoBehavior ?? false,
          deployBehavior: rules.experimental?.deployBehavior ?? "prompt",
          depsBehavior: rules.experimental?.depsBehavior ?? "prompt",
          gitBehavior: rules.experimental?.gitBehavior ?? "prompt",
          i18nBehavior: rules.experimental?.i18nBehavior ?? "prompt",
          scriptsBehavior: rules.experimental?.scriptsBehavior ?? "prompt",
        },
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

    const config: ReliverseConfig = args.defaults ? DEFAULT_CONFIG : {};

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
