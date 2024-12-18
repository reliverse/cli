export type Behavior = "prompt" | "autoYes" | "autoNo";

export type ConfigKey = "code" | "key" | "githubKey" | "vercelKey";

export type UserDataKeys =
  | "name"
  | "email"
  | "githubUsername"
  | "vercelUsername";

export type ReliverseMemory = {
  code: string;
  key: string;
  githubKey: string;
  vercelKey: string;
  name?: string;
  email?: string;
  githubUsername?: string;
  vercelUsername?: string;
};

export type DatabasePostgresProvider = "neon" | "railway";

export type DatabaseProvider = "postgres" | "sqlite" | "mysql";

export type ColumnType = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
  };
};

export type TableSchema = {
  name: string;
  columns: ColumnType[];
};

export type SubOption = {
  label: string;
  value: string;
  providers?: DatabasePostgresProvider[];
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
    analytics: boolean;
    themeMode: "dark-light" | "dark" | "light";
    authentication: boolean;
    api: boolean;
    database: boolean;
    testing: boolean;
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
  deployBehavior?: Behavior;
  depsBehavior?: Behavior;
  gitBehavior?: Behavior;
  i18nBehavior?: Behavior;
  scriptsBehavior?: Behavior;

  // Config revalidation
  configLastRevalidate?: string; // ISO date string
  configRevalidateFrequency?: string; // 1h | 1d | 2d | 7d

  // Custom rules
  customRules?: Record<string, unknown>;
};

// Return type explicitly first
export type BiomeConfigResult = {
  lineWidth?: number;
  indentStyle?: "space" | "tab";
  indentWidth?: 2 | 4 | 8;
  quoteMark?: "single" | "double";
  semicolons?: boolean;
  trailingComma?: boolean;
} | null;

export type BiomeConfig = BaseConfig & {
  $schema: string;
  organizeImports: {
    enabled: boolean;
  };
  formatter: {
    enabled: boolean;
    lineWidth?: number;
    indentStyle?: "space" | "tab";
    indentWidth?: 2 | 4 | 8;
  };
  linter: {
    enabled: boolean;
    rules?: {
      recommended?: boolean;
    };
  };
  javascript?: {
    formatter: {
      trailingComma?: "all" | "es5" | "none";
      quoteStyle?: "single" | "double";
      semicolons?: "always" | "never";
    };
  };
};

// Common type for all configurations
export type BaseConfig = {
  version: string;
  generatedAt: string;
};

export type ApptsConfig = {
  apptsConfig: string;
};

export type KnipConfig = BaseConfig & {
  $schema: string;
  entry?: string[];
  project?: string[];
  ignore: string[];
  ignoreDependencies?: string[];
  rules: Record<string, "error" | "warn" | "off">;
};

export type PutoutConfig = BaseConfig & {
  rules: Record<string, boolean>;
  match: Record<string, boolean>;
  ignore: string[];
};

export type NextJsConfig = BaseConfig & {
  reactStrictMode: boolean;
  poweredByHeader: boolean;
  compress?: boolean;
  swcMinify?: boolean;
  images?: {
    formats?: string[];
    remotePatterns?: {
      protocol: string;
      hostname: string;
    }[];
  };
  experimental?: {
    typedRoutes?: boolean;
    serverActions?: {
      allowedOrigins?: string[];
    };
  };
  logging?: {
    fetches?: {
      fullUrl?: boolean;
    };
  };
};

export type ConfigPaths = {
  eslintConfig: string;
  eslintRulesDisabledConfig: string;
  eslintUltimateConfig: string;
  nextConfig: string;
  nextMinimalConfig: string;
  nextRecommendedConfig: string;
  biomeConfig: string;
  biomeRecommendedConfig: string;
  biomeRulesDisabledConfig: string;
  knipConfig: string;
  knipRecommendedConfig: string;
  knipRulesDisabledConfig: string;
  putoutConfig: string;
  putoutRecommendedConfig: string;
  putoutRulesDisabledConfig: string;
  envConfig: string;
  envRecommendedConfig: string;
  envRulesDisabledConfig: string;
  apptsConfig: string;
};

export type ConfigFile = {
  name: string;
  files: string[];
  editPrompt: string;
};

export type ConfigPreset = {
  name: string;
  description: string;
  dependencies: string[];
  config: string | Record<string, any>;
};

export type GitOption = "initializeNewGitRepository" | "keepExistingGitFolder";

export type FileConflict = {
  customMessage?: string; // Optional custom message for user prompt
  description?: string; // Optional custom description for user-facing messages
  fileName: string; // Name of the file (e.g., '.eslintrc.cjs')
};

