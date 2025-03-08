import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import { cliDomainDocs, cliVersion } from "./libs/sdk/constants.js";

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: cliVersion,
    description: cliDomainDocs,
  },
  subCommands: {
    cli: () => import("./app/app-mod.js").then((r) => r.default),
    help: () => import("./arg/help/help-mod.js").then((r) => r.default),
    login: () => import("./arg/login/login-mod.js").then((r) => r.default),
    logout: () => import("./arg/logout/logout-mod.js").then((r) => r.default),
    schema: () => import("./arg/schema/schema-mod.js").then((r) => r.default),
    memory: () => import("./arg/memory/memory-mod.js").then((r) => r.default),
    studio: () => import("./arg/studio/studio-mod.js").then((r) => r.default),
    update: () => import("./arg/update/update-mod.js").then((r) => r.default),
    multireli: () =>
      import("./arg/multireli/multireli-mod.js").then((r) => r.default),
    env: () => import("./arg/env/env-mod.js").then((r) => r.default),
  },
});

await runMain(main).catch((error: unknown) => {
  relinka("error", "Aborting...");
  errorHandler(
    error instanceof Error ? error : new Error(String(error)),
    "It was an unhandled error. Errors can be reported at https://github.com/reliverse/cli",
  );
});
