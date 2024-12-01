#!/usr/bin/env node

import { defineCommand, errorHandler, runMain } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";
import pc from "picocolors";

import app from "./app.js";
import { auth } from "./cmds/auth/login.js";
import { deleteConfig } from "./cmds/auth/logout.js";
import { CONFIG } from "./data.js";
import { pkg } from "./utils/pkg.js";

const isConfigExists = async () => {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, CONFIG);
    return await fs.pathExists(filePath);
  } catch (error) {
    relinka.error("Error checking if config file exists:", error);
    return false;
  }
};

const main = defineCommand({
  meta: {
    name: "reliverse",
    version: pkg.version,
    description: "@reliverse/cli",
  },
  run: async () => {
    const config = await isConfigExists();
    if (!config) {
      await auth();
    }
    await app();
    process.exit(0);
  },
  subCommands: {
    login: defineCommand({
      meta: {
        name: "login",
        description: "Authenticates your device",
      },
      run: async () => {
        const config = await isConfigExists();
        if (config) {
          relinka.info(pc.dim("You're already logged in."));
          process.exit(0);
        }
        await auth();
        process.exit(0);
      },
    }),
    logout: defineCommand({
      meta: {
        name: "logout",
        description: "Forgets your device",
      },
      run: async () => {
        const config = await isConfigExists();
        if (!config) {
          relinka.info(pc.dim("You're not logged in."));
          process.exit(0);
        }
        await deleteConfig();
        relinka.success(pc.cyanBright("You're logged out now 👋"));
        process.exit(0);
      },
    }),
  },
});

await runMain(main).catch((error: Error) =>
  errorHandler(
    error,
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
