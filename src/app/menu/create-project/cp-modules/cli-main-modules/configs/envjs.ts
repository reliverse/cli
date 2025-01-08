import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { type ConfigPaths } from "~/types.js";

const ENV_DEFAULT_CONFIG = `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    GITHUB_ID: z.string().min(1),
    GITHUB_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    STRIPE_API_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation: process.env.NODE_ENV === "development",
});`;

const ENV_MINIMAL_CONFIG = `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: process.env.NODE_ENV === "development",
});`;

async function validateTargetDir(targetDir: string): Promise<void> {
  if (!targetDir) {
    throw new Error("Target directory is required");
  }

  if (!(await fs.pathExists(targetDir))) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  if (!(await fs.stat(targetDir).then((stat) => stat.isDirectory()))) {
    throw new Error(`Target path is not a directory: ${targetDir}`);
  }
}

export async function configureEnv(
  paths: Pick<
    ConfigPaths,
    "envConfig" | "envRecommendedConfig" | "envRulesDisabledConfig"
  >,
) {
  try {
    const targetDir = path.dirname(paths.envConfig);
    await validateTargetDir(targetDir);

    const envConfigPath = paths.envConfig;
    const envConfigExists = await fileExists(envConfigPath);

    const env = await selectPrompt({
      title:
        "Please select which type of env.js configuration you want to use.",
      options: [
        {
          label: "Continue without env.js",
          value: "Skip",
          hint: "Continue without environment validation",
        },
        {
          label: "Default Configuration",
          value: "Default",
          hint: "Full set of environment variables with validation",
        },
        {
          label: "Minimal Configuration",
          value: "Minimal",
          hint: "Basic environment variables only",
        },
      ],
    });

    if (typeof env !== "string") {
      process.exit(0);
    }

    if (env === "Skip") {
      relinka("info", "Continuing without env.js configuration.");
      return;
    }

    // Remove existing config if it exists
    if (envConfigExists) {
      await removeFile(envConfigPath);
    }

    // Create src directory if it doesn't exist
    const srcDir = `${targetDir}/src`;
    if (!(await fs.pathExists(srcDir))) {
      await fs.mkdir(srcDir, { recursive: true });
    }

    // Generate new config
    const configData =
      env === "Default" ? ENV_DEFAULT_CONFIG : ENV_MINIMAL_CONFIG;
    await fs.writeFile(envConfigPath, configData);
    relinka("success", `Generated ${env.toLowerCase()} env.js configuration.`);
  } catch (error) {
    relinka(
      "error",
      "Failed to generate env.js configuration:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
