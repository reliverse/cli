import { defineCommand } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { generateSchemaFile } from "~/utils/schemaConfig.js";

export default defineCommand({
  meta: {
    name: "schema",
    description: "Generate JSON schema for .reliverse configuration",
  },
  run: async () => {
    try {
      await generateSchemaFile();
      relinka("success", "Generated schema.json successfully!");
    } catch (error) {
      relinka(
        "error",
        "Failed to generate schema:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  },
});
