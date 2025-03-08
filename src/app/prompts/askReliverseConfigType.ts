import { selectPrompt } from "@reliverse/prompts";

/**
 * Prompts the user to select a config file type (JSONC or TS)
 * @returns The selected config type ('jsonc' or 'ts')
 */
export async function askReliverseConfigType(): Promise<"jsonc" | "ts"> {
  return await selectPrompt({
    title:
      "Please select a Reliverse CLI configuration file type. JSONC is recommended for most projects.",
    content:
      "A tsconfig.json file was detected. You can use the TypeScript config type for this project; however, it requires @reliverse/config to be installed; without it, the Reliverse CLI cannot run correctly when using the TS config type.",
    options: [
      { label: "JSONC (reliverse.jsonc)", value: "jsonc" },
      { label: "TypeScript (reliverse.ts)", value: "ts" },
    ],
    defaultValue: "jsonc",
  });
}
