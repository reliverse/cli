import { inputPrompt } from "@reliverse/prompts";
import { generate } from "random-words";

import { validate } from "~/utils/validate.js";

export async function askProjectName(): Promise<string> {
  const placeholder = generate({ exactly: 3, join: "-" });

  const name = await inputPrompt({
    title: "How should I name your app?",
    content:
      "This name will be used to create the project directory and throughout the project.",
    hint: "Press <Enter> to use the default value.",
    defaultValue: placeholder,
    placeholder: `I've just generated a random name for you: ${placeholder}`,
  });

  validate(name, "string", "Project creation canceled.");

  return name.toString();
}
