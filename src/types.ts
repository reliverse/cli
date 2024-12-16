export type DatabaseProvider = "neon" | "railway";

export type SubOption = {
  label: string;
  value: string;
  providers?: DatabaseProvider[];
};

export type IntegrationOption = {
  label: string;
  value: string;
  subOptions?: SubOption[];
};

export type IntegrationCategory =
  | "database"
  | "payments"
  | "auth"
  | "email"
  | "styling"
  | "testing"
  | "i18n";

export type IntegrationOptions = Record<string, IntegrationOption[]>;

export type DeploymentService = "Vercel" | "Netlify" | "Railway" | "none";

export type PreferredLibraries = {
  stateManagement?: "zustand" | "jotai" | "redux-toolkit" | "none";
  formManagement?: "react-hook-form" | "formik" | "none";
  styling?: "tailwind" | "styled-components" | "css-modules" | "sass";
  uiComponents?: "shadcn-ui" | "chakra-ui" | "material-ui" | "none";
  testing?: "bun" | "vitest" | "jest" | "playwright" | "cypress" | "none";
  authentication?:
    | "better-auth"
    | "next-auth"
    | "clerk"
    | "supabase-auth"
    | "auth0"
    | "none";
  database?: "drizzle" | "prisma" | "mongoose" | "none";
  api?: "trpc" | "graphql" | "rest" | "none";
};

export type CodeStylePreferences = {
  dontRemoveComments: boolean;
  shouldAddComments: boolean;
  typeOrInterface: "type" | "interface" | "mixed";
  importOrRequire: "import" | "require" | "mixed";
  quoteMark: "single" | "double";
  semicolons: boolean;
  lineWidth: number;
  indentStyle: "space" | "tab";
  indentSize: 2 | 4 | 8;
  cjsToEsm?: boolean;
  modernize?: {
    replaceFs?: boolean;
    replacePath?: boolean;
    replaceHttp?: boolean;
    replaceProcess?: boolean;
    replaceConsole?: boolean;
    replaceEvents?: boolean;
  };
  importSymbol?: {
    from: string;
    to: string;
    description?: string;
  }[];
  jsToTs?: boolean;
};

export type MonorepoType =
  | "turborepo"
  | "moonrepo"
  | "bun-workspaces"
  | "pnpm-workspaces";

export type ReliverseRules = {
  // Project details
  projectName: string;
  projectAuthor: string;
  projectDescription?: string;
  projectVersion?: string;
  projectLicense?: string;
  projectRepository?: string;

  // Project features
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

  // Technical stack
  framework: "nextjs" | "react" | "vue" | "svelte" | "astro";
  frameworkVersion?: string;
  nodeVersion?: string;
  runtime?: "nodejs" | "bun" | "deno";
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  monorepo?: {
    type: MonorepoType;
    packages?: string[];
    sharedPackages?: string[];
  };

  // Deployment
  deployPlatform?: DeploymentService;
  deployUrl?: string;
  productionBranch?: string;

  // Development preferences
  preferredLibraries: PreferredLibraries;
  codeStyle: CodeStylePreferences;

  // Dependencies Management
  ignoreDependencies?: string[];

  // Config revalidation
  configLastRevalidate?: string; // ISO date string
  configRevalidateFrequency?: string; // 1h | 1d | 2d | 7d

  // Custom Extensions
  customRules?: Record<string, unknown>;
};

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

  // Project features
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

  // Development preferences
  preferredLibraries?: PreferredLibraries;
  codeStyle?: CodeStylePreferences;

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

  // Config revalidation
  configLastRevalidate?: string; // ISO date string
  configRevalidateFrequency?: string; // 1h | 1d | 2d | 7d

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
