import { relinka } from "@reliverse/relinka";
import { execSync } from "child_process";
import https from "https";

import { cliName } from "~/app/constants.js";

import { getCliVersion } from "./getCliVersion.js";

export const renderVersionWarning = (npmVersion: string) => {
  const currentVersion = getCliVersion();

  //   console.log("current", currentVersion);
  //   console.log("npm", npmVersion);

  if (currentVersion.includes("beta")) {
    relinka("warn", `  You are using a beta version of ${cliName}.`);
    relinka("warn", "  Please report any bugs you encounter.");
  } else if (currentVersion.includes("next")) {
    relinka(
      "warn",
      `  You are running ${cliName} with the @next tag which is no longer maintained.`,
    );
    relinka("warn", "  Please run the CLI with @latest instead.");
  } else if (currentVersion !== npmVersion) {
    relinka("warn", `  You are using an outdated version of ${cliName}.`);
    relinka(
      "warn",
      `  Your version: ${currentVersion}.`,
      `Latest version in the npm registry: ${npmVersion}`,
    );
    relinka(
      "warn",
      "  Please run the CLI with @latest to get the latest updates.",
    );
  }
  console.log("");
};

type DistTagsBody = {
  latest: string;
};

function checkForLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://registry.npmjs.org/-/package/${cliName}/dist-tags`,
        (res) => {
          if (res.statusCode === 200) {
            let body = "";
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
        // relinka("error", "Unable to check for latest version.");
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject();
      });
  });
}

export const getNpmVersion = () =>
  // `fetch` to the registry is faster than `npm view` so we try that first
  checkForLatestVersion().catch(() => {
    try {
      return execSync(`npm view ${cliName} version`).toString().trim();
    } catch {
      return null;
    }
  });
