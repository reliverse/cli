import { promptWithConfig } from "~/utils/promptsUtils";
import { promptsConfig } from "~/prompts";
import color from "picocolors";
import { title } from "~/utils/generalUtils";

export async function askProjectDetails() {
  for (const key of Object.keys(promptsConfig) as Array<
    keyof typeof promptsConfig
  >) {
    const value = await promptWithConfig(
      key,
      title(`Enter your ${key.replace(/([A-Z])/g, " $1").toLowerCase()}:`),
    );

    if (!value) {
      console.log(color.red("Input cannot be empty."));
    }
  }
}
