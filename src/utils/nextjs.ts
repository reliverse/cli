import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { type NextJsConfig, type ConfigPaths } from "~/types.js";
import { relinka } from "~/utils/console.js";

import { addConfigMetadata } from "./configs/miscellaneousConfigHelpers.js";

const NEXTJS_DEFAULT_CONFIG: NextJsConfig = addConfigMetadata({
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    typedRoutes: true,
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
});

const NEXTJS_MINIMAL_CONFIG = addConfigMetadata({
  reactStrictMode: true,
  poweredByHeader: false,
});

const NEXTJS_CONFIG_TEMPLATE = `import type { NextConfig } from "next";

const config: NextConfig = __CONFIG__;

export default config;`;

async function backupConfig(configPath: string): Promise<void> {
  if (await fileExists(configPath)) {
    const backupPath = `${configPath}.backup-${Date.now()}`;
    await fs.copy(configPath, backupPath);
    relinka("info", `Created backup at ${backupPath}`);
  }
}

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

export async function configureNext(
  config: Pick<
    ConfigPaths,
    "nextConfig" | "nextMinimalConfig" | "nextRecommendedConfig"
  >,
) {
  try {
    const targetDir = path.dirname(config.nextConfig);
    await validateTargetDir(targetDir);

    const nextConfigPath = config.nextConfig;
    const nextConfigExists = await fileExists(nextConfigPath);

    const next = await selectPrompt({
      title:
        "Please select which type of Next.js configuration you want to use.",
      options: [
        {
          label: "Continue without Next.js config",
          value: "Skip",
          hint: "Continue with Next.js defaults",
        },
        {
          label: "Default Configuration",
          value: "Default",
          hint: "Optimized settings with experimental features",
        },
        {
          label: "Minimal Configuration",
          value: "Minimal",
          hint: "Basic settings only",
        },
      ],
    });

    if (typeof next !== "string") {
      process.exit(0);
    }

    if (next === "Skip") {
      relinka("info", "Continuing with Next.js defaults.");
      return;
    }

    // Backup existing config if it exists
    if (nextConfigExists) {
      await backupConfig(nextConfigPath);
      await removeFile(nextConfigPath);
    }

    try {
      // Generate new config
      const config =
        next === "Default" ? NEXTJS_DEFAULT_CONFIG : NEXTJS_MINIMAL_CONFIG;
      if (!config || typeof config !== "object") {
        throw new Error("Invalid configuration template");
      }

      const configContent = NEXTJS_CONFIG_TEMPLATE.replace(
        "__CONFIG__",
        JSON.stringify(config, null, 2),
      );

      await fs.writeFile(nextConfigPath, configContent);
      relinka(
        "success",
        `Generated ${next.toLowerCase()} Next.js configuration at ${nextConfigPath}`,
      );
    } catch (error) {
      relinka(
        "error",
        "Failed to generate Next.js configuration:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  } catch (error) {
    relinka(
      "error",
      "Failed to configure Next.js:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
