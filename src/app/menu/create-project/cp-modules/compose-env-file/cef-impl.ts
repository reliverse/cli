import { inputPrompt, multiselectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { eq } from "drizzle-orm";
import fs from "fs-extra";
import { ofetch } from "ofetch";
import open from "open";
import path from "pathe";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { db } from "~/app/db/client.js";
import { encrypt, decrypt } from "~/app/db/config.js";
import { userDataTable } from "~/app/db/schema.js";

import type { KeyVars } from "./cef-services.js";

import { setDefaultValues } from "./cef-defaults.js";
import { KNOWN_SERVICES } from "./cef-services.js";

type EnvPaths = {
  projectRoot: string;
  exampleEnvPath: string;
  envPath: string;
};

function getEnvPaths(projectDir: string): EnvPaths {
  const projectRoot = path.resolve(projectDir);
  return {
    projectRoot,
    exampleEnvPath: path.join(projectRoot, ".env.example"),
    envPath: path.join(projectRoot, ".env"),
  };
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function safeWriteFile(
  filePath: string,
  content: string,
): Promise<boolean> {
  try {
    await fs.writeFile(filePath, content);
    return true;
  } catch {
    return false;
  }
}

export async function ensureExampleExists(
  projectDir: string,
  fallbackEnvExampleURL: string,
): Promise<boolean> {
  const { exampleEnvPath } = getEnvPaths(projectDir);

  try {
    if (await fs.pathExists(exampleEnvPath)) {
      return true;
    }

    relinka("info", "Fetching .env.example file...");
    const content = await fetchEnvExampleContent(fallbackEnvExampleURL);
    if (!content) {
      relinka("error", "Failed to fetch .env.example content.");
      return false;
    }

    if (!(await safeWriteFile(exampleEnvPath, content))) {
      relinka("error", "Failed to write .env.example file.");
      return false;
    }

    relinka("success", ".env.example file fetched and saved.");
    return true;
  } catch {
    relinka("error", "Failed to ensure .env.example exists.");
    return false;
  }
}

export async function ensureEnvExists(projectDir: string): Promise<boolean> {
  const { envPath, exampleEnvPath } = getEnvPaths(projectDir);

  try {
    if (await fs.pathExists(envPath)) {
      return true;
    }

    const exampleContent = await safeReadFile(exampleEnvPath);
    if (!exampleContent) {
      relinka("error", "Failed to read .env.example file.");
      return false;
    }

    if (!(await safeWriteFile(envPath, exampleContent))) {
      relinka("error", "Failed to create .env file.");
      return false;
    }

    relinka(
      "success-verbose",
      ".env file created from .env.example provided by the template.",
    );
    return true;
  } catch {
    relinka("error", "Failed to ensure .env exists.");
    return false;
  }
}

export async function getMissingKeys(projectDir: string): Promise<string[]> {
  const { envPath, exampleEnvPath } = getEnvPaths(projectDir);

  try {
    const envContent = await safeReadFile(envPath);
    if (!envContent) {
      relinka("error", "Failed to read .env file.");
      return [];
    }

    const requiredKeys = await getRequiredKeys(exampleEnvPath);
    return requiredKeys.filter((key) => {
      const service = Object.values(KNOWN_SERVICES).find((svc) =>
        svc.keys.some((k) => k.key === (key as KeyVars)),
      );
      const keyConfig = service?.keys?.find((k) => k.key === (key as KeyVars));
      if (keyConfig?.defaultValue) return false;

      // Check if key exists and has a non-empty value
      const lines = envContent.split("\n");
      const keyLine = lines.find((line) => line.trim().startsWith(`${key}=`));
      if (!keyLine) return true;

      const value = keyLine.split("=")[1]?.trim();
      return !value || value === '""' || value === "''";
    });
  } catch {
    relinka("error", "Failed to get missing keys.");
    return [];
  }
}

async function getRequiredKeys(exampleEnvPath: string): Promise<string[]> {
  const content = await safeReadFile(exampleEnvPath);
  if (!content) return [];

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line): line is string => !!line && !line.startsWith("#"))
    .map((line) => line.split("=")[0])
    .filter((key): key is string => !!key)
    .map((key) => key.trim());
}

export async function copyFromExisting(
  projectDir: string,
  sourcePath: string,
): Promise<boolean> {
  const { envPath } = getEnvPaths(projectDir);

  try {
    let fullEnvPath = sourcePath;
    const stats = await fs.stat(sourcePath).catch(() => null);

    if (stats?.isDirectory()) {
      fullEnvPath = path.join(sourcePath, ".env");
    }

    if (!(await fs.pathExists(fullEnvPath))) {
      relinka("error", `Could not find .env file at ${fullEnvPath}`);
      return false;
    }

    await fs.copy(fullEnvPath, envPath);
    relinka("success", "Existing .env file has been copied successfully!");
    return true;
  } catch {
    relinka("error", "Failed to copy existing .env file.");
    return false;
  }
}

export function getEnvPath(projectDir: string): string {
  return getEnvPaths(projectDir).envPath;
}

export function getExampleEnvPath(projectDir: string): string {
  return getEnvPaths(projectDir).exampleEnvPath;
}

