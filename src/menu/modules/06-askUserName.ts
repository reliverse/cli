import { inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { generate } from "random-words";

import { validate } from "~/utils/validate.js";

export async function askUserName(): Promise<string> {
  const placeholder = generate({ exactly: 1, join: "-" });
  const username = await inputPrompt({
    title: "Enter your GitHub username:",
    defaultValue: placeholder,
    placeholder,
  });

  validate(username, "string", "GitHub username prompt canceled.");

  return username;
}
