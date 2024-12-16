import {
  confirmPrompt,
  inputPrompt,
  multiselectPrompt,
  selectPrompt,
} from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { fetch } from "node-fetch-native";
import open from "open";
import path from "pathe";

import { relinka } from "~/utils/console.js";

enum KeyVars {
  NEXT_PUBLIC_APP_URL = "NEXT_PUBLIC_APP_URL",
  DATABASE_URL = "DATABASE_URL",
  AUTH_SECRET = "AUTH_SECRET",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  CLERK_SECRET_KEY = "CLERK_SECRET_KEY",
  CLERK_ENCRYPTION_KEY = "CLERK_ENCRYPTION_KEY",
  UPLOADTHING_TOKEN = "UPLOADTHING_TOKEN",
  UPLOADTHING_SECRET = "UPLOADTHING_SECRET",
  RESEND_API_KEY = "RESEND_API_KEY",
  EMAIL_FROM_ADDRESS = "EMAIL_FROM_ADDRESS",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  STRIPE_API_KEY = "STRIPE_API_KEY",
  STRIPE_WEBHOOK_SECRET = "STRIPE_WEBHOOK_SECRET",
  STRIPE_PRO_MONTHLY_PRICE_ID = "STRIPE_PRO_MONTHLY_PRICE_ID",
}

export type KeyType =
  | "string"
  | "email"
  | "password"
  | "number"
  | "boolean"
  | "database";

export type ServiceKey = {
  key: KeyVars;
  type?: KeyType;
  defaultValue?: string;
  instruction?: string;
  hidden?: boolean;
};

export type KnownService = {
  name: string;
  dashboardUrl?: string;
  keys: ServiceKey[];
};

const KNOWN_SERVICES: Record<string, KnownService> = {
  GENERAL: {
    name: "General",
    keys: [
      {
        key: KeyVars.NEXT_PUBLIC_APP_URL,
        defaultValue: "http://localhost:3000",
        instruction:
          "The public URL where your app will be hosted. Use localhost:3000 for development.",
      },
    ],
  },
  DATABASE: {
    name: "Database",
    keys: [
      {
        key: KeyVars.DATABASE_URL,
        type: "database",
        instruction:
          "For Neon, create a new project there and copy the connection string. Should start with: postgresql://",
      },
    ],
    dashboardUrl: "https://neon.tech",
  },
  CLERK: {
    name: "Clerk",
    keys: [
      {
        key: KeyVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        instruction:
          "- Your Clerk publishable key starting with 'pk_test_' or 'pk_live_'\n- If you already have an account, you can easily find it here: https://clerk.com/docs/quickstarts/nextjs",
      },
      {
        key: KeyVars.CLERK_SECRET_KEY,
        instruction:
          "- Your Clerk secret key starting with 'sk_test_' or 'sk_live_'\n- If you already have an account, you can easily find it here: https://clerk.com/docs/quickstarts/nextjs",
      },
      {
        key: KeyVars.CLERK_ENCRYPTION_KEY,
        defaultValue: generateSecureString({
          charset: "alphanumeric",
          purpose: "encryption-key",
        }),
        hidden: true,
      },
    ],
    dashboardUrl: "https://clerk.com",
  },
  STRIPE: {
    name: "Stripe",
    keys: [
      {
        key: KeyVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        instruction:
          "- Developers > API keys > Publishable key\n- Starts with 'pk_test_' or 'pk_live_'",
      },
      {
        key: KeyVars.STRIPE_API_KEY,
        instruction:
          "- Developers > API keys > Secret key\n- Starts with 'sk_test_' or 'sk_live_'",
      },
      {
        key: KeyVars.STRIPE_WEBHOOK_SECRET,
        instruction:
          "Your Stripe webhook signing secret starting with 'whsec_'",
        defaultValue: "whsec_1234567890",
      },
      {
        key: KeyVars.STRIPE_PRO_MONTHLY_PRICE_ID,
        instruction:
          "The price ID for your monthly pro plan starting with 'price_'",
        defaultValue: "price_1234567890",
      },
    ],
    dashboardUrl: "https://dashboard.stripe.com/test/apikeys",
  },
  UPLOADTHING: {
    name: "Uploadthing",
    keys: [
      {
        key: KeyVars.UPLOADTHING_TOKEN,
        instruction: "Your Uploadthing app token from the dashboard",
      },
      {
        key: KeyVars.UPLOADTHING_SECRET,
        instruction:
          "Your Uploadthing secret key from the dashboard.\nStarts with 'sk_live_'",
      },
    ],
    dashboardUrl: "https://uploadthing.com/dashboard",
  },
  RESEND: {
    name: "Resend",
    keys: [
      {
        key: KeyVars.RESEND_API_KEY,
        instruction: "Your Resend API key starting with 're_'",
      },
      {
        key: KeyVars.EMAIL_FROM_ADDRESS,
        type: "email",
        defaultValue: "onboarding@resend.dev",
        instruction: "The email address you want to send emails from",
      },
    ],
    dashboardUrl: "https://resend.com/api-keys",
  },
  AUTHJS: {
    name: "Auth.js",
    keys: [
      {
        key: KeyVars.AUTH_SECRET,
        defaultValue: generateSecureString({
          charset: "alphanumeric",
          purpose: "auth-secret",
        }),
        hidden: true,
      },
    ],
  },
};

