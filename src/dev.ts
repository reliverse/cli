import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig, TemplateOption } from "~/types.js";

import { downloadTemplate } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadTemplate.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import {
  cd,
  getCurrentWorkingDirectory,
  pwd,
  rm,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/mod.js";
import { promptGitDeploy } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/mod.js";

import { FALLBACK_ENV_EXAMPLE_URL } from "./app/db/constants.js";

export async function showDevToolsMenu(config: ReliverseConfig) {
  const option = await selectPrompt({
    title: "Dev tools menu",
    options: [
      { label: "remove tests-runtime dir", value: "rm-tests-runtime" },
      { label: "cd tests-runtime", value: "cd-test" },
      {
        label:
          "downloadTemplate + cd tests-runtime + composeEnvFile + promptGitDeploy",
        value: "download-template",
      },
      { label: "Exit", value: "exit" },
    ],
  });

  if (option === "cd-test") {
    await cd("tests-runtime");
    pwd();
  } else if (option === "rm-tests-runtime") {
    const cwd = getCurrentWorkingDirectory();
    const testsRuntimePath = path.join(cwd, "tests-runtime");
    if (await fs.pathExists(testsRuntimePath)) {
      const shouldRemoveTestsRuntime = await confirmPrompt({
        title: "Are you sure you want to remove the tests-runtime folder?",
      });
      if (shouldRemoveTestsRuntime) {
        await rm(testsRuntimePath);
      }
    }
  } else if (option === "download-template") {
    await downloadTemplateOption("blefnk/relivator", config);
  }
}

async function downloadTemplateOption(
  template: TemplateOption,
  config: ReliverseConfig,
) {
  const projectName = await askProjectName();
  const domain = `${projectName}.vercel.app`;
  const targetDir = await downloadTemplate(template, projectName, true);

  relinka("info", `Downloaded template to ${targetDir}`);
  await cd(targetDir);
  pwd();

  await composeEnvFile(targetDir, FALLBACK_ENV_EXAMPLE_URL);

  const deployService = await promptGitDeploy({
    projectName,
    config,
    targetDir,
    domain,
    hasDbPush: false,
    shouldRunDbPush: false,
    shouldInstallDeps: false,
  });

  if (deployService === "none") {
    relinka("info", "Skipping deploy process...");
  } else {
    relinka("success", `Project deployed successfully to ${domain}`);
  }
}
