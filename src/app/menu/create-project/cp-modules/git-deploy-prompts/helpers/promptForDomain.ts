import { inputPrompt, selectPrompt } from "@reliverse/prompts";

import { DEFAULT_DOMAIN } from "~/libs/sdk/constants.js";
import { experimental } from "~/utils/badgeNotifiers.js";
import { recommended } from "~/utils/badgeNotifiers.js";

/**
 * Validates and formats a domain name
 */
function validateDomain(domain: string): string | boolean {
  if (!domain) return "Domain is required";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return "Invalid domain format";
  }
  return true;
}

/**
 * Prompts for and validates a custom domain
 */
export async function promptForDomain(projectName: string): Promise<string> {
  const defaultDomain = `${projectName}.vercel.app`;

  const useDomain = await selectPrompt({
    title: "Would you like to use a custom domain?",
    content: "You can add a custom domain later in the Vercel dashboard.",
    options: [
      {
        label: `No, use default Vercel domain only ${recommended}`,
        value: "default",
        hint: defaultDomain,
      },
      {
        label: `Yes, configure custom domain ${experimental}`,
        value: "custom",
        hint: "The default domain will still be generated",
      },
    ],
    defaultValue: "default",
  });

  if (useDomain === "default") {
    return defaultDomain;
  }

  const domain = await inputPrompt({
    title: "Enter your custom domain:",
    content: DEFAULT_DOMAIN,
    validate: validateDomain,
  });

  return domain || defaultDomain;
}
