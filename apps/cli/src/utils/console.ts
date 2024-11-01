import { consola } from "consola";

import { DEBUG } from "~/app";

// Helper for conditional verbose logging
export const verbose = (
  kind: "error" | "info" | "success",
  message: string,
) => {
  if (DEBUG.enableVerboseLogging) {
    if (kind === "success") {
      consola.success(message);
    } else if (kind === "error") {
      consola.error(message);
    } else {
      consola.info(message);
    }
  }
};

// General error handling
export const handleError = (error: unknown) => {
  if (error instanceof Error) {
    consola.error(`🤔 Failed to set up the project: ${error.message}`);
  } else {
    consola.error("🤔 An unknown error occurred.");
  }

  process.exit(1);
};
