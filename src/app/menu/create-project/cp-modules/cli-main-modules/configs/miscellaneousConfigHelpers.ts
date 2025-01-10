import { parseJSONC } from "confbox";
import destr from "destr";
import fs from "fs-extra";
import path from "pathe";

import type {
  BaseConfig,
  BiomeConfig,
  BiomeConfigResult,
  ConfigFile,
  ProjectTypeOptions,
  ReliverseConfig,
} from "~/types.js";

import { relinka } from "../handlers/logger.js";
import { DEFAULT_CONFIG } from "./reliverseDefaultConfig.js";

export const CONFIG_FILES: ConfigFile[] = [
  {
    name: "TypeScript",
    files: ["tsconfig.json"],
    editPrompt: "Edit TypeScript configuration",
  },
  {
    name: "Biome",
    files: ["biome.json", "biome.jsonc"],
    editPrompt: "Edit Biome configuration",
  },
  {
    name: "Knip",
    files: ["knip.json", "knip.jsonc"],
    editPrompt: "Edit Knip configuration",
  },
  {
    name: "ESLint",
    files: ["eslint.config.js"],
    editPrompt: "Edit ESLint configuration",
  },
  {
    name: "Vitest",
    files: ["vitest.config.ts"],
    editPrompt: "Edit Vitest configuration",
  },
  {
    name: "Prettier",
    files: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.json5",
      ".prettierrc.js",
      "prettier.config.js",
    ],
    editPrompt: "Edit Prettier configuration",
  },
];

export async function detectConfigFiles(cwd: string): Promise<ConfigFile[]> {
  const detectedConfigs: ConfigFile[] = [];

  for (const config of CONFIG_FILES) {
    for (const file of config.files) {
      if (await fs.pathExists(path.join(cwd, file))) {
        detectedConfigs.push(config);
        break;
      }
    }
  }

  return detectedConfigs;
}

// Helper function to add metadata to configs
export function addConfigMetadata<T extends object>(config: T): T & BaseConfig {
  return {
    ...config,
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
  };
}

export async function getReliverseConfig(
  cwd: string,
): Promise<ReliverseConfig> {
  const configPath = path.join(cwd, ".reliverse");
  const rulesPath = path.join(cwd, ".reliverse");
  let config: ReliverseConfig = { ...DEFAULT_CONFIG };

  try {
    // Try to read .reliverse first
    if (await fs.pathExists(configPath)) {
      const configContent = await fs.readFile(configPath, "utf-8");
      const userConfig = destr<Partial<ReliverseConfig>>(configContent);
      config = { ...config, ...userConfig };
    }

    // Try to read .reliverse and merge if exists
    if (await fs.pathExists(rulesPath)) {
      const rulesContent = await fs.readFile(rulesPath, "utf-8");
      let rules: ReliverseConfig;

      try {
        // Try parsing as JSONC first
        rules = destr(rulesContent);
      } catch {
        // If parsing fails, warn user but continue with existing config
        relinka(
          "warn",
          "Failed to parse .reliverse file, using .reliverse only",
        );
        return config;
      }

      // Merge rules into config, preserving existing values
      config = {
        ...config,
        experimental: {
          ...config.experimental,
          // Project details
          projectName:
            rules.experimental?.projectName ??
            config.experimental?.projectName ??
            "",
          projectAuthor:
            rules.experimental?.projectAuthor ??
            config.experimental?.projectAuthor ??
            "",
          projectDescription:
            rules.experimental?.projectDescription ??
            config.experimental?.projectDescription ??
            "",
          projectVersion:
            rules.experimental?.projectVersion ??
            config.experimental?.projectVersion ??
            "",
          projectLicense:
            rules.experimental?.projectLicense ??
            config.experimental?.projectLicense ??
            "",
          projectRepository:
            rules.experimental?.projectRepository ??
            config.experimental?.projectRepository ??
            "",
          productionBranch: rules.experimental?.productionBranch ?? "main",
          deployUrl: rules.experimental?.deployUrl ?? "",
          projectActivation: rules.experimental?.projectActivation ?? "auto",
          projectCategory: rules.experimental?.projectCategory ?? "website",
          projectType: rules.experimental?.projectType ?? "library",
          projectDeployService:
            rules.experimental?.projectDeployService ?? "vercel",
          projectDisplayName: rules.experimental?.projectDisplayName ?? "",
          projectDomain: rules.experimental?.projectDomain ?? "",
          projectState: rules.experimental?.projectState ?? "creating",
          projectSubcategory:
            rules.experimental?.projectSubcategory ?? "e-commerce",
          projectTemplate:
            rules.experimental?.projectTemplate ?? "blefnk/relivator",

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
            ...config.experimental?.features,
            ...rules.experimental?.features,
          },

          // Development preferences
          projectFramework:
            rules.experimental?.projectFramework ??
            config.experimental?.projectFramework ??
            "nextjs",
          projectFrameworkVersion:
            rules.experimental?.projectFrameworkVersion ??
            config.experimental?.projectFrameworkVersion ??
            "",
          nodeVersion:
            rules.experimental?.nodeVersion ??
            config.experimental?.nodeVersion ??
            "latest",
          runtime:
            rules.experimental?.runtime ??
            config.experimental?.runtime ??
            "nodejs",
          projectPackageManager:
            rules.experimental?.projectPackageManager ??
            config.experimental?.projectPackageManager ??
            "npm",
          monorepo: rules.experimental?.monorepo ??
            config.experimental?.monorepo ?? {
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
            ...config.experimental?.preferredLibraries,
            ...rules.experimental?.preferredLibraries,
          },

          // Code style preferences
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
              ...config.experimental?.codeStyle?.modernize,
              ...rules.experimental?.codeStyle?.modernize,
            },
            ...config.experimental?.codeStyle,
            ...rules.experimental?.codeStyle,
          },

          // Dependencies management
          ignoreDependencies:
            rules.experimental?.ignoreDependencies ??
            config.experimental?.ignoreDependencies ??
            [],

          // Custom rules
          customRules: {
            ...config.experimental?.customRules,
            ...rules.experimental?.customRules,
          },

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

      // If .reliverse exists but .reliverse doesn't, suggest migration
      if (!(await fs.pathExists(configPath))) {
        relinka(
          "info",
          "Found .reliverse but no .reliverse. Consider migrating to .reliverse for better compatibility.",
        );
      }
    }
  } catch (error) {
    console.warn("Error reading configuration files:", error);
  }

  return config;
}

