// 👉 usage example: `bun pub --bump=1.2.3`

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execa } from "execa";

const main = defineCommand({
  meta: {
    name: "pub",
  },
  args: {
    bump: {
      type: "string",
      description: "Bump the version",
      valueHint: "1.2.3",
    },
    dryRun: {
      type: "boolean",
      description: "Dry run the publish process",
    },
    jsr: {
      type: "boolean",
      description: "Publish the JSR version",
    },
    npm: {
      type: "boolean",
      description: "Publish the NPM version",
    },
  },
  run: async ({ args }) => {
    if (args.jsr) {
      relinka("info", "Publishing the JSR version");
      await execa("bun", ["build.publish.ts", args.bump, "--jsr"], {
        stdio: "inherit",
      });
    } else if (args.npm) {
      relinka("info", "Publishing the NPM version");
      await execa("bun", ["build.publish.ts", args.bump], { stdio: "inherit" });
    } else if (args.dryRun) {
      relinka("info", "Dry run the publish process");
      await execa("bun", ["pub:jsr", "--dry-run"], { stdio: "inherit" });
      await execa("bun", ["pub:npm", "--dry-run"], { stdio: "inherit" });
    } else {
      relinka("info", "Publishing the JSR version");
      await execa("bun", ["build.publish.ts", args.bump, "--jsr"], {
        stdio: "inherit",
      });
      relinka("info", "Publishing the NPM version");
      await execa("bun", ["pub:npm", args.bump], { stdio: "inherit" });
    }
  },
});

await runMain(main).catch((error: unknown) =>
  errorHandler(
    error instanceof Error ? error : new Error(String(error)),
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
