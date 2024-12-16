import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import { ofetch } from "ofetch";
import path from "pathe";

import { getRepoUrl } from "~/app/menu/data/constants.js";
import { relinka } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { replaceImportSymbol } from "~/utils/handlers/codemods/replaceImportSymbol.js";
import { validate } from "~/utils/validate.js";

const cwd = getCurrentWorkingDirectory();

export async function showUpdateCloneMenu(isDev: boolean) {
  relinka(
    "info",
    "🔥 The current mode is in active development and may not be stable. ✨ Select the supported repository you have cloned from GitHub to update it with the latest changes.",
  );

  const options = [
    getRepoUrl("blefnk/relivator"),
    ...(isDev ? ["🚧 relivator (local dev only)"] : []),
  ];

  const option = await selectPrompt({
    title: "Select the repository to update",
    options: options.map((option) => ({
      label: option,
      value: option,
    })),
  });

  validate(option, "string", "Invalid option selected. Exiting.");

  // For test development purposes only
  if (option === "🚧 relivator (local dev only)") {
    relinka(
      "warn",
      "Make sure to run this script from the root folder of your reliverse/cli clone.",
    );
    const projectPath = await downloadGitRepo(
      "test-name",
      "blefnk/relivator",
      isDev,
    );
    if (projectPath) {
      await loadAndRunConfig(
        path.join(projectPath, "src/prompts/tests/update-config.json"),
      );
    }
  } else {
    await downloadAndRunConfig(option);
  }

  relinka("success", "The repository has been updated successfully.");
}

async function downloadAndRunConfig(repoShortUrl: string) {
  const configUrl = `https://raw.githubusercontent.com/${repoShortUrl}/main/scripts/update-config.json`;
  const configPath = path.join(cwd, "update-config.json");

  await downloadFileFromUrl(configUrl, configPath);
  await loadAndRunConfig(configPath);
}

async function downloadFileFromUrl(url: string, destinationPath: string) {
  const response = await ofetch(url);
  const fileBuffer = await response.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(fileBuffer));
  relinka("info", `Downloaded the update configuration to ${destinationPath}`);
}

async function loadAndRunConfig(configPath: string) {
  if (!(await fs.pathExists(configPath))) {
    relinka("error", "The configuration file is missing.");
    return;
  }

  const config = await fs.readJson(configPath);
  await executeActions(config.actions);
}

async function executeActions(actions: any[]) {
  for (const action of actions) {
    switch (action.type) {
      case "replaceImportSymbol":
        await replaceImportSymbol(action.params.repo, action.params.to);
        break;
      default:
        relinka("warn", `Unknown action type: ${action.type}`);
    }
  }
}
