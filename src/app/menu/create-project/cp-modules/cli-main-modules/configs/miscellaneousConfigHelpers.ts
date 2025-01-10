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
  const reliversePath = path.join(cwd, ".reliverse");
  let config: ReliverseConfig = { ...DEFAULT_CONFIG };

  try {
    // Check if .reliverse exists and read it
    if (await fs.pathExists(reliversePath)) {
      const configContent = await fs.readFile(reliversePath, "utf-8");
      const userConfig = destr<Partial<ReliverseConfig>>(configContent);
      config = { ...config, ...userConfig };
    }

    // Add experimental configuration
    config = {
      ...config,
      experimental: {
        ...config.experimental,
        // Project details
        projectName: config.experimental?.projectName ?? "",
        projectAuthor: config.experimental?.projectAuthor ?? "",
        projectDescription: config.experimental?.projectDescription ?? "",
        projectVersion: config.experimental?.projectVersion ?? "",
        projectLicense: config.experimental?.projectLicense ?? "",
        projectRepository: config.experimental?.projectRepository ?? "",
        productionBranch: config.experimental?.productionBranch ?? "main",
        deployUrl: config.experimental?.deployUrl ?? "",
        projectActivation: config.experimental?.projectActivation ?? "auto",
        projectCategory: config.experimental?.projectCategory ?? "website",
        projectType: config.experimental?.projectType ?? "library",
        projectDeployService:
          config.experimental?.projectDeployService ?? "vercel",
        projectDisplayName: config.experimental?.projectDisplayName ?? "",
        projectDomain: config.experimental?.projectDomain ?? "",
        projectState: config.experimental?.projectState ?? "creating",
        projectSubcategory:
          config.experimental?.projectSubcategory ?? "e-commerce",
        projectTemplate:
          config.experimental?.projectTemplate ?? "blefnk/relivator",

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
        },

        // Development preferences
        projectFramework: config.experimental?.projectFramework ?? "nextjs",
        projectFrameworkVersion:
          config.experimental?.projectFrameworkVersion ?? "",
        nodeVersion: config.experimental?.nodeVersion ?? "latest",
        runtime: config.experimental?.runtime ?? "nodejs",
        projectPackageManager:
          config.experimental?.projectPackageManager ?? "npm",
        monorepo: config.experimental?.monorepo ?? {
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
          },
          ...config.experimental?.codeStyle,
        },

        // Dependencies management
        ignoreDependencies: config.experimental?.ignoreDependencies ?? [],

        // Custom rules
        customRules: {
          ...config.experimental?.customRules,
        },

        // Generation preferences
        skipPromptsUseAutoBehavior:
          config.experimental?.skipPromptsUseAutoBehavior ?? false,
        deployBehavior: config.experimental?.deployBehavior ?? "prompt",
        depsBehavior: config.experimental?.depsBehavior ?? "prompt",
        gitBehavior: config.experimental?.gitBehavior ?? "prompt",
        i18nBehavior: config.experimental?.i18nBehavior ?? "prompt",
        scriptsBehavior: config.experimental?.scriptsBehavior ?? "prompt",
      },
    };
  } catch (error) {
    relinka(
      "error-verbose",
      "Error reading configuration files:",
      error instanceof Error ? error.message : String(error),
    );
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