/**
 * Fetch content of .env.example from a remote resource.
 */
async function fetchEnvExampleContent(
  urlResource: string,
): Promise<string | null> {
  try {
    const response = await fetch(urlResource);
    if (!response.ok) {
      throw new Error(`Failed to fetch .env.example from ${urlResource}`);
    }
    return await response.text();
  } catch (error) {
    relinka("error", "Error fetching .env.example:", error.toString());
    return null;
  }
}

/**
 * Generate a secure random string for various security purposes.
 * @param options Configuration options for generating the secure string
 * @returns A cryptographically secure random string
 */
function generateSecureString({
  length = 44,
  charset = "alphanumeric",
  purpose = "general",
}: {
  length?: number;
  charset?: "alphanumeric" | "numeric" | "alphabetic";
  purpose?: string;
}): string {
  const charsets: Record<string, string> = {
    alphanumeric:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    numeric: "0123456789",
    alphabetic: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  };

  // Default lengths for specific purposes
  const purposeLengths: Record<string, number> = {
    "auth-secret": 44,
    "encryption-key": 64,
    general: 44,
  };

  // Use purpose-specific length if available
  const finalLength = purposeLengths[purpose] || length;
  const chars = charsets[charset] || charset;
  const bytes = new Uint8Array(finalLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => chars.charAt(byte % chars.length))
    .join("");
}

/**
 * Ensure .env file exists, creating from .env.example if necessary.
 */
async function ensureEnvFile(
  envPath: string,
  envExamplePath: string,
): Promise<void> {
  if (!(await fs.pathExists(envPath)) || (await fs.stat(envPath)).size === 0) {
    relinka("info-verbose", "Creating .env file from .env.example...");
    await fs.copy(envExamplePath, envPath);
  }
}

/**
 * Get required environment variable keys from .env.example.
 */
async function getRequiredEnvKeys(envExamplePath: string): Promise<string[]> {
  if (await fs.pathExists(envExamplePath)) {
    const content = await fs.readFile(envExamplePath, "utf8");
    return content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => line.split("=")[0].trim());
  }
  return [];
}

/**
 * Prompt user to fill missing values in .env file.
 */
