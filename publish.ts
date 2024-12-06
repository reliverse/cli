import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import { execa } from "execa";

const main = defineCommand({
  meta: {
    name: "reliverse",
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
      await execa("bun", ["pub:jsr", args.bump]);
    }
    if (args.npm) {
      console.log("Publishing the NPM version");
      await execa("bun", ["pub:npm", args.bump]);
    }
    if (args.dryRun) {
      console.log("Dry run the publish process");
      await execa("bun", ["pub:jsr", "--dry-run"]);
      await execa("bun", ["pub:npm", "--dry-run"]);
    } else {
      await execa("bun", ["pub"]);
    }
  },
});

await runMain(main).catch((error: Error) =>
  errorHandler(
    error,
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
