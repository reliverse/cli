import type { ParsedUrlQuery } from "querystring";

import { defineCommand, runMain } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";
import { listen } from "async-listen";
import fs from "fs-extra";
import http from "http";
import { customAlphabet } from "nanoid";
import open from "open";
import os from "os";
import "dotenv/config";
import path from "pathe";
import pc from "picocolors";
import { isWindows } from "std-env";
import url from "url";

const debug = false;
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
 * @param {ParsedUrlQuery} data - The authentication data to write.
 */
async function writeToConfigFile(data: ParsedUrlQuery) {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, CONFIG);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    debug && relinka.info(`Configuration written to ${filePath}`);
  } catch (error) {
    relinka.error("Error writing to local config file:", error);
    throw error;
  }
}

async function readFromConfigFile() {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, CONFIG);
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      debug && relinka.info(`Config file not found at ${filePath}`);
      return null;
    }
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    relinka.error("Error reading config file:", error);
    return null;
  }
}

const nanoid = customAlphabet("123456789QAZWSXEDCRFVTGBYHNUJMIKOLP", 8);

export async function auth() {
  relinka.info(pc.cyanBright("Let's authenticate you 🚀"));
  // Dynamically import 'ora' for the spinner
  let ora;
  try {
    ora = (await import("ora")).default;
    debug && relinka.info("Successfully imported 'ora' module.");
  } catch (importError) {
    relinka.error("Failed to import 'ora' module:", importError);
    throw importError;
  }

  // Create a local HTTP server to handle the authentication callback
  const server = http.createServer();
  let port;
  try {
    const serverListen = await listen(server, {
      port: 0,
      host: "127.0.0.1",
    });
    port = serverListen.port;
    debug && relinka.info(`Local server listening on http://127.0.0.1:${port}`);
    if (debug) {
      relinka.info(`Server started on port ${port}`);
    }
  } catch (listenError) {
    relinka.error("Failed to start local server:", listenError);
    throw listenError;
  }

  // Promise to handle the authentication data received from the callback
  const authPromise = new Promise<ParsedUrlQuery>((resolve, reject) => {
    server.on("request", (req, res) => {
      if (debug) {
        relinka.info(`Received ${req.method} request on ${req.url}`);
      }

      // Set CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );

      if (req.method === "OPTIONS") {
        debug && relinka.info("Handling OPTIONS request");
        res.writeHead(200);
        res.end();
      } else if (req.method === "GET") {
        const parsedUrl = url.parse(req.url || "", true);
        const queryParams = parsedUrl.query;
        debug && relinka.info("Parsed query parameters:", queryParams);
        if (queryParams.cancelled) {
          debug && relinka.info("Login process cancelled by user.");
          res.writeHead(200);
          res.end();
          reject(new UserCancellationError("Login process cancelled by user."));
        } else {
          debug && relinka.info("Received authentication data:", queryParams);
          res.writeHead(200);
          res.end();
          resolve(queryParams);
        }
      } else {
        relinka.warn(`Unhandled request method: ${req.method}`);
        res.writeHead(405);
        res.end();
      }
    });

    // Handle server errors
    server.on("error", (error) => {
      relinka.error("Local server encountered an error:", error);
      reject(error);
    });
  });

  const redirect = `http://127.0.0.1:${port}`;
  const code = nanoid();
  // const clientUrl = process.env.CLIENT_URL || "https://reliverse.org";
  // const clientUrl = "http://127.0.0.1:3000";
  const clientUrl = "https://reliverse.org";

  debug && relinka.info(`Using client URL: ${clientUrl}`);

  const confirmationUrl = new URL(`${clientUrl}/auth/devices`);
  confirmationUrl.searchParams.append("code", code);
  confirmationUrl.searchParams.append("redirect", redirect);

  // relinka.info(
  //   `Please confirm on the page if you see the same code: ${pc.bold(code)}\n`,
  // );
  relinka.info(
    `${pc.bold("The following URL will be opened in your default browser:")}\n│ ${pc.dim(
      confirmationUrl.toString(),
    )}`,
  );

  // We're using the 'open' package to open the URL in the default browser
  try {
    await open(confirmationUrl.toString());
    debug && relinka.info("Opened browser with confirmation URL.");
    if (debug) {
      relinka.info("Browser opened successfully.");
    }
  } catch (error) {
    relinka.warn("Failed to open the browser automatically:", error);
    relinka.warn(
      `Please manually open the following URL in your browser: ${pc.bold(
        confirmationUrl.toString(),
      )}\n`,
    );
  }

  // Initialize and start the spinner
  const spinner = ora(
    `Press "Confirm code" there if you see the same code: ${pc.bold(code)}`,
  ).start();
  debug && relinka.info("Spinner started.");

  // Timeout logic to prevent indefinite waiting
  const authTimeout = setTimeout(
    () => {
      spinner.stop();
      relinka.error("Authentication timed out.");
      server.close(() => {
        relinka.warn("Local server closed due to timeout.");
        process.exit(1);
      });
    },
    5 * 60 * 1000,
  ); // 5 minutes

  debug && relinka.info("Authentication timeout set for 5 minutes.");

  const homeDir = os.homedir();
  const configFilePath = isWindows ? path.join(homeDir, CONFIG) : `~/${CONFIG}`;

  try {
    const authData = await authPromise;
    clearTimeout(authTimeout);
    debug && relinka.info("Authentication data received:", authData);
    spinner.stop();
    await writeToConfigFile(authData);
    server.close(() => {
      debug &&
        relinka.success(
          pc.greenBright("Authentication successful! Happy Reliversing! 🎉"),
        );
      debug &&
        relinka.info(
          `Wrote key to config file. To view it, type: code ~/${configFilePath}`,
        );
      debug &&
        relinka.info("Local server closed after successful authentication.");
    });
  } catch (error) {
    clearTimeout(authTimeout);
    spinner.stop();
    if (error instanceof UserCancellationError) {
      relinka.success("Authentication cancelled by the user.");
      process.exit(0);
    } else {
      relinka.error("Authentication failed:", error);
      server.close(() => {
        relinka.warn("Local server closed due to authentication failure.");
        process.exit(1); // Ensuring the process exits with an error code
      });
    }
  }
}
