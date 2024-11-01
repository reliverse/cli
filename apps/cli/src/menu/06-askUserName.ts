import { consola } from "consola";
import { generate } from "random-words";

import { validate } from "~/utils/validate";

export async function askUserName(): Promise<string> {
  const placeholder = generate({ exactly: 1, join: "-" });
  const username = await consola.prompt("Enter your GitHub username:", {
    default: placeholder,
    placeholder,
    type: "text",
  });

  validate(username, "string", "GitHub username prompt canceled.");

  return username;
}
