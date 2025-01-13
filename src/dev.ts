import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseMemory, TemplateOption } from "~/types.js";

import { downloadTemplate } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadTemplate.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/mod.js";
import { promptGitDeploy } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/mod.js";
import { cd, pwd, rm } from "~/utils/terminalHelpers.js";

import type { ReliverseConfig } from "./utils/reliverseConfig.js";

import { FALLBACK_ENV_EXAMPLE_URL } from "./app/constants.js";
import { aiChatHandler } from "./utils/aiChatHandler.js";

async function rmTestsRuntime(cwd: string) {
  const testsRuntimePath = path.join(cwd, "tests-runtime");
  if (await fs.pathExists(testsRuntimePath)) {
    const shouldRemoveTestsRuntime = await confirmPrompt({
      title: "Are you sure you want to remove the tests-runtime folder?",
    });
    if (shouldRemoveTestsRuntime) {
      await rm(testsRuntimePath);
    }
  }
}

async function downloadTemplateOption(
  template: TemplateOption,
  config: ReliverseConfig,
  memory: ReliverseMemory,
  isDev: boolean,
  cwd: string,
) {
  const projectName = await askProjectName();
  const primaryDomain = `${projectName}.vercel.app`;
  const projectPath = await downloadTemplate({
    webProjectTemplate: template,
    projectName,
    isDev,
    cwd,
  });

  relinka("info", `Downloaded template to ${projectPath}`);
  await cd(projectPath);
  pwd();

  await composeEnvFile(projectPath, FALLBACK_ENV_EXAMPLE_URL);

  const { deployService } = await promptGitDeploy({
    projectName,
    config,
    projectPath,
    primaryDomain,
    hasDbPush: false,
    shouldRunDbPush: false,
    shouldInstallDeps: false,
    isDev: true,
    memory,
    cwd,
  });

  if (deployService === "none") {
    relinka("info", "Skipping deploy process...");
  } else {
    relinka("success", `Project deployed successfully to ${primaryDomain}`);
  }
}

export async function showDevToolsMenu(
  cwd: string,
  isDev: boolean,
  config: ReliverseConfig,
  memory: ReliverseMemory,
) {
  const testsRuntimePath = path.join(cwd, "tests-runtime");
  const testsRuntimeExists = await fs.pathExists(testsRuntimePath);

  const option = await selectPrompt({
    title: "Dev tools menu",
    options: [
      ...(testsRuntimeExists
        ? [{ label: "remove tests-runtime dir", value: "rm-tests-runtime" }]
        : []),
      {
        label:
          "downloadTemplate + cd tests-runtime + composeEnvFile + promptGitDeploy",
        value: "download-template",
      },
      {
        label: "Create config or force re-population",
        value: "force-populate-config",
      },
      { label: "Test chat with Reliverse AI", value: "ai-chat-test" },
      { label: "Exit", value: "exit" },
    ],
  });

  if (option === "rm-tests-runtime") {
    await rmTestsRuntime(cwd);
  } else if (option === "download-template") {
    await downloadTemplateOption(
      "blefnk/relivator",
      config,
      memory,
      isDev,
      cwd,
    );
  } else if (option === "ai-chat-test") {
    await aiChatHandler(memory);
  }
}
