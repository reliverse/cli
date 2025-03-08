import { inputPrompt, isValidName } from "@reliverse/prompts";
import { generate } from "random-words";

export async function askProjectName({
  repoName = "",
}: {
  repoName?: string;
}): Promise<string> {
  let defaultValue: string;

  if (repoName) {
    // Extract the repo name from the full path and use it as default
    defaultValue = repoName.split("/").pop() ?? "";
  } else {
    // Only generate random name if no repo name is provided
    defaultValue = generate({ exactly: 2, join: "-" });
  }

  const title = repoName
    ? "How should I name proceeding project?"
    : "How should I name your brand new project?";

  const content = repoName
    ? "This name will be used to create the project directory."
    : "This name may be used to create the project directory, throughout the project, etc.";

  const placeholder = repoName
    ? `Press <Enter> to use the repository name: ${defaultValue}`
    : `I've just generated a random name for you (press <Enter> to use it): ${defaultValue}`;

  const name = await inputPrompt({
    title,
    content,
    placeholder,
    defaultValue,
    validate: (value: string) =>
      isValidName(value).isValid || `Invalid project name: ${value}`,
  });

  return name.toString();
}
