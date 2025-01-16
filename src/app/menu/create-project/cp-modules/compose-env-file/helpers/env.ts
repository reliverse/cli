import { inputPrompt, multiselectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { eq } from "drizzle-orm";
import fs from "fs-extra";
import open from "open";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { db } from "~/app/db/client.js";
import { encrypt, decrypt } from "~/app/db/config.js";
import { userDataTable } from "~/app/db/schema.js";

import type { KeyVars } from "./keys.js";

import { KNOWN_SERVICES } from "./services.js";

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

export async function promptAndSetMissingValues(
  missingKeys: string[],
  envPath: string,
  shouldMaskSecretInput: boolean,
  config: ReliverseConfig,
): Promise<void> {
  relinka("info-verbose", `Missing values: ${missingKeys.join(", ")}`);
  const envContent = await fs.readFile(envPath, "utf8");
  const envLines = envContent.split("\n");

  const shouldOpenBrowser = config.envComposerOpenBrowser;
  const keysWithDefaultValues: string[] = [];

  // Auto-fill defaults first
  for (const key of missingKeys) {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );
    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));

    // If key has a default value (including generated ones), use it
    if (keyConfig?.defaultValue !== undefined) {
      const defaultValue = keyConfig.defaultValue;
      const lineIndex = envLines.findIndex((line) =>
        line.startsWith(`${keyConfig.key}=`),
      );
      const newLine = `${keyConfig.key}="${defaultValue}"`;

      if (lineIndex !== -1) {
        envLines[lineIndex] = newLine;
      } else {
        envLines.push(newLine);
      }

      if (!keyConfig.hidden) {
        keysWithDefaultValues.push(keyConfig.key);
      }
    }
  }

  // Write the updated env file with default values
  await fs.writeFile(envPath, envLines.join("\n"));

  // Only prompt for keys without defaults
  const filteredKeys = missingKeys.filter((key) => {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );
    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));
    return keyConfig?.defaultValue === undefined;
  });

  if (filteredKeys.length === 0) {
    if (keysWithDefaultValues.length > 0) {
      relinka(
        "info",
        "Some keys are set to default values. Edit them manually if needed:",
      );
      relinka("info", keysWithDefaultValues.join(", "));
    } else {
      relinka("info-verbose", "No missing keys require user input.");
    }
    return;
  }

  // Group keys by service
  const servicesWithMissingKeys = Object.entries(KNOWN_SERVICES).filter(
    ([_, service]) => service.keys.some((k) => filteredKeys.includes(k.key)),
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
      if (shouldOpenBrowser) {
        await open(service.dashboardUrl);
      }
    }

    for (const keyConfig of service.keys) {
      if (filteredKeys.includes(keyConfig.key)) {
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
        const lineIndex = envLines.findIndex((line) =>
          line.startsWith(`${keyConfig.key}=`),
        );
        const newLine = `${keyConfig.key}="${cleanValue}"`;

        if (lineIndex !== -1) {
          envLines[lineIndex] = newLine;
        } else {
          envLines.push(newLine);
        }

        await fs.writeFile(envPath, envLines.join("\n"));
      }
    }
  }

  if (keysWithDefaultValues.length > 0) {
    relinka(
      "info",
      "Some keys are set to default values. Edit them manually if needed:",
    );
    relinka("info", keysWithDefaultValues.join(", "));
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
