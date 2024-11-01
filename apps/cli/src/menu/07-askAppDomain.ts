import { consola } from "consola";

import { validate } from "~/utils/validate";

export async function askAppDomain(): Promise<string> {
  const placeholder = "relivator.com";
  const website = await consola.prompt("Enter your website:", {
    default: placeholder,
    placeholder,
    type: "text",
  });

  validate(website, "string", "Website prompt canceled.");

  return website;
}