export type ConflictHandlerOptions = {
  files: FileConflict[]; // List of files to check for conflicts
  automaticConflictHandling: boolean; // Whether to ask the user or automatically remove files
  targetDir: string; // Directory where the conflicts may happen
};

export type CloneError = {
  message: string;
} & Error;

export type CopyError = {
  message: string;
  fileName?: string;
} & Error;

export type MessageKind = "log" | "info" | "warn" | "error" | "success";
export type VerboseKind = `${MessageKind}-verbose`;
export type AllKinds = MessageKind | VerboseKind;
export type MessageConfig = {
  type: "M_INFO" | "M_ERROR";
  titleColor?: "retroGradient" | "viceGradient" | "yellowBright";
  titleTypography?: "bold";
  contentColor?: "dim";
  contentTypography?: "italic";
};

export type PromptType = "confirm" | "input" | "password";

export type Question = {
  default?: boolean | string;
  key: string;
  message: string;
  type: PromptType;
};

export type IntegrationConfig = {
  name: string;
  dependencies: string[];
  devDependencies?: string[];
  files: { path: string; content: string }[];
  scripts?: Record<string, string>;
  envVars?: Record<string, string>;
  postInstall?: (cwd: string) => Promise<void>;
};

export type RemovalConfig = {
  name: string;
  dependencies: string[];
  devDependencies: string[];
  files: string[];
  directories: string[];
  scripts: string[];
  envVars: string[];
};

export type FooterItem = {
  items: {
    external?: boolean;
    href: string;
    title: string;
  }[];
  title: string;
};

export type FooterConfig = {
  link: string;
  text: string;
};

export type SocialConfig = {
  alt?: string;
  icon: string;
  link: string;
};

export type NavigationKeys = "about" | "blog" | "docs" | "download" | "learn";

export type NavigationEntry = {
  items?: Record<string, NavigationEntry>;
  label?: string;
  link?: string;
};

export type SiteNavigation = {
  footerLinks: FooterConfig[];
  sideNavigation: Record<NavigationKeys, NavigationEntry>;
  socialLinks: SocialConfig[];
  topNavigation: Record<NavigationKeys, NavigationEntry>;
};

export type ShadcnConfig = {
  style: string;
  rsc: boolean;
  tsx: boolean;
  tailwind: {
    config: string;
    css: string;
    baseColor: string;
    cssVariables: boolean;
    prefix: string;
  };
  aliases: {
    components: string;
    utils: string;
    ui: string;
    lib: string;
    hooks: string;
  };
  iconLibrary: string;
};

export type Theme = {
  name: string;
  colors: Record<string, string>;
};

export type CamelCase<T extends string> = T extends `${infer U}${infer V}`
  ? `${Uppercase<U>}${V}`
  : T;

export type HyphenatedStringToCamelCase<S extends string> =
  S extends `${infer T}-${infer U}`
    ? `${T}${HyphenatedStringToCamelCase<CamelCase<U>>}`
    : CamelCase<S>;

export type HyphenatedDataStringToCamelCase<S extends string> =
  S extends `data-${infer U}` ? HyphenatedStringToCamelCase<U> : S;

export type IconName =
  | "billing"
  | "dollarSign"
  | "laptop"
  | "settings"
  | "store"
  | "terminal"
  | "user";

export type NavItem = {
  description?: string;
  disabled?: boolean;
  external?: boolean;
  href: string;
  icon?: IconName;
  label?: string;
  title: string;
};

export type NavItemWithChildren = {
  items: NavItemWithChildren[];
} & NavItem;

export type NavItemWithOptionalChildren = {
  items?: NavItemWithChildren[];
} & NavItem;

export type MainMenuItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;

export type GeneralShellProps = {
  header?: any;
};

export type PrismaField = {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  attributes: Record<string, any>;
};

export type PrismaModel = {
  name: string;
  fields: PrismaField[];
};

export type TailwindReplacement = {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  description: string;
};

export type TailwindThemeVariable = {
  name: string;
  value: string;
};

export type ModernReplacement = {
  pattern: RegExp;
  replacement: string;
  description: string;
};

export type ModernizeConfig = {
  replaceFs?: boolean;
  replacePath?: boolean;
  replaceHttp?: boolean;
  replaceProcess?: boolean;
  replaceConsole?: boolean;
  replaceEvents?: boolean;
};

export type GitStatus = {
  uncommittedChanges: number;
  unpushedCommits: number;
};

export type DetectedProject = {
  name: string;
  path: string;
  config: ReliverseConfig;
  gitStatus?: GitStatus;
};

export type GitCommitOptions = {
  message: string;
  projectPath: string;
};
