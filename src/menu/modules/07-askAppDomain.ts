import { inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { validate } from "~/utils/validate.js";

export async function askAppDomain(): Promise<string> {
  const placeholder = "relivator.com";
  const website = await inputPrompt({
    title: "Enter your website:",
    defaultValue: placeholder,
    placeholder,
  });

  validate(website, "string", "Website prompt canceled.");

  return website;
}
