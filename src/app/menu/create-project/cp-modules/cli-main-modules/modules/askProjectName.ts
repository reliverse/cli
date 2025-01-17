import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";
import { generate } from "random-words";

import { isValidName } from "~/utils/validateHelpers.js";

export async function askProjectName(): Promise<string> {
  const placeholder = generate({ exactly: 2, join: "-" });

  const name = await inputPrompt({
    title: "How should I name your app?",
    content:
      "This name will be used to create the project directory and throughout the project.",
    hint: pc.dim(`Press <Enter> to use the default value (${placeholder})`),
    defaultValue: placeholder,
    placeholder: `I've just generated a random name for you: ${placeholder}`,
    validate: (value) => isValidName(value).isValid || "Invalid project name",
  });

  return name.toString();
}