async function promptAndSetMissingValues(
  missingKeys: string[],
  envPath: string,
): Promise<void> {
  relinka("info-verbose", `Missing values: ${missingKeys.join(", ")}`);

  // Read existing env file content
  const envContent = await fs.readFile(envPath, "utf8");
  const envLines = envContent.split("\n");

  // Filter out keys with default values for the prompt
  const filteredKeys = missingKeys.filter((key) => {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );

    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));
    return !keyConfig?.defaultValue; // Exclude keys with default values
  });

  // First, automatically save keys with default values
  for (const key of missingKeys) {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );

    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));

    if (keyConfig?.defaultValue) {
      // Update or append the key-value pair
      const lineIndex = envLines.findIndex((line) =>
        line.startsWith(`${keyConfig.key}=`),
      );
      // Ensure default value is wrapped in quotes
      const newLine = `${keyConfig.key}="${keyConfig.defaultValue}"`;

      if (lineIndex !== -1) {
        envLines[lineIndex] = newLine;
      } else {
        envLines.push(newLine);
      }

      relinka(
        "info-verbose",
        `Automatically saved default value for ${keyConfig.key}`,
      );
    }
  }

  // Update the env file with modified content
  await fs.writeFile(envPath, envLines.join("\n"));

  if (filteredKeys.length === 0) {
    relinka("info-verbose", "No missing keys require user input.");
    return;
  }

  // Group missing keys by service
  const servicesWithMissingKeys = Object.entries(KNOWN_SERVICES).filter(
    ([_, service]) => service.keys.some((k) => filteredKeys.includes(k.key)),
  );

  const selectedServices = await multiselectPrompt({
    title: "Great! Which services do you want to configure?",
    content:
      "✨ I'll try to open the dashboard of the selected services for you, where you can find the keys. Don't forget to get back to me. I'll be waiting for you in your terminal...",
    defaultValue: servicesWithMissingKeys.map(([key]) => key),
    titleColor: "blueBright",
    contentColor: "yellowBright",
    options: servicesWithMissingKeys.map(([key, service]) => ({
      label: service.name,
      value: key,
    })),
  });

  for (const serviceKey of selectedServices) {
    if (serviceKey === "skip") {
      continue;
    }

    const service = KNOWN_SERVICES[serviceKey];
    if (!service) {
      continue;
    }

    if (service.dashboardUrl) {
      relinka("info-verbose", `Opening ${service.name} dashboard...`);
      await open(service.dashboardUrl);
    }

    // Handle all keys for this service that need values
    for (const keyConfig of service.keys) {
      if (filteredKeys.includes(keyConfig.key)) {
        const value = await inputPrompt({
          title: `Enter value for ${keyConfig.key}:`,
          placeholder: "Paste your value here or leave empty to skip...",
          ...(keyConfig.instruction && {
            content: keyConfig.instruction,
            contentColor: "yellowBright",
          }),
          ...(service.dashboardUrl && {
            hint: `Opening ${service.dashboardUrl} website...`,
          }),
        });

        if (value.trim()) {
          // Extract the actual value, handling both direct values and key=value format
          const rawValue = value.startsWith(`${keyConfig.key}=`)
            ? value.substring(value.indexOf("=") + 1)
            : value;

          // Strip surrounding quotes (both single and double) if they exist
          const cleanValue = rawValue.trim().replace(/^['"](.*)['"]$/, "$1");

          // Find and update existing line or append new one
          const lineIndex = envLines.findIndex((line) =>
            line.startsWith(`${keyConfig.key}=`),
          );

          const newLine = `${keyConfig.key}="${cleanValue}"`;

          if (lineIndex !== -1) {
            envLines[lineIndex] = newLine;
          } else {
            envLines.push(newLine);
          }

          // Update the file after each key
          await fs.writeFile(envPath, envLines.join("\n"));
        }
      }
    }
  }

  relinka(
    "info",
    "Please note, I have skipped some keys and set them to default values. Please edit some of them manually for now where needed.",
  );

  // Get the list of keys from .env.example
  const envExampleContent = await fs.readFile(
    path.join(path.dirname(envPath), ".env.example"),
    "utf8",
  );
  const envExampleKeys = envExampleContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim());

  // Filter keys that have default values, are in .env.example, and are not hidden
  const defaultValueKeys = Object.values(KNOWN_SERVICES)
    .flatMap((svc) => svc.keys)
    .filter(
      (k) => k.defaultValue && envExampleKeys.includes(k.key) && !k.hidden,
    )
    .map((k) => k.key);

  if (defaultValueKeys.length > 0) {
    relinka(
      "info",
      `These keys are set to default values: ${defaultValueKeys.join(", ")}`,
    );
  }
}

