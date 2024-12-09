#!/usr/bin/env node

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";

import { showAnykeyPrompt } from "./app/data/prompts.js";
import { app } from "./app/mod.js";
import { auth } from "./args/login/impl.js";
import { isConfigExists } from "./utils/config.js";

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: "1.3.8",
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
  },
  run: async ({ args }) => {
    const config = await isConfigExists();
    if (!config) {
      await showAnykeyPrompt("welcome");
      await showAnykeyPrompt("privacy");
      await auth({ dev: args.dev, useLocalhost: false });
    }
    await app({ isDev: args.dev });
    process.exit(0);
  },
  subCommands: {
    help: () => import("~/args/help/mod.js").then((r) => r.default),
    login: () => import("~/args/login/mod.js").then((r) => r.default),
    logout: () => import("~/args/logout/mod.js").then((r) => r.default),
    memory: () => import("~/args/memory/mod.js").then((r) => r.default),
  },
});

await runMain(main).catch((error: Error) =>
  errorHandler(
    error,
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
