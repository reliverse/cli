import consola from "consola";
import fs from "fs-extra";
import path from "pathe";
import { execa } from "execa";

const PROJECT_ROOT = path.resolve();
const EXAMPLE_ENV_PATH = path.join(PROJECT_ROOT, ".env.example");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

type CharsetOptions = {
  length?: number;
  charset?: string;
};

function generateSecureString({
  length = 44,
  charset = "alphanumeric",
}: CharsetOptions = {}): string {
  const chars =
    {
      alphanumeric:
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      numeric: "0123456789",
      alphabetic: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    }[charset] || charset;

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => chars.charAt(byte % chars.length))
    .join("");
}

async function constructEnvFile() {
  if (!(await fs.pathExists(EXAMPLE_ENV_PATH))) {
    consola.warn(
      `No .env.example file found in project root at ${EXAMPLE_ENV_PATH}`,
    );
    return;
  }

  if (!(await fs.pathExists(ENV_PATH))) {
    await fs.copy(EXAMPLE_ENV_PATH, ENV_PATH);
    consola.success(".env file created based on .env.example.");
  } else {
    const exampleContent = (await fs.readFile(EXAMPLE_ENV_PATH, "utf8")).split(
      "\n",
    );
    const envContent = (await fs.readFile(ENV_PATH, "utf8")).split("\n");

    const missingKeys: Record<string, string> = {};
    // biome-ignore lint/complexity/noForEach: <explanation>
    exampleContent.forEach((line) => {
      const [key, defaultValue] = line.split("=");
      if (key && !envContent.some((envLine) => envLine.startsWith(`${key}=`))) {
        missingKeys[key] = defaultValue ?? "";
      }
    });

    if (Object.keys(missingKeys).length > 0) {
      const response = await consola.prompt(
        "Some keys are missing in .env. Edit manually or auto-fill?",
        {
          type: "select",
          options: ["Edit manually", "Auto-fill"],
        },
      );

      if (response === "Edit manually") {
        consola.info("Opening .env file for manual editing...");
        await execa("code", [ENV_PATH]);
      } else {
        for (const [key, defaultValue] of Object.entries(missingKeys)) {
          const value = await consola.prompt(
            `Provide value for ${key} (Default: ${defaultValue})`,
            {
              type: "text",
              default: defaultValue,
            },
          );
          envContent.push(`${key}=${value}`);
        }
        await fs.writeFile(ENV_PATH, envContent.join("\n"));
        consola.success(".env file updated with missing keys.");
      }
    }
  }

  // Generate AUTH_SECRET if necessary
  const envVars = (await fs.readFile(ENV_PATH, "utf8")).split("\n");
  const authSecretIndex = envVars.findIndex((line) =>
    line.startsWith("AUTH_SECRET="),
  );

  if (authSecretIndex !== -1) {
    const line = envVars[authSecretIndex];
    if (line) {
      const [key, value] = line.split("=") as [string, string | undefined];
      if (!value || value === "EnsureUseSomethingRandomHere44CharactersLong") {
        const secureAuthSecret = generateSecureString();
        envVars[authSecretIndex] = `${key}=${secureAuthSecret}`;
        await fs.writeFile(ENV_PATH, envVars.join("\n"));
        consola.success("Generated and updated AUTH_SECRET in .env.");
      }
    }
  }
}

constructEnvFile().catch((error) => {
  consola.error("Failed to construct or update .env file:", error);
});
