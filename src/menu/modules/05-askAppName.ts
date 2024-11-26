import { inputPrompt } from "@reliverse/prompts";
import { generate } from "random-words";

import { validate } from "~/utils/validate.js";

export async function askAppName(): Promise<string> {
  const placeholder = generate({ exactly: 3, join: "-" });

  const name = await inputPrompt({
    title: "Enter the project name:",
    defaultValue: placeholder,
    placeholder,
  });

  validate(name, "string", "Project creation canceled.");

  return name.toString();
}
