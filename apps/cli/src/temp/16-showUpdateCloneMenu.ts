import { consola } from "consola";
import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";
import { verbose } from "~/utils/console";
import { downloadGitRepo } from "~/utils/downloadGitRepo";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import { validate } from "~/utils/validate";
import { isDev, REPO_SHORT_URLS } from "~/app";

const cwd = getCurrentWorkingDirectory();

export async function showUpdateCloneMenu() {
  consola.info(
    "🔥 The current mode is in active development and may not be stable. ✨ Select the supported repository you have cloned from GitHub to update it with the latest changes.",
  );

  const options = [
    REPO_SHORT_URLS.relivatorGithubLink,
    ...(isDev ? ["🚧 relivator-nextjs-template (local dev only)"] : []),
  ];

  const option = await consola.prompt("Select the repository to update", {
    options,
    type: "select",
  });

  validate(option, "string", "Invalid option selected. Exiting.");

  // for test development purposes only
  if (option === "🚧 relivator-nextjs-template (local dev only)") {
    consola.warn(
      "Make sure to run this script from the root folder of your reliverse/cli clone.",
    );
    const projectPath = await downloadGitRepo(
      "relivator-dev-test",
      "relivator-nextjs-template",
      false,
      "Do nothing",
    );
    if (projectPath) {
      await runScript(path.join(projectPath, "src/prompts/tests/updater.ts"));
    }
  } else {
    await downloadRunUpdaterTSScript(option);
  }

  consola.success("The repository has been updated successfully.");
}

async function downloadRunUpdaterTSScript(repoShortUrl: string) {
  const updaterScriptUrl = `https://raw.githubusercontent.com/${repoShortUrl}/main/scripts/update.ts`;
  const updaterScriptPath = path.join(cwd, "updater.ts");

  await downloadFileFromUrl(updaterScriptUrl, updaterScriptPath);
  await runScript(updaterScriptPath);
}

async function downloadFileFromUrl(url: string, path: string) {
  const response = await fetch(url);
  const fileBuffer = await response.arrayBuffer();
  await fs.writeFile(path, Buffer.from(fileBuffer));
  consola.info(`Downloaded the updater script to ${path}`);
}

async function runScript(path: string) {
  verbose("info", `Running the updater script at ${path}`);
  await execa(`tsx ${path}`);
}
