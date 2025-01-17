import fs from "fs-extra";

import type { KeyVars } from "./cef-services.js";

import { KNOWN_SERVICES } from "./cef-services.js";

export async function setDefaultValues(
  envPath: string,
  missingKeys: string[],
): Promise<{ keysWithDefaultValues: string[]; updatedKeys: boolean }> {
  const envContent = await fs.readFile(envPath, "utf8");
  const envLines = envContent.split("\n");
  const keysWithDefaultValues: string[] = [];
  let updatedKeys = false;

  // First pass: collect all keys and their current values from env file
  const envMap = new Map<string, { value: string; lineIndex: number }>();
  envLines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      const trimmedKey = key?.trim();
      if (trimmedKey) {
        envMap.set(trimmedKey, {
          value: valueParts.join("=").trim(),
          lineIndex: index,
        });
      }
    }
  });

  // Second pass: process missing keys and their default values
  for (const key of missingKeys) {
    const service = Object.values(KNOWN_SERVICES).find((svc) =>
      svc.keys.some((k) => k.key === (key as KeyVars)),
    );
    const keyConfig = service?.keys.find((k) => k.key === (key as KeyVars));

    if (keyConfig?.defaultValue !== undefined) {
      const defaultValue = keyConfig.defaultValue;
      const existingEntry = envMap.get(key);
      const newLine = `${key}="${defaultValue}"`;

      // Update or add the line
      if (existingEntry) {
        const currentValue = existingEntry.value.replace(
          /^["'](.*)["']$/,
          "$1",
        );
        // Only update if the current value is empty or undefined
        if (!currentValue || currentValue === '""' || currentValue === "''") {
          envLines[existingEntry.lineIndex] = newLine;
          updatedKeys = true;
        }
      } else {
        envLines.push(newLine);
        updatedKeys = true;
      }

      // Track non-hidden keys that were set with default values
      if (
        !keyConfig.hidden &&
        (!existingEntry?.value ||
          existingEntry.value === '""' ||
          existingEntry.value === "''")
      ) {
        keysWithDefaultValues.push(key);
      }
    }
  }

  if (updatedKeys) {
    // Ensure there's a newline at the end of file
    const effectiveContent = `${envLines.join("\n").trim()}\n`;
    await fs.writeFile(envPath, effectiveContent);
  }

  return { keysWithDefaultValues, updatedKeys };
}
