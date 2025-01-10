import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/utils/loggerRelinka.js";

import type { KeyVars } from "./keys.js";

import { fetchEnvExampleContent } from "./file.js";
import { KNOWN_SERVICES } from "./services.js";

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
      "success",
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
