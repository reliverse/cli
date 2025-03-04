export type Behavior = "prompt" | "autoYes" | "autoNo";

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

export type MonorepoType =
  | "turborepo"
  | "moonrepo"
  | "bun-workspaces"
  | "pnpm-workspaces";

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

export type NavigationEntry = {
  items?: Record<string, NavigationEntry>;
  label?: string;
  link?: string;
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

export type ModernReplacement = {
  pattern: RegExp;
  replacement: string;
  description: string;
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
