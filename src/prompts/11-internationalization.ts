import { confirm } from "@inquirer/prompts";

import { validate } from "~/prompts/utils/validate";

// Prompt to ask the user if they want i18n support
export async function promptI18n(): Promise<boolean> {
  const useI18n = await confirm({
    default: true,
    message:
      "Do you want to enable i18n (internationalization) for this project?",
  });

  validate(useI18n, "boolean", "i18n setup canceled.");

  return useI18n;
}