let cachedBiomeConfig: BiomeConfigResult = null;

export async function getBiomeConfig(
  projectPath: string,
): Promise<BiomeConfigResult> {
  if (cachedBiomeConfig !== null) {
    return cachedBiomeConfig;
  }

  try {
    const biomePath = path.join(projectPath, "biome.jsonc");
    if (await fs.pathExists(biomePath)) {
      const content = await fs.readFile(biomePath, "utf-8");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const config = parseJSONC(content) as BiomeConfig;
      cachedBiomeConfig = {
        lineWidth: config.formatter?.lineWidth ?? 80,
        indentStyle: config.formatter?.indentStyle ?? "space",
        indentWidth: config.formatter?.indentWidth ?? 2,
        quoteMark: config.javascript?.formatter?.quoteStyle ?? "double",
        semicolons: config.javascript?.formatter?.semicolons === "always",
        trailingComma: config.javascript?.formatter?.trailingComma === "all",
      };
      return cachedBiomeConfig;
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error reading biome config:",
      error instanceof Error ? error.message : String(error),
    );
  }
  cachedBiomeConfig = null;
  return null;
}

export const PROJECT_TYPE_FILES = {
  "": [],
  library: ["jsr.json", "jsr.jsonc"],
  nextjs: ["next.config.js", "next.config.ts", "next.config.mjs"],
  astro: ["astro.config.js", "astro.config.ts", "astro.config.mjs"],
  react: ["vite.config.js", "vite.config.ts", "react.config.js"],
  vue: ["vue.config.js", "vite.config.ts"],
  svelte: ["svelte.config.js", "svelte.config.ts"],
} satisfies Record<ProjectTypeOptions, string[]>;

export async function detectProjectType(
  cwd: string,
): Promise<keyof typeof PROJECT_TYPE_FILES | null> {
  for (const [type, files] of Object.entries(PROJECT_TYPE_FILES)) {
    for (const file of files) {
      if (await fs.pathExists(path.join(cwd, file))) {
        return type as keyof typeof PROJECT_TYPE_FILES;
      }
    }
  }
  return null;
}
