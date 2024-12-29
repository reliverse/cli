import { execSync } from "child_process";
import https from "https";

import { getVersion } from "./getReliverseCliVersion.js";
import { logger } from "./logger.js";

export const renderVersionWarning = (npmVersion: string) => {
  const currentVersion = getVersion();

  //   console.log("current", currentVersion);
  //   console.log("npm", npmVersion);

  if (currentVersion.includes("beta")) {
    logger.warn("  You are using a beta version of @reliverse/cli.");
    logger.warn("  Please report any bugs you encounter.");
  } else if (currentVersion.includes("next")) {
    logger.warn(
      "  You are running @reliverse/cli with the @next tag which is no longer maintained.",
    );
    logger.warn("  Please run the CLI with @latest instead.");
  } else if (currentVersion !== npmVersion) {
    logger.warn("  You are using an outdated version of @reliverse/cli.");
    logger.warn(
      `  Your version: ${currentVersion}.`,
      `Latest version in the npm registry: ${npmVersion}`,
    );
    logger.warn("  Please run the CLI with @latest to get the latest updates.");
  }
  console.log("");
};

interface DistTagsBody {
  latest: string;
}

function checkForLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://registry.npmjs.org/-/package/@reliverse/cli/dist-tags",
        (res) => {
          if (res.statusCode === 200) {
            let body = "";
            res.on("data", (data) => (body += data));
            res.on("end", () => {
              resolve((JSON.parse(body) as DistTagsBody).latest);
            });
          } else {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject();
          }
        },
      )
      .on("error", () => {
        // logger.error("Unable to check for latest version.");
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject();
      });
  });
}

export const getNpmVersion = () =>
  // `fetch` to the registry is faster than `npm view` so we try that first
  checkForLatestVersion().catch(() => {
    try {
      return execSync("npm view @reliverse/cli version").toString().trim();
    } catch {
      return null;
    }
  });
