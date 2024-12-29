import { inputPrompt, multiselectPrompt } from "@reliverse/prompts";
import { eq } from "drizzle-orm";
import fs from "fs-extra";
import open from "open";
import path from "pathe";

import { db } from "~/app/db/client.js";
import { encrypt, decrypt } from "~/app/db/config.js";
import { userDataTable } from "~/app/db/schema.js";
import { relinka } from "~/utils/console.js";

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
): Promise<void> {
  relinka("info-verbose", `Missing values: ${missingKeys.join(", ")}`);
  const envContent = await fs.readFile(envPath, "utf8");
  const envLines = envContent.split("\n");

  // Auto-fill defaults
  for (const key of missingKeys) {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );
    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));
    if (keyConfig?.defaultValue) {
      const lineIndex = envLines.findIndex((line) =>
        line.startsWith(`${keyConfig.key}=`),
      );
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

  await fs.writeFile(envPath, envLines.join("\n"));

  const filteredKeys = missingKeys.filter((key) => {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );
    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));
    return !keyConfig?.defaultValue; // prompt only if no default
  });

  if (filteredKeys.length === 0) {
    relinka("info-verbose", "No missing keys require user input.");
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
    titleColor: "blueBright",
    contentColor: "yellowBright",
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
      await open(service.dashboardUrl);
    }

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
  }

  relinka(
    "info",
    "Some keys are set to default values. Edit them manually if needed.",
  );

  const envExampleContent = await fs.readFile(
    path.join(path.dirname(envPath), ".env.example"),
    "utf8",
  );
  const envExampleKeys = envExampleContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => line.split("=")[0]?.trim())
    .filter((key): key is string => key !== undefined);

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