export async function fetchEnvExampleContent(
  urlResource: string,
): Promise<string | null> {
  try {
    const response = await ofetch<Response>(urlResource);
    if (!response.ok) {
      throw new Error(`Failed to fetch .env.example from ${urlResource}`);
    }
    const text = await response.text();
    return typeof text === "string" ? text : null;
  } catch (error) {
    relinka(
      "error",
      `Error fetching .env.example: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

export function generateSecureString({
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

  const purposeLengths: Record<string, number> = {
    "auth-secret": 44,
    "encryption-key": 64,
    general: 44,
  };

  const effectiveLength = purposeLengths[purpose] ?? length;
  const chars = charsets[charset] ?? charset;
  const bytes = new Uint8Array(effectiveLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => chars.charAt(byte % chars.length))
    .join("");
}

const LAST_ENV_FILE_KEY = "last_env_file";

export async function ensureEnvFile(
  envPath: string,
  envExamplePath: string,
): Promise<void> {
  if (!(await fs.pathExists(envPath)) || (await fs.stat(envPath)).size === 0) {
    relinka("info-verbose", "Creating .env file from .env.example...");
    await fs.copy(envExamplePath, envPath);
  }
}

export async function getRequiredEnvKeys(
  envExamplePath: string,
): Promise<string[]> {
  if (await fs.pathExists(envExamplePath)) {
    const content = await fs.readFile(envExamplePath, "utf8");
    return content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => line.split("=")[0]?.trim())
      .filter((key): key is string => key !== undefined);
  }
  return [];
}

async function updateEnvValue(
  envPath: string,
  key: string,
  value: string,
): Promise<void> {
  const envContent = await fs.readFile(envPath, "utf8");
  const envLines = envContent.split("\n");
  const newLine = `${key}="${value}"`;

  const lineIndex = envLines.findIndex((line) => {
    const [existingKey] = line.split("=");
    return existingKey?.trim() === key;
  });

  if (lineIndex !== -1) {
    envLines[lineIndex] = newLine;
  } else {
    envLines.push(newLine);
  }

  // biome-ignore lint/style/useTemplate: <explanation>
  await fs.writeFile(envPath, envLines.join("\n").trim() + "\n");
}

export async function promptAndSetMissingValues(
  missingKeys: string[],
  envPath: string,
  shouldMaskSecretInput: boolean,
  config: ReliverseConfig,
): Promise<void> {
  if (missingKeys.length === 0) {
    relinka("info-verbose", "No missing keys to process.");
    return;
  }

  relinka(
    "info-verbose",
    `Processing missing values: ${missingKeys.join(", ")}`,
  );

  // First, handle default values
  const { keysWithDefaultValues } = await setDefaultValues(
    envPath,
    missingKeys,
  );

  // Show message about default values if any were set
  if (keysWithDefaultValues.length > 0) {
    relinka(
      "info",
      "The following keys have been set to default values. Edit them manually if needed:",
    );
    relinka("info", keysWithDefaultValues.join(", "));
  }

  // Reread missing keys after setting defaults
  const remainingKeys = missingKeys.filter((key) => {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );
    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));
    return keyConfig?.defaultValue === undefined;
  });

  if (remainingKeys.length === 0) {
    relinka("info-verbose", "All missing keys have been handled.");
    return;
  }

  // Group remaining keys by service
  const servicesWithMissingKeys = Object.entries(KNOWN_SERVICES).filter(
    ([_, service]) => service.keys.some((k) => remainingKeys.includes(k.key)),
  );

  const selectedServices = await multiselectPrompt({
    title: "Great! Which services do you want to configure?",
    content:
      "✨ I'll try to open the dashboard of the selected services for you. Don't forget to return to the terminal afterwards!",
    defaultValue: servicesWithMissingKeys.map(([key]) => key),
    options: servicesWithMissingKeys.map(([key, service]) => ({
      label: service.name,
      value: key,
    })),
  });

  for (const serviceKey of selectedServices) {
    if (serviceKey === "skip") continue;
    const service = KNOWN_SERVICES[serviceKey];
    if (!service) continue;

    if (service.dashboardUrl) {
      relinka("info-verbose", `Opening ${service.name} dashboard...`);
      if (config.envComposerOpenBrowser) {
        await open(service.dashboardUrl);
      }
    }

    for (const keyConfig of service.keys) {
      if (remainingKeys.includes(keyConfig.key)) {
        const value = await inputPrompt({
          title: `Enter value for ${keyConfig.key}:`,
          placeholder: "Paste your value here...",
          mode: shouldMaskSecretInput ? "password" : "plain",
          validate: (value: string): string | boolean => {
            if (!value?.trim()) {
              return "This value is required";
            }
            return true;
          },
          ...(keyConfig.instruction && {
            content: keyConfig.instruction,
            contentColor: "yellowBright",
          }),
          ...(service.dashboardUrl && {
            hint: `Visit ${service.dashboardUrl} to get your key`,
          }),
        });

        const rawValue = value.startsWith(`${keyConfig.key}=`)
          ? value.substring(value.indexOf("=") + 1)
          : value;
        const cleanValue = rawValue.trim().replace(/^['"](.*)['"]$/, "$1");

        await updateEnvValue(envPath, keyConfig.key, cleanValue);
      }
    }
  }
}

export async function saveLastEnvFilePath(envPath: string): Promise<void> {
  try {
    const encryptedPath = encrypt(envPath);
    await db
      .insert(userDataTable)
      .values({
        key: LAST_ENV_FILE_KEY,
        value: encryptedPath,
      })
      .onConflictDoUpdate({
        target: userDataTable.key,
        set: { value: encryptedPath },
      });
    relinka("success", "Environment file path saved");
  } catch (error) {
    relinka(
      "error",
      "Failed to save env file path:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getLastEnvFilePath(): Promise<string | null> {
  try {
    const result = await db
      .select()
      .from(userDataTable)
      .where(eq(userDataTable.key, LAST_ENV_FILE_KEY))
      .get();

    if (result?.value) {
      return decrypt(result.value);
    }
    return null;
  } catch (error) {
    relinka(
      "error",
      "Failed to get last env file path:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
