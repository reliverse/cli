import { z } from "zod";

import type { ReliverseConfig } from "~/types.js";

// Feature schema
const featuresSchema = z.object({
  i18n: z.boolean().default(true),
  analytics: z.boolean().default(false),
  themeMode: z.enum(["light", "dark", "dark-light"]).default("dark-light"),
  authentication: z.boolean().default(true),
  api: z.boolean().default(true),
  database: z.boolean().default(true),
  testing: z.boolean().default(false),
  docker: z.boolean().default(false),
  ci: z.boolean().default(false),
  commands: z.array(z.string()).default([]),
  webview: z.array(z.string()).default([]),
  language: z.array(z.string()).default(["typescript"]),
  themes: z.array(z.string()).default(["default"]),
});

// Code style schema
const codeStyleSchema = z.object({
  lineWidth: z.number().min(1).max(200).default(80),
  indentSize: z.number().min(1).max(8).default(2),
  indentStyle: z.enum(["space", "tab"]).default("space"),
  quoteMark: z.enum(["single", "double"]).default("double"),
  semicolons: z.boolean().default(true),
  trailingComma: z.enum(["none", "es5", "all"]).default("all"),
  bracketSpacing: z.boolean().default(true),
  arrowParens: z.enum(["always", "avoid"]).default("always"),
  tabWidth: z.number().min(1).max(8).default(2),
  jsToTs: z.boolean().default(false),
});

const monorepoSchema = z
  .object({
    type: z.enum(["none", "turborepo", "nx", "pnpm"]),
    packages: z.array(z.string()),
    sharedPackages: z.array(z.string()),
  })
  .default({
    type: "none",
    packages: [],
    sharedPackages: [],
  });

// Experimental schema
const experimentalSchema = z.object({
  // Project details
  projectName: z.string().min(1),
  projectAuthor: z.string().min(1),
  projectDescription: z.string().default(""),
  projectVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+/)
    .default("0.1.0"),
  projectLicense: z.string().default("MIT"),
  projectRepository: z.string().url().optional(),
  projectDeployService: z.enum(["vercel", "netlify", "railway"]).optional(),
  projectDomain: z.string().url().optional(),

  // Project features
  features: featuresSchema.default({}),

  // Development preferences
  projectFramework: z.string().default("nextjs"),
  projectPackageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).default("npm"),
  projectFrameworkVersion: z.string().optional(),
  nodeVersion: z.string().optional(),
  runtime: z.string().optional(),
  monorepo: monorepoSchema,
  preferredLibraries: z.record(z.string()).default({}),
  codeStyle: codeStyleSchema.default({}),

  // Dependencies management
  ignoreDependencies: z.array(z.string()).default([]),

  // Custom rules
  customRules: z.record(z.unknown()).default({}),

  // Generation preferences
  skipPromptsUseAutoBehavior: z.boolean().default(false),
  deployBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  depsBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  gitBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  i18nBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
  scriptsBehavior: z.enum(["prompt", "autoYes", "autoNo"]).default("prompt"),
});

export const reliverseConfigSchema: z.ZodType<ReliverseConfig> = z.object({
  experimental: experimentalSchema,
});
