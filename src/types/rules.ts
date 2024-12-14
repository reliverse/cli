import type { DeploymentService } from "./config.js";

export type PreferredLibraries = {
  stateManagement?: "zustand" | "jotai" | "redux-toolkit" | "none";
  formManagement?: "react-hook-form" | "formik" | "none";
  styling?: "tailwind" | "styled-components" | "css-modules" | "sass";
  uiComponents?: "shadcn-ui" | "material-ui" | "chakra-ui" | "none";
  testing?: "jest" | "vitest" | "playwright" | "cypress" | "none";
  authentication?: "next-auth" | "clerk" | "auth0" | "supabase-auth" | "none";
  database?: "prisma" | "drizzle" | "mongoose" | "none";
  api?: "trpc" | "graphql" | "rest" | "none";
};

export type CodeStylePreferences = {
  dontRemoveComments: boolean;
  shouldAddComments: boolean;
  typeOrInterface: "type" | "interface" | "mixed";
  importOrRequire: "import" | "require" | "mixed";
  quoteMark: "single" | "double";
  semicolons: boolean;
  maxLineLength: number;
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
  // Project Info
  appName: string;
  appAuthor: string;
  appDescription?: string;
  appVersion?: string;
  appLicense?: string;
  appRepository?: string;

  // Technical Stack
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

  // Development Preferences
  preferredLibraries: PreferredLibraries;
  codeStyle: CodeStylePreferences;

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

  // Custom Extensions
  customRules?: Record<string, unknown>;
};