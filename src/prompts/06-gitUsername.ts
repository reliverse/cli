import { consola } from "consola";
import { generate } from "random-words";

import { validate } from "~/prompts/utils/validate";

// Prompt user for the GitHub username
export async function githubUsername(): Promise<string> {
  const placeholder = generate({ exactly: 1, join: "-" });
  const username = await consola.prompt("Enter your GitHub username:", {
    default: placeholder,
    placeholder,
    type: "text",
  });

  validate(username, "string", "GitHub username prompt canceled.");

  return username;
}
