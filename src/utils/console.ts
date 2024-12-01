import { relinka } from "@reliverse/relinka";

import { DEBUG } from "~/data.js";

// Helper for conditional verbose logging
export const verbose = (
  kind: "error" | "info" | "success",
  message: string,
) => {
  if (DEBUG.enableVerboseLogging) {
    if (kind === "success") {
      relinka.success(message);
    } else if (kind === "error") {
      relinka.error(message);
    } else {
      relinka.info(message);
    }
  }
};

// General error handling
export const handleError = (error: unknown) => {
  if (error instanceof Error) {
    relinka.error(`🤔 Failed to set up the project: ${error.message}`);
  } else {
    relinka.error("🤔 An unknown error occurred.");
  }

  process.exit(1);
};
