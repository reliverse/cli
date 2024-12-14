#!/usr/bin/env node

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";

import { showAnykeyPrompt } from "./app/menu/showAnykeyPrompt.js";
import { app } from "./app/mod.js";
import { auth } from "./args/login/impl.js";
import { readReliverseMemory } from "./args/memory/impl.js";
import studioCommand from "./args/studio/mod.js";
import { readConfig, parseCliArgs } from "./utils/config.js";
import { getCurrentWorkingDirectory } from "./utils/fs.js";

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: "1.3.22",
    description: "@reliverse/cli",
  },
  args: {
    dev: {
      type: "boolean",
      description: "Run the CLI in dev mode",
    },
    nodata: {
      type: "boolean",
      description: "Run the CLI without collecting any data (coming soon)",
    },
    deploy: {
      type: "boolean",
      description: "Automatically answer 'yes' to deployment prompt",
    },
    "no-deps": {
      type: "boolean",
      description:
        "Automatically answer 'no' to dependency installation prompt",
    },
    "no-git": {
      type: "boolean",
      description: "Automatically answer 'no' to git initialization prompt",
    },
    "no-i18n": {
      type: "boolean",
      description: "Automatically answer 'no' to i18n configuration prompt",
    },
    "no-db": {
      type: "boolean",
      description: "Automatically answer 'no' to database scripts prompts",
    },
    template: {
      type: "string",
      description: "Template to use (GitHub repository URL)",
    },
    username: {
      type: "string",
      description: "Your name for project attribution",
    },
    "github-username": {
      type: "string",
      description: "Your GitHub username for deployment",
    },
    "vercel-username": {
      type: "string",
      description: "Your Vercel team name for deployment",
    },
    domain: {
      type: "string",
      description: "Domain for the project",
    },
    category: {
      type: "string",
      description: "Project category (currently only 'development')",
    },
    "project-type": {
      type: "string",
      description: "Project type (currently only 'website')",
    },
    framework: {
      type: "string",
      description: "Framework to use (currently only 'nextjs')",
    },
    "website-category": {
      type: "string",
      description: "Website category (currently only 'e-commerce')",
    },
  },
  run: async ({ args }) => {
    const cwd = getCurrentWorkingDirectory();
    const config = await readConfig(cwd);
    const cliConfig = parseCliArgs(process.argv.slice(2));

    // Merge configurations with CLI args taking precedence
    const mergedConfig = { ...config, ...cliConfig };

    // Check for existing authentication in SQLite
    const memory = await readReliverseMemory();
    const isAuthenticated = memory.code && memory.key;

    if (!isAuthenticated) {
      await showAnykeyPrompt("welcome");
      await showAnykeyPrompt("privacy");
      await auth({ dev: args.dev, useLocalhost: false });
    }

    await app({ isDev: args.dev, config: mergedConfig });
    process.exit(0);
  },
  subCommands: {
    help: () => import("~/args/help/mod.js").then((r) => r.default),
    login: () => import("~/args/login/mod.js").then((r) => r.default),
    logout: () => import("~/args/logout/mod.js").then((r) => r.default),
    memory: () => import("~/args/memory/mod.js").then((r) => r.default),
    config: () => import("~/args/config/mod.js").then((r) => r.default),
    studio: studioCommand,
  },
});

await runMain(main).catch((error: Error) =>
  errorHandler(
    error,
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
