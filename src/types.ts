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
  githubKey?: string;
  vercelKey?: string;
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

export type DeploymentService =
  | "vercel"
  | "deno"
  | "netlify"
  | "railway"
  | "none";

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
  linting?: "eslint" | "none";
  formatting?: "biome" | "none";
  deployment?: DeploymentService;
  payment?: "stripe" | "none";
  analytics?: "vercel" | "none";
  monitoring?: "sentry" | "none";
  logging?: "axiom" | "none";
  forms?: "react-hook-form" | "none";
  validation?: "zod" | "typebox" | "valibot" | "none";
  documentation?: "starlight" | "nextra" | "none";
  components?: "shadcn" | "none";
  icons?: "lucide" | "none";
  mail?: "resend" | "none";
  search?: "algolia" | "none";
  cache?: "redis" | "none";
  storage?: "cloudflare" | "none";
  cdn?: "cloudflare" | "none";
  cms?: "contentlayer" | "none";
  i18n?: "next-intl" | "none";
  seo?: "next-seo" | "none";
  ui?: "radix" | "none";
  motion?: "framer" | "none";
  charts?: "recharts" | "none";
  dates?: "dayjs" | "none";
  markdown?: "mdx" | "none";
  security?: "auth" | "none";
  notifications?: "sonner" | "none";
  uploads?: "uploadthing" | "none";
  routing?: "next" | "react-router" | "none";
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
  trailingComma: "all" | "es5" | "none";
  bracketSpacing: boolean;
  arrowParens: "always" | "as-needed" | "never";
  tabWidth: 2 | 4 | 8;
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
  | "blefnk/next-react-ts-src-minimal"
  | "blefnk/all-in-one-nextjs-template"
  | "blefnk/create-t3-app"
  | "blefnk/create-next-app"
  | "blefnk/astro-starlight-template"
  | "blefnk/versator"
  | "reliverse/template-browser-extension";

// design = graphic|video|audio|3d design
export type ProjectTypeOptions = "" | "development" | "design" | "marketing";

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
  experimental?:
    | {
        // Do you want autoYes/autoNo below?
        // Set to true to activate auto-answering.
        // This is to ensure there is no unexpected behavior.
        skipPromptsUseAutoBehavior?: boolean | undefined;

        // Generation preferences
        deployBehavior?: Behavior | undefined;
        depsBehavior?: Behavior | undefined;
        gitBehavior?: Behavior | undefined;
        i18nBehavior?: Behavior | undefined;
        scriptsBehavior?: Behavior | undefined;

        // Project details
        projectName?: string | undefined;
        projectAuthor?: string | undefined;
        projectDescription?: string | undefined;
        projectVersion?: string | undefined;
        projectLicense?: string | undefined;
        projectRepository?: string | undefined;
        projectState?: ProjectState | undefined;
        projectDomain?: string | undefined;
        projectType?: ProjectTypeOptions | undefined;
        projectCategory?: ProjectCategory | undefined;
        projectSubcategory?: ProjectSubcategory | undefined;
        projectTemplate?: TemplateOption | undefined;
        projectDeployService?: DeploymentService | undefined;
        projectActivation?: string | undefined;
        projectFramework?: string | undefined;
        projectPackageManager?: string | undefined;
        projectFrameworkVersion?: string | undefined;
        projectDisplayName?: string | undefined;
        nodeVersion?: string | undefined;
        runtime?: string | undefined;
        productionBranch?: string | undefined;
        deployUrl?: string | undefined;
        monorepo?:
          | {
              type: string;
              packages: string[];
              sharedPackages: string[];
            }
          | undefined;

        // Project features
        features?:
          | {
              i18n?: boolean | undefined;
              analytics?: boolean | undefined;
              themeMode?: "dark-light" | "dark" | "light" | undefined;
              authentication?: boolean | undefined;
              api?: boolean | undefined;
              database?: boolean | undefined;
              testing?: boolean | undefined;
              docker?: boolean | undefined;
              ci?: boolean | undefined;
              commands?: string[] | undefined;
              webview?: string[] | undefined;
              language?: string[] | undefined;
              themes?: string[] | undefined;
            }
          | undefined;

        // Development preferences
        preferredLibraries?:
          | {
              stateManagement?: string | undefined;
              formManagement?: string | undefined;
              styling?: string | undefined;
              uiComponents?: string | undefined;
              testing?: string | undefined;
              authentication?: string | undefined;
              database?: string | undefined;
              api?: string | undefined;
              linting?: string | undefined;
              formatting?: string | undefined;
              deployment?: string | undefined;
              payment?: string | undefined;
              analytics?: string | undefined;
              monitoring?: string | undefined;
              logging?: string | undefined;
              forms?: string | undefined;
              validation?: string | undefined;
              documentation?: string | undefined;
              components?: string | undefined;
              icons?: string | undefined;
              mail?: string | undefined;
              search?: string | undefined;
              cache?: string | undefined;
              storage?: string | undefined;
              cdn?: string | undefined;
              cms?: string | undefined;
              i18n?: string | undefined;
              seo?: string | undefined;
              ui?: string | undefined;
              motion?: string | undefined;
              charts?: string | undefined;
              dates?: string | undefined;
              markdown?: string | undefined;
              security?: string | undefined;
              notifications?: string | undefined;
              uploads?: string | undefined;
              routing?: string | undefined;
            }
          | undefined;

        // Code style preferences
        codeStyle?:
          | {
              lineWidth?: number | undefined;
              cjsToEsm?: boolean | undefined;
              importSymbol?: string | undefined;
              indentSize?: number | undefined;
              indentStyle?: "space" | "tab" | undefined;
              dontRemoveComments?: boolean | undefined;
              shouldAddComments?: boolean | undefined;
              typeOrInterface?: "type" | "interface" | undefined;
              importOrRequire?: "import" | "require" | undefined;
              quoteMark?: "single" | "double" | undefined;
              semicolons?: boolean | undefined;
              trailingComma?: "all" | "es5" | "none" | undefined;
              bracketSpacing?: boolean | undefined;
              arrowParens?: "always" | "avoid" | undefined;
              tabWidth?: number | undefined;
              jsToTs?: boolean | undefined;
              modernize?:
                | {
                    replaceFs?: boolean | undefined;
                    replacePath?: boolean | undefined;
                    replaceHttp?: boolean | undefined;
                    replaceProcess?: boolean | undefined;
                    replaceConsole?: boolean | undefined;
                    replaceEvents?: boolean | undefined;
                  }
                | undefined;
            }
          | undefined;

        // Config revalidation
        configLastRevalidate?: string | undefined;
        configRevalidateFrequency?: string | undefined;

        // Dependencies management
        ignoreDependencies?: string[] | undefined;

        // Custom rules
        customRules?: Record<string, unknown> | undefined;
      }
    | undefined;
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

export type DetectedProject = {
  name: string;
  path: string;
  config: ReliverseConfig;
  gitStatus?: {
    uncommittedChanges: number;
    unpushedCommits: number;
  };
  needsDepsInstall?: boolean;
  hasGit?: boolean;
};

export type GitCommitOptions = {
  message: string;
  projectPath: string;
};

export type VSCodeSettings = {
  "editor.formatOnSave"?: boolean;
  "editor.defaultFormatter"?: string;
  "editor.codeActionsOnSave"?: Record<string, string>;
  "eslint.ignoreUntitled"?: boolean;
  "eslint.rules.customizations"?: { rule: string; severity: string }[];
  "markdownlint.config"?: Record<string, boolean>;
  "typescript.enablePromptUseWorkspaceTsdk"?: boolean;
};
