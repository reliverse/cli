import type { DeploymentService } from "./common.js";
import type {
  CodeStylePreferences,
  MonorepoType,
  PreferredLibraries,
} from "./rules.js";

export type TemplateOption =
  | "blefnk/relivator"
  | "blefnk/next-react-ts-src-minimal";

export type ReliverseConfig = {
  // Project details
  projectName?: string;
  projectAuthor?: string;
  projectDescription?: string;
  projectVersion?: string;
  projectLicense?: string;
  projectRepository?: string;

  // Config revalidation
  configLastRevalidate?: string; // ISO date string
  configRevalidateFrequency?: string; // 1h | 1d | 2d | 7d

  // Technical stack
  framework?: "nextjs" | "react" | "vue" | "svelte" | "astro";
  frameworkVersion?: string;
  nodeVersion?: string;
  runtime?: "nodejs" | "bun" | "deno";
  packageManager?: "npm" | "yarn" | "pnpm" | "bun";
  monorepo?: {
    type: MonorepoType;
    packages?: string[];
    sharedPackages?: string[];
  };

  // Deployment
  deployPlatform?: DeploymentService;
  deployUrl?: string;
  productionBranch?: string;

  // Development Preferences
  preferredLibraries?: PreferredLibraries;
  codeStyle?: CodeStylePreferences;

  // Project Features
  features?: {
    i18n: boolean;
    pwa: boolean;
    seo: boolean;
    analytics: boolean;
    darkMode: boolean;
    authentication: boolean;
    authorization: boolean;
    api: boolean;
    database: boolean;
    testing: boolean;
    storybook: boolean;
    docker: boolean;
    ci: boolean;
  };

  // Dependencies Management
  ignoreDependencies?: string[];
  projectState?: string;
  projectDomain?: string;
  projectType?: "development";
  projectCategory?: "website";
  projectSubcategory?: "e-commerce";
  projectTemplate?: TemplateOption;
  projectDeployService?: DeploymentService;
  autoDeploy?: boolean;
  autoDepsInstall?: boolean;
  autoGitInit?: boolean;
  autoI18n?: boolean;
  autoDbScripts?: boolean;
  skipAuto?: boolean;
  vscodeExtension?: {
    displayName: string;
    description: string;
    features: string[];
    activation: string;
    publisher: string;
  };

  // Custom Extensions
  customRules?: Record<string, unknown>;
};

export const DEFAULT_CONFIG: ReliverseConfig = {
  projectAuthor: "",
  projectState: "",
  projectDomain: "",
  projectType: "development",
  projectCategory: "website",
  projectSubcategory: "e-commerce",
  autoDeploy: false,
  autoDepsInstall: true,
  autoGitInit: true,
  autoI18n: true,
  autoDbScripts: true,
  skipAuto: false,
  framework: "nextjs",
  packageManager: "bun",
  preferredLibraries: {
    stateManagement: "zustand",
    formManagement: "react-hook-form",
    styling: "tailwind",
    uiComponents: "shadcn-ui",
    testing: "bun",
    authentication: "clerk",
    database: "drizzle",
    api: "trpc",
  },
  codeStyle: {
    dontRemoveComments: true,
    shouldAddComments: true,
    typeOrInterface: "type",
    importOrRequire: "import",
    quoteMark: "double",
    semicolons: true,
    lineWidth: 80,
    indentStyle: "space",
    indentSize: 2,
    importSymbol: [
      {
        from: "~/utils/console",
        to: "@/utils/console",
        description: "Update import path to use @/ instead of ~/",
      },
    ],
  },
  features: {
    i18n: true,
    pwa: false,
    seo: true,
    analytics: false,
    darkMode: true,
    authentication: true,
    authorization: true,
    api: true,
    database: true,
    testing: false,
    storybook: false,
    docker: false,
    ci: false,
  },
};
