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
  importSymbol?: string;
  jsToTs?: boolean;
};

export type MonorepoType =
  | "turborepo"
  | "moonrepo"
  | "bun-workspaces"
  | "pnpm-workspaces";

export type TemplateOption =
  | "blefnk/relivator"
  | "blefnk/next-react-ts-src-minimal";

// design = graphic|video|audio|3d design
export type ProjectTypeOtions = "" | "development" | "design" | "marketing";

export type ProjectCategory =
  | ""
  | "website"
  | "mobile"
  | "desktop"
  | "crossplatform"
  | "extension"
  | "cli";

export type ProjectSubcategory = "" | "e-commerce" | "tool";

export type ProjectState = "" | "creating" | "created";

export type ReliverseConfig = {
  // Project details
  projectName?: string;
  projectDisplayName?: string;
  projectAuthor?: string;
  projectDescription?: string;
  projectVersion?: string;
  projectLicense?: string;
  projectRepository?: string;
  projectState?: ProjectState;
  projectDomain?: string;
  projectType?: ProjectTypeOtions;
  projectCategory?: ProjectCategory;
  projectSubcategory?: ProjectSubcategory;
  projectTemplate?: TemplateOption;
  projectDeployService?: DeploymentService;
  projectActivation?: string;

  // Project features
  features?: {
    i18n: boolean;
    pwa: boolean;
    seo: boolean;
    analytics: boolean;
    darkMode: boolean;
    authentication: boolean;
    api: boolean;
    database: boolean;
    testing: boolean;
    storybook: boolean;
    docker: boolean;
    ci: boolean;
    commands: string[];
    webview: string[];
    language: string[];
    themes: string[];
  };

  // Deployment
  deployPlatform?: DeploymentService;
  deployUrl?: string;
  productionBranch?: string;

  // Development preferences
  projectFramework?: "nextjs" | "react" | "vue" | "svelte" | "astro";
  projectFrameworkVersion?: string;
  nodeVersion?: string;
  runtime?: "nodejs" | "bun" | "deno";
  projectPackageManager?: "npm" | "yarn" | "pnpm" | "bun";
  monorepo?: {
    type: MonorepoType;
    packages?: string[];
    sharedPackages?: string[];
  };
  preferredLibraries?: PreferredLibraries;
  codeStyle?: CodeStylePreferences;

  // Dependencies management
  ignoreDependencies?: string[];

  // Generation preferences
  autoDeploy?: boolean;
  autoDepsInstall?: boolean;
  autoGitInit?: boolean;
  autoI18n?: boolean;
  autoDbScripts?: boolean;
  hideDeployPrompt?: boolean;
  hideDepsInstallPrompt?: boolean;
  hideGitInitPrompt?: boolean;
  hideI18nPrompt?: boolean;
  hideDbScriptsPrompt?: boolean;

  // Config revalidation
  configLastRevalidate?: string; // ISO date string
  configRevalidateFrequency?: string; // 1h | 1d | 2d | 7d

  // Custom rules
  customRules?: Record<string, unknown>;
};

export const DEFAULT_CONFIG: ReliverseConfig = {
  // Project details
  projectAuthor: "",
  projectState: "",
  projectDomain: "",
  projectType: "",
  projectCategory: "",
  projectSubcategory: "",

  // Development preferences
  projectFramework: "nextjs",
  projectPackageManager: "bun",
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

  // Code style preferences
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
    importSymbol: "~",
  },

  // Project features
  features: {
    i18n: true,
    pwa: false,
    seo: true,
    analytics: false,
    darkMode: true,
    authentication: true,
    api: true,
    database: true,
    testing: false,
    storybook: false,
    docker: false,
    ci: false,
    commands: [],
    webview: [],
    language: [],
    themes: [],
  },

  // Generation preferences
  autoDeploy: false,
  autoDepsInstall: false,
  autoGitInit: false,
  autoI18n: false,
  autoDbScripts: false,
  hideDeployPrompt: false,
  hideDepsInstallPrompt: false,
  hideGitInitPrompt: false,
  hideI18nPrompt: false,
  hideDbScriptsPrompt: false,
};
