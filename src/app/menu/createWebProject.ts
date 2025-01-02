import { confirmPrompt, spinnerTaskPrompt } from "@reliverse/prompts";
import { multiselectPrompt, nextStepsPrompt } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import path from "pathe";
import pc from "picocolors";

import type { Behavior, DeploymentService, ReliverseConfig } from "~/types.js";

import { decideBehavior } from "~/utils/behavior.js";
import { relinka } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { setupI18nFiles } from "~/utils/downloadI18nFiles.js";
import { extractRepoInfo } from "~/utils/extractRepoInfo.js";
import { i18nMove } from "~/utils/i18nMove.js";
import { isVSCodeInstalled } from "~/utils/isAppInstalled.js";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles.js";

import { askProjectName } from "./askProjectName.js";
import { askUserName } from "./askUserName.js";
import { composeEnvFile } from "./compose-env-file/mod.js";
import { checkScriptExists } from "./createWebProjectUtils.js";
import { generateProjectConfigs } from "./generateProjectConfigs.js";
import { promptForDomain } from "./git-deploy-prompts/helpers/promptForDomain.js";
import { promptGitDeploy } from "./git-deploy-prompts/mod.js";
import { generateReliverseFile } from "./reliverseConfig.js";

export async function createWebProject({
  webProjectTemplate,
  message,
  i18nShouldBeEnabled: defaultI18nShouldBeEnabled,
  isDev,
  config,
}: {
  webProjectTemplate: string;
  message: string;
  mode: "buildBrandNewThing" | "installAnyGitRepo";
  i18nShouldBeEnabled: boolean;
  isDev: boolean;
  config?: ReliverseConfig;
}) {
  relinka("info", message);

  // Get data from config if available
  const shouldUseDataFromConfig =
    config?.experimental?.skipPromptsUseAutoBehavior ?? false;

  // Get username - fall back to askUserName if config data is missing
  const frontendUsername =
    shouldUseDataFromConfig && config?.experimental?.projectAuthor
      ? config.experimental.projectAuthor
      : await askUserName();

  // Get app name - fall back to askProjectName if config data is missing
  const projectName =
    shouldUseDataFromConfig && config?.experimental?.projectTemplate
      ? path.basename(config.experimental.projectTemplate)
      : await askProjectName();

  // Get domain - fall back to promptForDomain if config data is missing
  const domain =
    shouldUseDataFromConfig && config?.experimental?.projectDomain
      ? config.experimental.projectDomain
      : await promptForDomain(projectName);
  let targetDir = "";

  relinka("info", `Now I'm downloading the ${webProjectTemplate} template...`);

  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Downloading template...",
    successMessage: "✅ Template downloaded successfully!",
    errorMessage: "❌ Failed to download template...",
    async action(updateMessage: (message: string) => void) {
      const dir = await downloadGitRepo(projectName, webProjectTemplate, isDev);
      if (!dir) {
        throw new Error("Failed to create target directory");
      }
      targetDir = dir;
      updateMessage("Some magic is happening... This may take a while...");
    },
  });

  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Editing some texts in the initialized files...",
    successMessage: "✅ I edited some texts in the initialized files for you.",
    errorMessage:
      "❌ I've failed to edit some texts in the initialized files...",
    async action(updateMessage: (message: string) => void) {
      const { author, projectName: oldProjectName } =
        extractRepoInfo(webProjectTemplate);
      updateMessage("Some magic is happening... This may take a while...");
      await replaceStringsInFiles(targetDir, {
        [`${oldProjectName}.com`]: domain,
        [author]: frontendUsername,
        [oldProjectName]: projectName,
        ["relivator.com"]: domain,
      });
    },
  });

  if (defaultI18nShouldBeEnabled) {
    const i18nShouldBeEnabled =
      shouldUseDataFromConfig &&
      config?.experimental?.features?.i18n !== undefined
        ? config.experimental.features.i18n
        : await confirmPrompt({
            title:
              "Do you want to enable i18n (internationalization) for this project?",
            content:
              "Option `N` here may not work currently. Please be patient.",
          });

    const i18nFolderExists = await fs.pathExists(
      path.join(targetDir, "src/app/[locale]"),
    );

    if (i18nFolderExists) {
      relinka("info-verbose", "i18n is already enabled. No changes needed.");
    }

    if (i18nShouldBeEnabled && !i18nFolderExists) {
      await spinnerTaskPrompt({
        spinnerSolution: "ora",
        initialMessage: "Moving app to locale...",
        successMessage: "✅ I moved app to locale successfully!",
        errorMessage: "❌ I've failed to move app to locale...",
        async action(updateMessage: (message: string) => void) {
          try {
            await i18nMove(targetDir, "moveLocaleToApp");
            updateMessage(
              "Some magic is happening... This may take a while...",
            );
            await setupI18nFiles(targetDir);
          } catch (error) {
            relinka(
              "error",
              "Error during i18n move:",
              error instanceof Error ? error.message : String(error),
            );
            throw error;
          }
        },
      });
    }

    if (!i18nShouldBeEnabled && i18nFolderExists) {
      relinka("info", "Converting from i18n version to non-i18n...");
      await spinnerTaskPrompt({
        spinnerSolution: "ora",
        initialMessage: "Moving app to locale...",
        successMessage: "✅ I moved app to locale successfully!",
        errorMessage: "❌ I've failed to move app to locale...",
        async action(updateMessage: (message: string) => void) {
          await i18nMove(targetDir, "moveLocaleToApp");
          updateMessage("Some magic is happening... This may take a while...");
          await setupI18nFiles(targetDir);
        },
      });
    }
  }

  const tempGitURL =
    "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";
  await composeEnvFile(targetDir, tempGitURL);

  await generateProjectConfigs(targetDir);

  const depsBehavior: Behavior = config?.experimental?.depsBehavior ?? "prompt";
  let shouldInstallDeps: boolean;
  switch (depsBehavior) {
    case "autoYes":
      shouldInstallDeps = true;
      break;
    case "autoNo":
      shouldInstallDeps = false;
      break;
    default:
      shouldInstallDeps = await confirmPrompt({
        title:
          "Would you like me to install dependencies? It may take some time.",
        content: `This allows me to run scripts provided by the \`${webProjectTemplate}\` template. It may include \`bun db:push\` to init database, \`bun check\` for tasks like linting and formatting, and other scripts.`,
        titleColor: "cyan",
        defaultValue: !isDev,
      });
  }

  if (shouldInstallDeps) {
    await installDependencies({
      cwd: targetDir,
    });

    const hasLatest = await checkScriptExists(targetDir, "latest");
    const hasDbPush = await checkScriptExists(targetDir, "db:push");
    const hasDbSeed = await checkScriptExists(targetDir, "db:seed");
    const hasCheck = await checkScriptExists(targetDir, "check");

    if (hasLatest) {
      const shouldRunLatest = await confirmPrompt({
        title: "Do you want to run 'bun latest'?",
        content: `This will update all dependencies to the latest version. However, ${pc.redBright("it may break something in the project if some dependency has a critical change")}. You can contact the template developer or try to fix it yourself. Link to the used by you template: https://github.com/${webProjectTemplate}`,
        defaultValue: false,
      });
      if (shouldRunLatest) {
        await execa("bun", ["latest"], {
          cwd: targetDir,
          stdio: "inherit",
        });
      }
    }

    if (hasDbPush) {
      const dbPushBehavior: Behavior =
        config?.experimental?.scriptsBehavior ?? "prompt";
      const dbPushDecision = decideBehavior(dbPushBehavior);
      let shouldRunDbPush: boolean;
      if (dbPushDecision) {
        shouldRunDbPush = true;
      } else if (!dbPushDecision) {
        shouldRunDbPush = false;
      } else {
        shouldRunDbPush = await confirmPrompt({
          title: "Do you want to run `bun db:push`?",
          defaultValue: true,
        });
      }

      if (shouldRunDbPush) {
        try {
          await execa("bun", ["db:push"], {
            cwd: targetDir,
            stdio: "inherit",
          });

          if (hasDbSeed) {
            const shouldRunDbSeed = await confirmPrompt({
              title: "Do you want to run `bun db:seed`?",
              defaultValue: true,
            });
            if (shouldRunDbSeed) {
              try {
                await execa("bun", ["db:seed"], {
                  cwd: targetDir,
                  stdio: "inherit",
                });
              } catch (error) {
                relinka(
                  "error",
                  "Error running `bun db:seed`:",
                  error instanceof Error ? error.message : String(error),
                );
              }
            }
          }
        } catch (error) {
          relinka(
            "error",
            "Error running `bun db:push`:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    if (hasCheck) {
      const shouldRunCheck = await confirmPrompt({
        title: "Do you want to run `bun check`?",
        defaultValue: true,
      });
      if (shouldRunCheck) {
        try {
          await execa("bun", ["check"], {
            cwd: targetDir,
            stdio: "inherit",
          });
        } catch (error) {
          relinka(
            "error",
            "Error running `bun check`:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  }

  const vscodeInstalled = isVSCodeInstalled();

  let deployService: DeploymentService = "none";

  // We skip git deploy if no config is provided
  if (config) {
    deployService = await promptGitDeploy(projectName, config, targetDir);
  }

  await generateReliverseFile({
    projectName,
    frontendUsername,
    deployService,
    domain,
    targetDir,
    i18nShouldBeEnabled: defaultI18nShouldBeEnabled,
    shouldInstallDeps,
  });

  relinka(
    "info",
    `🎉 ${webProjectTemplate} was successfully installed to ${targetDir}.`,
  );

  await nextStepsPrompt({
    title: "🤘 Project created successfully! Next steps to get started:",
    titleColor: "cyanBright",
    content: [
      `- If you have VSCode installed, run: code ${targetDir}`,
      `- You can open the project in your terminal: cd ${targetDir}`,
      "- Install dependencies manually if needed: bun i OR pnpm i",
      "- Apply linting and formatting: bun check OR pnpm check",
      "- Run the project: bun dev OR pnpm dev",
    ],
  });

  const nextActions = await multiselectPrompt({
    title: "What would you like to do next?",
    allowAllUnselected: true,
    titleColor: "cyanBright",
    defaultValue: ["ide"],
    options: [
      {
        label: "Open Your Default Code Editor",
        value: "ide",
        hint: vscodeInstalled ? "Detected: VSCode-based IDE" : "",
      },
      {
        label: "Support Reliverse on Patreon",
        value: "patreon",
      },
      {
        label: "Join Reliverse Discord Server",
        value: "discord",
      },
      {
        label: "Open Reliverse Documentation",
        value: "docs",
      },
    ],
  });

  for (const action of nextActions) {
    if (action === "patreon") {
      relinka(
        "info",
        "Opening Reliverse Patreon page ( https://www.patreon.com/c/blefnk/membership )...",
      );
      try {
        await open("https://patreon.com/c/blefnk/membership");
      } catch (error) {
        relinka(
          "error",
          "Error opening Patreon:",
          error instanceof Error ? error.message : String(error),
        );
      }
    } else if (action === "docs") {
      try {
        await open("https://docs.reliverse.org");
      } catch (error) {
        relinka(
          "error",
          "Error opening documentation:",
          error instanceof Error ? error.message : String(error),
        );
      }
    } else if (action === "discord") {
      relinka(
        "info",
        "Opening Reliverse Discord server ( https://discord.gg/Pb8uKbwpsJ )...",
      );
      try {
        await open("https://discord.gg/Pb8uKbwpsJ");
      } catch (error) {
        relinka(
          "error",
          "Error opening Discord:",
          error instanceof Error ? error.message : String(error),
        );
      }
    } else if (action === "ide") {
      relinka(
        "info",
        vscodeInstalled
          ? "Opening the project in VSCode-based IDE..."
          : "Trying to open the project in your default IDE...",
      );
      try {
        await execa("code", [targetDir]);
      } catch (error) {
        relinka(
          "error",
          "Error opening project in your IDE:",
          error instanceof Error ? error.message : String(error),
          `Try to open the project manually with command like: code ${targetDir}`,
        );
      }
    }
  }

  relinka(
    "info",
    `👋 I'll have some more features coming soon! ${frontendUsername ? `See you soon, ${frontendUsername}!` : ""}`,
  );

  relinka(
    "success",
    "✨ One more thing to try (experimental):",
    "👉 Launch `reliverse cli` in your new project to add/remove features.",
  );
}
