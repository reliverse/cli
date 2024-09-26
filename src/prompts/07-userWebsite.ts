import { consola } from "consola";

import { validate } from "~/prompts/utils/validate";

// Prompt user for their website
export async function userWebsite(): Promise<string> {
  const placeholder = "relivator.com"; // Default placeholder
  const website = await consola.prompt("Enter your website:", {
    default: placeholder,
    placeholder,
    type: "text",
  });

  validate(website, "string", "Website prompt canceled.");

  return website;
}
