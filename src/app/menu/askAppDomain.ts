import { inputPrompt } from "@reliverse/prompts";

import { validate } from "~/utils/validate.js";

export async function askAppDomain(projectName: string): Promise<string> {
  const url = `${projectName}.vercel.app`;
  const website = await inputPrompt({
    title: "Do you want to use a custom domain? (You can change it later)",
    placeholder: `Default is ${url} (😅 I don't know if it's available)`,
    defaultValue: url,
  });

  validate(website, "string", "Website prompt canceled.");

  return website;
}
