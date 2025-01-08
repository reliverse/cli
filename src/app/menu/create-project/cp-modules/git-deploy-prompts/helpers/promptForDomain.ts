import { inputPrompt, selectPrompt } from "@reliverse/prompts";
import pc from "picocolors";

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
        label: "No, use default Vercel domain only",
        value: "default",
        hint: defaultDomain,
      },
      {
        label: `Yes, configure custom domain ${pc.red("[🚨 Experimental]")}`,
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
    content: "example.com",
    validate: validateDomain,
  });

  return domain || defaultDomain;
}