/**
 * Main function to compose the .env file.
 */
export async function composeEnvFile(
  projectDir: string,
  gitRepo: string,
): Promise<void> {
  const PROJECT_ROOT = path.resolve(projectDir);
  const EXAMPLE_ENV_PATH = path.join(PROJECT_ROOT, ".env.example");
  const ENV_PATH = path.join(PROJECT_ROOT, ".env");

  if (!(await fs.pathExists(EXAMPLE_ENV_PATH))) {
    relinka("error", `No .env.example file found at ${EXAMPLE_ENV_PATH}`);

    const content = await fetchEnvExampleContent(gitRepo);
    if (content) {
      await fs.writeFile(EXAMPLE_ENV_PATH, content);
      relinka("info", ".env.example file fetched and saved.");
    } else {
      relinka("error", "Failed to fetch .env.example content.");
      return;
    }
  }

  await ensureEnvFile(ENV_PATH, EXAMPLE_ENV_PATH);

  const missingKeys = (await getRequiredEnvKeys(EXAMPLE_ENV_PATH)).filter(
    async (key) => {
      const service = Object.values(KNOWN_SERVICES).find((svc) =>
        svc.keys.some((k) => k.key === (key as KeyVars)),
      );

      const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));

      return (
        !keyConfig?.defaultValue && // Exclude keys with defaultValue
        !(await fs.readFile(ENV_PATH, "utf8")).includes(`${key}=`)
      );
    },
  );

  if (missingKeys.length > 0) {
    const response = await selectPrompt({
      title:
        "Do you want me to help you fill in the .env file? Or, you prefer to do it manually?",
      content:
        "✨ Everything saved only in your .env file and will not be shared anywhere.",
      contentColor: "yellowBright",
      options: [
        { label: "Yes, please help me", value: "auto" },
        { label: "No, I want to do it manually", value: "manual" },
        {
          label: "I have already .env file, let me provide path to it",
          value: "existing",
        },
      ],
    });

    if (response === "manual") {
      relinka("info-verbose", "Opening .env for manual editing...");
      await execa("code", [ENV_PATH]);
    } else if (response === "existing") {
      const existingPath = await inputPrompt({
        title:
          "Please provide the path to your existing .env file or directory:",
        placeholder:
          "Enter the path (e.g. C:\\project\\.env or C:\\project)...",
        content:
          "You can provide either the .env file path or the directory containing it.",
        contentColor: "yellowBright",
      });

      // Determine if the path is a directory or file
      let fullEnvPath = existingPath;
      if (await fs.pathExists(existingPath)) {
        const stats = await fs.stat(existingPath);
        if (stats.isDirectory()) {
          fullEnvPath = path.join(existingPath, ".env");
        }
      }

      if (await fs.pathExists(fullEnvPath)) {
        await fs.copy(fullEnvPath, ENV_PATH);
        relinka("info", "Existing .env file has been copied successfully!");
      } else {
        relinka("error", `Could not find .env file at ${fullEnvPath}`);
        return;
      }
    } else {
      await promptAndSetMissingValues(missingKeys, ENV_PATH);
      relinka(
        "info",
        "Enviroment variables file updated successfully! We did a great job with you, my friend!",
      );
    }

    const shouldOpenDocs = await confirmPrompt({
      title:
        "By the way, you can always check the Reliverse Docs to learn more about env variables. Should I open it for you?",
      titleColor: "blueBright",
      defaultValue: false,
    });

    if (shouldOpenDocs) {
      relinka(
        "info-verbose",
        "Opening https://docs.reliverse.org/env to learn more...",
      );
      await open("https://docs.reliverse.org/env");
    }
  }
}
