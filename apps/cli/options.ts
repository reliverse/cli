// Debug settings to control verbose logging and temp clone cleanup behavior
export const DEBUG = {
  alphaFeaturesEnabled: false,
  disableTempCloneRemoving: true, // Control whether the temp clone folder is removed
  enableVerboseLogging: false, // Toggle verbose logging on or off
};

// File conflict settings, useful for prompting user to resolve conflicts during project setup
export const FILE_CONFLICTS = [
  {
    description: "ESLint config",
    fileName: ".eslintrc.cjs",
    shouldCopy: false, // Deprecated file, don't copy
  },
  {
    customMessage:
      "Biome will be installed, so Prettier is not necessary. What would you like to do?",
    description: "Prettier config",
    fileName: "prettier.config.js",
  },
  {
    description: "TypeScript config",
    fileName: "tsconfig.json",
  },
];

// Command-line arguments to check if we are in development mode
const args = process.argv.slice(2);

export const isDev = args.includes("--dev");

export const REPO_FULL_URLS = {
  relivatorGithubLink: "https://github.com/blefnk/relivator-nextjs-template",
};

export const REPO_SHORT_URLS = {
  relivatorGithubLink: "blefnk/relivator-nextjs-template",
  versatorGithubLink: "blefnk/versator-nextjs-template",
};

// Path settings for important files and directories
export const FILE_PATHS = {
  layoutFile: "src/app/layout.tsx", // Path to layout file in the repo
  pageFile: "src/app/page.tsx", // Path to page file in the repo
  tempRepoClone: "temp-repo-clone", // Default temp clone folder name
};

// Files required for i18n setup
export const FILES_TO_DOWNLOAD = [FILE_PATHS.layoutFile, FILE_PATHS.pageFile];

// File categories used in conflict resolution or file download operations
export const fileCategories: Record<string, string[]> = {
  biome: ["biome.json"],
  eslint: [".eslintrc.cjs", "eslint.config.js"],
  GitHub: [".github", "README.md"],
  IDE: [".vscode"],
  putout: [".putout.json"],
  "Reliverse configs": ["reliverse.config.ts", "reliverse.info.ts"],
};

// =======================================================================
// FUTURE CONFIGURATIONS FOR RELIVATOR BUILDS (Placeholders for future features)
// =======================================================================

// Example of a configuration for future use
// export const RELIVATOR_CONFIG = {
//   authProvider: "clerk" as "authjs" | "clerk" | "none", // Authentication provider options
//   databaseDialect: "postgresql" as "mysql" | "postgresql" | "sqlite", // Database dialect options
//   databaseProvider: "neon" as "neon" | "planetscale" | "turso", // Database providers for Reliverse
//   disableDonateButton: false, // Option to disable donation button
//   frameworkVersion: "1.2.6", // Framework version
//   hideEnvInfo: false, // Toggle to hide environment info
//   packageManager: "bun" as "bun" | "pnpm", // Future: default package manager
// };

// =======================================================================
// Helper types for various configurations
// =======================================================================

// export type PackageManager = "bun" | "pnpm";

// export type AuthProvider = "authjs" | "clerk" | "none";

// export type DatabaseDialect = "mysql" | "postgresql" | "sqlite";

// export type DatabaseProvider =
//   | "neon"
//   | "planetscale"
//   | "private-mysql"
//   | "private-pg"
//   | "railway-mysql"
//   | "railway-pg"
//   | "turso"
//   | "vercel";

// =======================================================================
// Example configurations for potential usage in the future
// =======================================================================

// export const databaseConfig = {
//   provider: "neon" as DatabaseProvider,
//   dialect: "postgresql" as DatabaseDialect,
//   prefix: process.env.NEXT_PUBLIC_DATABASE_PREFIX || "bleverse",
// };
