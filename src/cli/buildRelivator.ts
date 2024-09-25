import { consola } from "consola";
import fs from "fs-extra";
import path from "node:path";

import { downloadI18nFiles, moveAppToLocale } from "~/cli/i18nSetup";
import { checkAndDownloadFiles } from "~/relimter/checkAndDownloadFiles";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import {
  appName,
  confirmation,
  dependencies,
  githubUsername,
  gitInitialization,
  promptI18n,
  userWebsite,
} from "~/utils/prompt";
import { replaceStringsInFiles } from "~/utils/replaceStrings";
import { extractRepoInfo } from "~/utils/repoInfo";
import { validate } from "~/utils/validate";

import { installTemplate } from "./installTemplate";
import { handleReplacements } from "./replacementManager";
import { selectTemplate } from "./templateSelection";

const args = process.argv.slice(2);
const isDevelopment = args.includes("--dev");

export async function buildRelivator() {
  const cwd = getCurrentWorkingDirectory();

  consola.info(
    // eslint-disable-next-line @stylistic/max-len
    "'blefnk/relivator' template is a highly modified 'sadmann7/skateshop' template, which can be a good starting point to build your own Relivator as well.",
  );

  const template = await selectTemplate();
  const name = await appName();
  const githubUser = await githubUsername();
  const website = await userWebsite();
  const gitOption = await gitInitialization();
  const deps = await dependencies("buildRelivator");
  const confirmed = await confirmation();

  if (!confirmed) {
    consola.info("Project creation process was canceled.");

    return;
  }

  await installTemplate(name, template, deps, gitOption);

  const targetDir = isDevelopment
    ? path.join(cwd, "..", name)
    : path.join(cwd, name);

  await handleReplacements(targetDir, template, name, githubUser, website);

  // Ask if the user wants i18n support
  const enableI18n = await promptI18n();

  if (enableI18n) {
    // Step 1: Move all content of src/app to src/app/[locale]
    await moveAppToLocale(targetDir);

    // Step 2: Download the new layout.ts and page.ts, handling the temp-repo-clone properly
    await downloadI18nFiles(targetDir, isDevelopment);
  }

  await checkAndDownloadFiles(targetDir);

  consola.info("");
  consola.success("🤘 Project created successfully.");
  consola.info(`👉 If you have VSCode installed, run: code ${targetDir}\n`);
}
