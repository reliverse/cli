import { confirm } from "@inquirer/prompts";

import { validate } from "~/utils/validate";

export async function askInternationalizationSetup(): Promise<boolean> {
  const useI18n = await confirm({
    default: true,
    message:
      "Do you want to enable i18n (internationalization) for this project?",
  });

  validate(useI18n, "boolean", "i18n setup canceled.");

  return useI18n;
}
