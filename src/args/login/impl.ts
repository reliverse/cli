import type { ParsedUrlQuery } from "querystring";

import { spinner } from "@reliverse/prompts";
import { listen } from "async-listen";
import http from "http";
import { customAlphabet } from "nanoid";
import { setTimeout } from "node:timers";
import open from "open";
import os from "os";
import "dotenv/config";
import path from "pathe";
import pc from "picocolors";
import { isWindows } from "std-env";
import url from "url";

import { MEMORY_FILE, verbose } from "~/app/data/constants.js";

import { updateReliverseMemory } from "../memory/impl.js";

/**
 * Custom error for when a user cancels the process.
 */
class UserCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserCancellationError";
  }
}

const nanoid = customAlphabet("123456789QAZWSXEDCRFVTGBYHNUJMIKOLP", 5);

export async function auth({ dev }: { dev: boolean }) {
  console.log(pc.cyanBright("✨ Let's authenticate you..."));

  await spinner({
    initialMessage: "Waiting for user confirmation...",
    successMessage: "Authentication successful!",
    errorMessage: "Authentication failed!",
    spinnerSolution: "ora",
    spinnerType: "arc",
    action: async (updateMessage) => {
      // Create a local HTTP server to handle the authentication callback
      const server = http.createServer();
      let port: number | string | undefined;

      try {
        const serverListen = await listen(server, {
          port: 0,
          host: "localhost",
        });
        port = serverListen.port;
        verbose &&
          console.log(`Local server listening on http://localhost:${port}`);
      } catch (listenError) {
        console.error("Failed to start local server:", listenError);
        throw listenError;
      }

      // Handle incoming requests (auth or cancellation)
      const authPromise = new Promise<ParsedUrlQuery>((resolve, reject) => {
        server.on("request", async (req, res) => {
          if (verbose) {
            console.log(`Received ${req.method} request on ${req.url}`);
          }

          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
          );

          if (req.method === "OPTIONS") {
            verbose && console.log("Handling OPTIONS request");
            res.writeHead(200);
            res.end();
          } else if (req.method === "GET") {
            const parsedUrl = url.parse(req.url || "", true);
            const queryParams = parsedUrl.query;
            verbose && console.log("Parsed query parameters:", queryParams);

            if (queryParams.cancelled) {
              verbose && console.log("User cancelled the login process...");
              verbose && console.log("Sleep 2s to finish the fetch process...");
              await new Promise((r) => setTimeout(r, 2000));
              res.writeHead(200);
              res.end();
              reject(
                new UserCancellationError("Login process cancelled by user."),
              );
            } else {
              verbose &&
                console.log("Received authentication data:", queryParams);
              res.writeHead(200);
              res.end();
              resolve(queryParams);
            }
          } else {
            console.warn(`Unhandled request method: ${req.method}`);
            res.writeHead(405);
            res.end();
          }
        });

        server.on("error", (error) => {
          console.error("Local server encountered an error:", error);
          reject(error);
        });
      });

      const redirect = `http://localhost:${port}`;
      const code = nanoid();
      const clientUrl = dev ? "http://localhost:3000" : "https://reliverse.org";
      verbose && console.log(`Using client URL: ${clientUrl}`);

      const confirmationUrl = new URL(`${clientUrl}/confirm`);
      confirmationUrl.searchParams.append("code", code);
      confirmationUrl.searchParams.append("redirect", redirect);

      console.log(
        `${pc.bold("The following URL will be opened in your default browser:")}\n│ ${pc.dim(
          confirmationUrl.toString(),
        )}`,
      );

      // Open the URL in the default browser
      try {
        await open(confirmationUrl.toString());
        verbose && console.log("Opened browser with confirmation URL.");
      } catch (error) {
        console.warn("Failed to open the browser automatically:", error);
        console.warn(
          `Please manually open the following URL in your browser: ${pc.bold(
            confirmationUrl.toString(),
          )}\n`,
        );
      }

      updateMessage(
        `Waiting for confirmation. Please confirm code: ${pc.bold(code)}`,
      );

      // Set up a 5-minute timeout
      const authTimeout = setTimeout(
        () => {
          // Timeout scenario
          console.error("Authentication timed out.");
          server.close(() => {
            verbose && console.warn("Local server closed due to timeout.");
            // Throwing will cause the spinner to show error and exit
            throw new Error("Authentication timed out.");
          });
        },
        5 * 60 * 1000,
      );

      const homeDir = os.homedir();
      const configFilePath = isWindows
        ? path.join(homeDir, MEMORY_FILE)
        : `~/${MEMORY_FILE}`;

      try {
        const authData = await authPromise;
        clearTimeout(authTimeout);
        verbose && console.log("Authentication data received:", authData);

        await updateReliverseMemory(authData);
        server.close(() => {
          verbose &&
            console.log(
              `Wrote key to config file. To view it, type: code ~/${configFilePath}`,
            );
          verbose &&
            console.log("Local server closed after successful authentication.");
        });
        // Success scenario: just return, spinner will show successMessage
        return;
      } catch (error) {
        clearTimeout(authTimeout);
        if (error instanceof UserCancellationError) {
          // User cancelled scenario: let's end gracefully
          updateMessage("Authentication cancelled by the user.");
          server.close(() => {
            verbose &&
              console.log("Local server closed due to user cancellation.");
            process.exit(0);
          });
        } else {
          server.close(() => {
            verbose &&
              console.warn(
                "Local server closed due to authentication failure.",
              );
          });
          // Throwing will trigger spinner error handling
          throw error;
        }
      }
    },
  });
}
