#!/usr/bin/env node

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";

import { logger } from "./app/menu/show-composer-mode/helpers/utils/logger.js";

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: "1.4.3",
    description: "https://docs.reliverse.org",
  },
  subCommands: {
    cli: () => import("~/app/mod.js").then((r) => r.default),
    help: () => import("~/args/help/mod.js").then((r) => r.default),
    login: () => import("~/args/login/mod.js").then((r) => r.default),
    logout: () => import("~/args/logout/mod.js").then((r) => r.default),
    config: () => import("~/args/config/mod.js").then((r) => r.default),
    memory: () => import("~/args/memory/mod.js").then((r) => r.default),
    studio: () => import("~/args/studio/mod.js").then((r) => r.default),
  },
});

await runMain(main).catch((error: unknown) => {
  logger.error("Aborting...");
  errorHandler(
    error instanceof Error ? error : new Error(String(error)),
    "Errors can be reported at https://github.com/reliverse/cli",
  );
});
