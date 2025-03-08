import { defineCommand } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import { generateSchemaFile } from "~/libs/config/config-main.js";
import { cliConfigJsonc } from "~/libs/sdk/constants.js";

export default defineCommand({
  meta: {
    name: "schema",
    description: `Generate JSON schema for ${cliConfigJsonc} configuration`,
    hidden: true,
  },
  run: async () => {
    try {
      await generateSchemaFile();
      relinka(
        "success",
        `Generated schema.json for ${cliConfigJsonc} successfully!`,
      );
    } catch (error) {
      relinka(
        "error",
        "Failed to generate schema:",
        error instanceof Error ? error.message : JSON.stringify(error),
      );
      process.exit(1);
    }
  },
});
