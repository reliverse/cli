import fs from "fs-extra";
import path from "pathe";

import type { ServiceKey, KnownService } from "./cef-keys.js";

/**
 * Generates a .env.example file from the known services
 */
export async function generateEnvExample(
  targetDir: string,
  services: Record<string, KnownService>,
): Promise<void> {
  const envPath = path.join(targetDir, ".env.example");
  let content = "# Environment Variables\n\n";

  for (const [_serviceName, service] of Object.entries(services)) {
    content = `${content}# ${service.name}\n`;
    for (const key of service.keys) {
      content = `${content}${key.key}=${key.defaultValue}\n`;
    }
    content = `${content}\n`;
  }

  await fs.writeFile(envPath, `${content.trim()}\n`);
}

/**
 * Inserts or updates a key in the .env.example file
 */
export async function insertOrUpdateKeyInEnvExample(
  targetDir: string,
  key: ServiceKey,
  serviceName: string,
): Promise<void> {
  const envPath = path.join(targetDir, ".env.example");
  let content = "";

  if (await fs.pathExists(envPath)) {
    content = await fs.readFile(envPath, "utf-8");
  }

  const lines = content.split("\n");
  const keyPattern = new RegExp(`^${key.key}=.*$`, "m");
  const newLine = `${key.key}=${key.defaultValue}`;

  if (keyPattern.test(content)) {
    // Update existing key
    const updatedLines = lines.map((line) =>
      line.match(keyPattern) ? newLine : line,
    );
    content = updatedLines.join("\n");
  } else {
    // Inject new key under service section
    const serviceHeader = `# ${serviceName}`;
    const serviceIndex = lines.indexOf(serviceHeader);

    if (serviceIndex !== -1) {
      // Inject under existing service section
      lines.splice(serviceIndex + 1, 0, newLine);
    } else {
      // Inject new service section
      lines.push("", serviceHeader, newLine);
    }
    content = lines.join("\n");
  }

  await fs.writeFile(envPath, `${content.trim()}\n`);
}
