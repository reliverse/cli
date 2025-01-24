import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { ofetch } from "ofetch";
import path from "pathe";

import { getRepoUrl } from "~/app/constants.js";
import { downloadRepo } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadRepo.js";
import { replaceImportSymbol } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/codemods/replaceImportSymbol.js";

type UpdateConfig = {
  actions: {
    type: string;
    params: {
      repo: string;
      to: string;
    };
  }[];
};

export async function showUpdateCloneMenu(isDev: boolean, cwd: string) {
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

  // For test development purposes only
  if (option === "🚧 relivator (local dev only)") {
    relinka(
      "warn",
      "Make sure to run this script from the root folder of your reliverse/cli clone.",
    );
    const { dir } = await downloadRepo({
      repoURL: "blefnk/relivator",
      projectName: "test-name",
      isDev,
      cwd,
    });
    if (dir) {
      await loadAndRunConfig(
        path.join(dir, "src/prompts/tests/update-config.json"),
      );
    }
  } else {
    await downloadAndRunConfig(option, cwd);
  }

  relinka("success", "The repository has been updated successfully.");
}

async function downloadAndRunConfig(repoShortUrl: string, cwd: string) {
  const configUrl = `https://raw.githubusercontent.com/${repoShortUrl}/main/scripts/update-config.json`;
  const configPath = path.join(cwd, "update-config.json");

  await downloadFileFromUrl(configUrl, configPath);
  await loadAndRunConfig(configPath);
}

async function downloadFileFromUrl(url: string, destinationPath: string) {
  const response = await ofetch<{ arrayBuffer: () => Promise<ArrayBuffer> }>(
    url,
  );
  const fileBuffer = await response.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(fileBuffer));
  relinka("info", `Downloaded the update configuration to ${destinationPath}`);
}

async function loadAndRunConfig(configPath: string) {
  if (!(await fs.pathExists(configPath))) {
    relinka("error", "The configuration file is missing.");
    return;
  }

  const config = (await fs.readJson(configPath)) as UpdateConfig;
  await executeActions(config.actions);
}

async function executeActions(actions: UpdateConfig["actions"]) {
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
