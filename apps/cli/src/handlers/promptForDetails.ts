import { promptWithConfig } from "~/prompts";
import { promptsConfig } from "~/config";
import color from "picocolors";
import { formatPromptMessage } from "~/utils";

export async function promptForDetails() {
  for (const key of Object.keys(promptsConfig) as Array<
    keyof typeof promptsConfig
  >) {
    const value = await promptWithConfig(
      key,
      formatPromptMessage(
        `Enter your ${key.replace(/([A-Z])/g, " $1").toLowerCase()}:`,
      ),
    );

    if (!value) {
      console.log(color.red("Input cannot be empty."));
    }
  }
}
