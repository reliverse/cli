// 👉 Usage example: `bun pub --bump=1.2.3`
// - The script checks the current version in package.json.
// - It searches for the found string throughout the project.
// - It replaces the occurrences with the version specified in --bump.

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execa } from "execa";

import { cliName } from "~/app/constants.js";

const main = defineCommand({
  meta: {
    name: "pub",
  },
  args: {
    bump: {
      type: "string",
      description: "Specify the version to bump to",
      valueHint: "1.2.3",
    },
    dryRun: {
      type: "boolean",
      description: "Simulate the publish process without making changes",
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
    await execa("bun", ["dev:schema"], { stdio: "inherit" });
    await execa("bun", ["check"], { stdio: "inherit" });

    if (args.jsr) {
      relinka("info", "Publishing the JSR version");
      await execa("bun", ["build.publish.ts", args.bump, "--jsr"], {
        stdio: "inherit",
      });
    } else if (args.npm) {
      relinka("info", "Publishing the NPM version");
      await execa("bun", ["build.publish.ts", args.bump], { stdio: "inherit" });
    } else if (args.dryRun) {
      relinka("info", "Simulating the publish process");
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
    `If this issue is related to ${cliName} itself, please\n│  report the details at https://github.com/reliverse/cli`,
  ),
);
