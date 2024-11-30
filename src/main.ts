#!/usr/bin/env node

import type { ParsedUrlQuery } from "querystring";

import { defineCommand, runMain } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";
import { listen } from "async-listen";
import { readFileSync, writeFileSync } from "fs";
import http from "http";
import { customAlphabet } from "nanoid";
import open from "open"; // Import the 'open' package
import os from "os";
import "dotenv/config";
import path from "path";
import pc from "picocolors";
import url from "url";

const debug = false;
const FILENAME = ".unkey";

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
 * @param {ParsedUrlQuery} data - The authentication data to write.
 */
async function writeToConfigFile(data: ParsedUrlQuery) {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, FILENAME);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    relinka.info(`Configuration written to ${filePath}`);
  } catch (error) {
    relinka.error("Error writing to local config file:", error);
    throw error;
  }
}

/**
 * Retrieves the version number from the package.json file.
 * @returns {string} - The version number.
 */
function getVersion(): string {
  const packageJson = readFileSync(
    new URL("../package.json", import.meta.url),
    "utf-8",
  );
  const { version } = JSON.parse(packageJson) as { version: string };
  return version;
}

const nanoid = customAlphabet("123456789QAZWSXEDCRFVTGBYHNUJMIKOLP", 8);
const version = getVersion();

/**
 * Defines the main CLI command with its subcommands.
 * @example `reliverse`
 */
const mainCommand = defineCommand({
  meta: {
    name: "reliverse",
    version,
    description: "@reliverse/cli application with Unkey auth",
  },
  subCommands: {
    /**
     * Defines the 'login' subcommand.
     * @example `reliverse login`
     */
    login: defineCommand({
      meta: {
        name: "login",
        description: "Login to Reliverse",
      },
      run: async () => {
        // Dynamically import 'ora' for the spinner
        const { default: ora } = await import("ora");

        // Create a local HTTP server to handle the authentication callback
        const server = http.createServer();
        const { port } = await listen(server, { port: 0, host: "127.0.0.1" });

        // Promise to handle the authentication data received from the callback
        const authPromise = new Promise<ParsedUrlQuery>((resolve, reject) => {
          server.on("request", (req, res) => {
            // Set CORS headers
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.setHeader(
              "Access-Control-Allow-Headers",
              "Content-Type, Authorization",
            );

            if (req.method === "OPTIONS") {
              res.writeHead(200);
              res.end();
            } else if (req.method === "GET") {
              const parsedUrl = url.parse(req.url || "", true);
              const queryParams = parsedUrl.query;
              if (queryParams.cancelled) {
                res.writeHead(200);
                res.end();
                reject(
                  new UserCancellationError("Login process cancelled by user."),
                );
              } else {
                res.writeHead(200);
                res.end();
                resolve(queryParams);
              }
            } else {
              res.writeHead(405);
              res.end();
            }
          });
        });

        const redirect = `http://127.0.0.1:${port}`;
        const code = nanoid();
        const clientUrl = process.env.CLIENT_URL;

        // Validate CLIENT_URL
        if (!clientUrl) {
          relinka.error(
            "CLIENT_URL is not defined in the environment variables.",
          );
          process.exit(1);
        }

        const confirmationUrl = new URL(`${clientUrl}/auth/devices`);
        confirmationUrl.searchParams.append("code", code);
        confirmationUrl.searchParams.append("redirect", redirect);

        relinka.info(`Confirmation code: ${pc.bold(code)}\n`);
        relinka.info(
          `If something goes wrong, copy and paste this URL into your browser: ${pc.bold(
            confirmationUrl.toString(),
          )}\n`,
        );

        // We're using the 'open' package to open the URL in the default browser
        try {
          await open(confirmationUrl.toString());
        } catch (error) {
          relinka.error("Failed to open the browser automatically:", error);
          relinka.info(
            `Please manually open the following URL in your browser: ${pc.bold(
              confirmationUrl.toString(),
            )}\n`,
          );
        }

        // Initialize and start the spinner
        const spinner = ora("Waiting for authentication...");
        spinner.start();

        // TODO: Implement a better timeout logic to prevent indefinite waiting
        const authTimeout = setTimeout(
          () => {
            spinner.stop();
            relinka.error("Authentication timed out.");
            server.close();
            process.exit(1);
          },
          5 * 60 * 1000,
        ); // 5 minutes

        try {
          const authData = await authPromise;
          clearTimeout(authTimeout);
          spinner.stop();
          await writeToConfigFile(authData);
          relinka.info(
            `Authentication successful: wrote key to config file. To view it, type 'cat ~/${FILENAME}'.\n`,
          );
          server.close();
        } catch (error) {
          clearTimeout(authTimeout);
          spinner.stop();
          if (error instanceof UserCancellationError) {
            relinka.info("Authentication cancelled by the user.\n");
          } else {
            relinka.error("Authentication failed:", error);
            process.exit(1); // Ensure the process exits with an error code
          }
          server.close();
        }
      },
    }),
  },
});

/**
 * Executes the CLI application.
 */
runMain(mainCommand).catch((error) => {
  relinka.error("An unexpected error occurred:", error);
  process.exit(1);
});
