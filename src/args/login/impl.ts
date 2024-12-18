import type { ParsedUrlQuery } from "querystring";

import { task } from "@reliverse/prompts";
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

import { MEMORY_FILE } from "~/app/menu/data/constants.js";
import { relinka } from "~/utils/console.js";

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

export async function auth({
  dev,
  useLocalhost,
}: {
  dev: boolean;
  useLocalhost: boolean;
}) {
  relinka("info", "Let's authenticate you...");

  await task({
    initialMessage: "Waiting for user confirmation...",
    successMessage: "Login cancelled. See you next time 👋",
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
        relinka(
          "success-verbose",
          `Local server listening on http://localhost:${port}`,
        );
      } catch (listenError) {
        relinka(
          "error",
          "Failed to start local server:",
          listenError.toString(),
        );
        throw listenError;
      }

      // Handle incoming requests (auth or cancellation)
      const authPromise = new Promise<ParsedUrlQuery>((resolve, reject) => {
        server.on("request", async (req, res) => {
          relinka(
            "success-verbose",
            `Received ${req.method} request on ${req.url}`,
          );

          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
          );

          if (req.method === "OPTIONS") {
            relinka("info-verbose", "Handling OPTIONS request");
            res.writeHead(200);
            res.end();
          } else if (req.method === "GET") {
            const parsedUrl = url.parse(req.url || "", true);
            const queryParams = parsedUrl.query;
            relinka("info-verbose", `Parsed query parameters: ${JSON.stringify(queryParams)}`);

            if (queryParams.cancelled) {
              relinka("info-verbose", "User cancelled the login process...");
              relinka(
                "info-verbose",
                "Sleep 2s to finish the fetch process...",
              );
              await new Promise((r) => setTimeout(r, 2000));
              res.writeHead(200);
              res.end();
              reject(
                new UserCancellationError("Login process cancelled by user."),
              );
            } else {
              relinka(
                "info-verbose",
                `Received authentication data: ${JSON.stringify(queryParams)}`,
              );
              res.writeHead(200);
              res.end();
              resolve(queryParams);
            }
          } else {
            relinka("error", `Unhandled request method: ${req.method}`);
            res.writeHead(405);
            res.end();
          }
        });

        server.on("error", (error) => {
          relinka(
            "error",
            "Local server encountered an error:",
            error.toString(),
          );
          reject(error);
        });
      });

      const redirect = `http://localhost:${port}`;
      const code = nanoid();
      const clientUrl = dev
        ? useLocalhost
          ? "http://localhost:3000"
          : "https://reliverse.org"
        : "https://reliverse.org";
      relinka("info-verbose", `Using client URL: ${clientUrl}`);

      const confirmationUrl = new URL(`${clientUrl}/confirm`);
      confirmationUrl.searchParams.append("code", code);
      confirmationUrl.searchParams.append("redirect", redirect);

      process.stdout.write("\x1b[2K\r"); // Clear the current line, so misplacement of "Waiting for user confirmation..." is overwritten
      relinka(
        "info",
        "The following URL will be opened in your default browser:",
        confirmationUrl.toString(),
      );

      // Open the URL in the default browser
      try {
        await open(confirmationUrl.toString());
        relinka("info-verbose", "Opened browser with confirmation URL.");
      } catch (error) {
        relinka(
          "error",
          "Failed to open the browser automatically:",
          error.toString(),
        );
        relinka(
          "error",
          "Please manually open the following URL in your browser:",
          confirmationUrl.toString(),
        );
      }

      updateMessage(
        ` Please visit it and confirm there if you see the same code: ${pc.bold(
          code,
        )}`,
      );

      // Set up a 5-minute timeout
      const authTimeout = setTimeout(
        () => {
          // Timeout scenario
          relinka("error", "Authentication timed out.");
          server.close(() => {
            relinka("error", "Local server closed due to timeout.");
            // Throwing will cause the spinner to show error and exit
            // throw new Error("Authentication timed out.");
            process.exit(1);
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
        relinka("info-verbose", `Authentication data received: ${JSON.stringify(authData)}`);

        await updateReliverseMemory(authData);
        server.close(() => {
          relinka(
            "info-verbose",
            "Wrote key to config file. To view it, type:",
            `code ~/${configFilePath}`,
          );
          relinka(
            "info-verbose",
            "Local server closed after successful authentication.",
          );
        });
        // Success scenario: just return, spinner will show successMessage
        return;
      } catch (error) {
        clearTimeout(authTimeout);
        if (error instanceof UserCancellationError) {
          // User cancelled scenario: let's end gracefully
          updateMessage("Authentication cancelled by the user.");
          server.close(() => {
            relinka(
              "info-verbose",
              "Local server closed due to user cancellation.",
            );
            process.exit(0);
          });
        } else {
          server.close(() => {
            relinka(
              "error-verbose",
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
