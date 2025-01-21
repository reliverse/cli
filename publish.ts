// 👉 usage example: `bun pub --bump=1.2.3`

import { defineCommand, runMain } from "citty";
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
      console.log("Publishing the JSR version");
      await execa("bun", ["build.publish.ts", args.bump, "--jsr"], {
        stdio: "inherit",
      });
    } else if (args.npm) {
      console.log("Publishing the NPM version");
      await execa("bun", ["build.publish.ts", args.bump], { stdio: "inherit" });
    } else if (args.dryRun) {
      console.log("Dry run the publish process");
      await execa("bun", ["pub:jsr", "--dry-run"], { stdio: "inherit" });
      await execa("bun", ["pub:npm", "--dry-run"], { stdio: "inherit" });
    } else {
      console.log("Publishing the JSR version");
      await execa("bun", ["build.publish.ts", args.bump, "--jsr"], {
        stdio: "inherit",
      });
      console.log("Publishing the NPM version");
      await execa("bun", ["pub:npm", args.bump], { stdio: "inherit" });
    }
  },
});

function errorHandler(error: unknown, message: string) {
  console.error(message);
  console.error(error instanceof Error ? error.message : String(error));
}

await runMain(main).catch((error: unknown) => {
  errorHandler(
    error instanceof Error ? error : new Error(String(error)),
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  );
});
