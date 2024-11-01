import { consola } from "consola";
import { generate } from "random-words";

import { validate } from "~/utils/validate";

export async function askAppName(): Promise<string> {
  const placeholder = generate({ exactly: 3, join: "-" });

  const name = await consola.prompt("Enter the project name:", {
    default: placeholder,
    placeholder,
    type: "text",
  });

  validate(name, "string", "Project creation canceled.");

  return name;
}
