#!/usr/bin/env node

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { cliVersion } from "./app/constants.js";

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: cliVersion,
    description: "https://docs.reliverse.org",
  },
  subCommands: {
    cli: () => import("~/app/app-mod.js").then((r) => r.default),
    help: () => import("~/args/help/help-mod.js").then((r) => r.default),
    login: () => import("~/args/login/login-mod.js").then((r) => r.default),
    logout: () => import("~/args/logout/logout-mod.js").then((r) => r.default),
    schema: () => import("~/args/schema/schema-mod.js").then((r) => r.default),
    memory: () => import("~/args/memory/memory-mod.js").then((r) => r.default),
    studio: () => import("~/args/studio/studio-mod.js").then((r) => r.default),
    update: () => import("~/args/update/update-mod.js").then((r) => r.default),
  },
});

await runMain(main).catch((error: unknown) => {
  relinka("error", "Aborting...");
  errorHandler(
    error instanceof Error ? error : new Error(String(error)),
    "Errors can be reported at https://github.com/reliverse/cli",
  );
});
