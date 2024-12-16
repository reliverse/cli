import type { DeploymentService } from "./common.js";

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

  // Config revalidation
  configLastRevalidate?: string; // ISO date string
  configRevalidateFrequency?: string; // 1h | 1d | 2d | 7d

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

  // Dependencies Management
  ignoreDependencies?: string[];

  // Custom Extensions
  customRules?: Record<string, unknown>;
};
