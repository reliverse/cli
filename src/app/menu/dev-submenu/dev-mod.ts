import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import type { RepoOption } from "~/utils/projectRepository.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { FALLBACK_ENV_EXAMPLE_URL } from "~/app/constants.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/cef-mod.js";
import { promptGitDeploy } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/gdp-mod.js";
import { downloadRepo } from "~/utils/downloading/downloadRepo.js";
import { cd, pwd, rm } from "~/utils/terminalHelpers.js";

export async function rmTestsRuntime(cwd: string) {
  const TestsRuntimePath = path.join(cwd, "tests-runtime");
  if (await fs.pathExists(TestsRuntimePath)) {
    const shouldRemoveTestsRuntime = await confirmPrompt({
      title: "Are you sure you want to remove the tests-runtime folder?",
    });
    if (shouldRemoveTestsRuntime) {
      await rm(TestsRuntimePath);
    }
  }
}

export async function downloadRepoOption(
  template: RepoOption,
  config: ReliverseConfig,
  memory: ReliverseMemory,
  isDev: boolean,
  cwd: string,
  skipPrompts: boolean,
) {
  const projectName = await askProjectName({ repoName: "" });
  const primaryDomain = `${projectName}.vercel.app`;
  const { dir } = await downloadRepo({
    repoURL: template,
    projectName,
    isDev,
    cwd,
  });

  relinka("info", `Downloaded template to ${dir}`);
  await cd(dir);
  pwd();

  const shouldMaskSecretInput = await confirmPrompt({
    title:
      "Do you want to mask secret inputs (e.g., GitHub token) in the next steps?",
    content:
      "Regardless of your choice, your data will be securely stored on your device.",
  });

  await composeEnvFile(
    dir,
    FALLBACK_ENV_EXAMPLE_URL,
    shouldMaskSecretInput,
    skipPrompts,
    config,
  );

  const { deployService } = await promptGitDeploy({
    projectName,
    config,
    projectPath: dir,
    primaryDomain,
    hasDbPush: false,
    shouldRunDbPush: false,
    shouldInstallDeps: false,
    isDev: true,
    memory,
    cwd,
    shouldMaskSecretInput: false,
    skipPrompts: false,
    selectedTemplate: "blefnk/relivator",
  });

  if (deployService === "none") {
    relinka("info", "Skipping deploy process...");
  } else {
    relinka("success", `Project deployed successfully to ${primaryDomain}`);
  }
}
