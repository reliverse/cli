#!/usr/bin/env node

import type { ParsedUrlQuery } from "querystring";

import { serve } from "@hono/node-server";
import { defineCommand, runMain } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";
import fs from "fs-extra";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { customAlphabet } from "nanoid";
import open from "open";
import os from "os";
import "dotenv/config";
import path from "pathe";
import pc from "picocolors";
import { isWindows } from "std-env";

const debug = true;
const CONFIG = ".reliverse";

/**
 * Custom error to handle user cancellation during the login process.
 */
class UserCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserCancellationError";
  }
}

/**
 * Writes the authentication data to a configuration file in the user's home directory.
 */
async function writeToConfigFile(data: ParsedUrlQuery) {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, CONFIG);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    relinka.info(`Configuration written to ${filePath}`);
  } catch (error) {
    relinka.error("Error writing to local config file:", error);
    throw error;
  }
}

/**
 * Retrieves the version number from the package.json file.
 */
async function getVersion(): Promise<string> {
  try {
    const packageJson = await fs.readFile(
      new URL("../package.json", import.meta.url),
      "utf-8",
    );
    const { version } = JSON.parse(packageJson) as { version: string };
    relinka.debug(`Retrieved version from package.json: ${version}`);
    return version;
  } catch (error) {
    relinka.error("Error reading package.json to get version:", error);
    throw error;
  }
}

const nanoid = customAlphabet("123456789QAZWSXEDCRFVTGBYHNUJMIKOLP", 8);

/**
 * Creates and configures a Hono server for authentication
 */
async function createAuthServer(): Promise<{ app: Hono; port: number }> {
  const app = new Hono();

  // Add CORS middleware
  app.use("*", cors());

  // Find an available port
  const port = 3000; // todo: make this dynamic

  return { app, port };
}

const mainCommand = defineCommand({
  meta: {
    name: "reliverse",
    version: await getVersion(),
    description: "@reliverse/cli application with Unkey auth",
  },
  subCommands: {
    login: defineCommand({
      meta: {
        name: "login",
        description: "Login to Reliverse",
      },
      run: async () => {
        let ora;
        try {
          ora = (await import("ora")).default;
          relinka.debug("Successfully imported 'ora' module.");
        } catch (importError) {
          relinka.error("Failed to import 'ora' module:", importError);
          throw importError;
        }

        const { app, port } = await createAuthServer();

        // Create a promise to handle the authentication data
        const authPromise = new Promise<ParsedUrlQuery>((resolve, reject) => {
          app.get("/", async (c) => {
            const query = c.req.query();

            if (query.cancelled) {
              relinka.info("Login process cancelled by user.");
              reject(
                new UserCancellationError("Login process cancelled by user."),
              );
              return c.text("Login cancelled");
            }

            relinka.info("Received authentication data:", query);
            resolve(query);
            return c.text(
              "Authentication successful! You can close this window.",
            );
          });
        });

        // Start the server
        const server = serve({
          fetch: app.fetch,
          port,
        });

        const redirect = `http://127.0.0.1:${port}`;
        const code = nanoid();
        const clientUrl = "https://reliverse.org";

        relinka.debug(`Using client URL: ${clientUrl}`);

        const confirmationUrl = new URL(`${clientUrl}/auth/devices`);
        confirmationUrl.searchParams.append("code", code);
        confirmationUrl.searchParams.append("redirect", redirect);

        relinka.info(`Confirmation code: ${pc.bold(code)}\n`);
        relinka.info(
          `If something goes wrong, copy and paste this URL into your browser: ${pc.bold(
            confirmationUrl.toString(),
          )}\n`,
        );

        try {
          await open(confirmationUrl.toString());
          relinka.info("Opened browser with confirmation URL.");
        } catch (error) {
          relinka.error("Failed to open the browser automatically:", error);
          relinka.info(
            `Please manually open the following URL in your browser: ${pc.bold(
              confirmationUrl.toString(),
            )}\n`,
          );
        }

        const spinner = ora("Waiting for authentication...").start();
        relinka.debug("Spinner started.");

        // Timeout handling
        const authTimeout = setTimeout(
          () => {
            spinner.stop();
            relinka.error("Authentication timed out.");
            server.close();
            process.exit(1);
          },
          5 * 60 * 1000,
        );

        try {
          const authData = await authPromise;
          clearTimeout(authTimeout);
          spinner.stop();
          await writeToConfigFile(authData);
          relinka.info(
            `Authentication successful: wrote key to config file. To view it, type 'code ~/${CONFIG}'.\n`,
          );
        } catch (error) {
          clearTimeout(authTimeout);
          spinner.stop();
          if (error instanceof UserCancellationError) {
            relinka.info("Authentication cancelled by the user.\n");
          } else {
            relinka.error("Authentication failed:", error);
            process.exit(1);
          }
        } finally {
          server.close();
        }
      },
    }),
  },
});

runMain(mainCommand).catch((error) => {
  relinka.error("An unexpected error occurred:", error);
  process.exit(1);
});
