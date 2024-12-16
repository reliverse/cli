import { confirmPrompt, selectPrompt, task } from "@reliverse/prompts";
import { multiselectPrompt, nextStepsPrompt } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import {
  getDefaultReliverseConfig,
  writeReliverseConfig,
} from "~/utils/configs/reliverseReadWrite.js";
import { relinka } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { setupI18nFiles } from "~/utils/downloadI18nFiles.js";
import { extractRepoInfo } from "~/utils/extractRepoInfo.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { initializeGitRepository } from "~/utils/git.js";
import { i18nMove } from "~/utils/i18nMove.js";
import { isVSCodeInstalled } from "~/utils/isAppInstalled.js";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles.js";

import { askGithubName } from "./askGithubName.js";
import { askGitInitialization } from "./askGitInitialization.js";
import { askProjectDomain } from "./askProjectDomain.js";
import { askProjectName } from "./askProjectName.js";
import { askUserName } from "./askUserName.js";
import { askVercelName } from "./askVercelName.js";
import { composeEnvFile } from "./composeEnvFile.js";
import { checkScriptExists } from "./createWebProjectUtils.js";
import { deployWebProject } from "./deployWebProject.js";
import { generateProjectConfigs } from "./generateProjectConfigs.js";

export async function createWebProject({
  template,
  message,
  allowI18nPrompt,
  isDev,
  config,
}: {
  template: string;
  message: string;
  mode: "buildBrandNewThing" | "installAnyGitRepo";
  allowI18nPrompt: boolean;
  isDev: boolean;
  config?: ReliverseConfig;
}) {
  relinka("info", message);

  // Track deployment state from memory
  const memory = await readReliverseMemory();
  let autoDeploy = false;

  try {
    // Only ask about deployment if not specified in config
    if (config === undefined || !("autoDeploy" in config)) {
      autoDeploy = await confirmPrompt({
        title: "Do you plan to deploy this project right after creation?",
        defaultValue: false,
      });
    } else {
      autoDeploy = config.autoDeploy ?? false;
    }

    // Get usernames based on deployment plan
    const username = config?.projectAuthor || (await askUserName());
    let githubUsername = "";
    let vercelTeamName = "";
    let deployService = "";

    if (autoDeploy) {
      // Handle deployment service selection
      if (
        config?.projectDeployService &&
        config.projectDeployService !== "none"
      ) {
        deployService = config.projectDeployService;
      } else {
        deployService = await selectPrompt({
          title: "Which deployment service do you want to use?",
          content:
            "You can deploy anywhere. This allows me to prepare the necessary tools for deployment.",
          options: [
            { label: "Vercel", value: "Vercel" },
            {
              label: "...",
              value: "coming-soon",
              hint: "coming soon",
              disabled: true,
            },
          ],
        });
      }

      // Get GitHub username if not in config
      githubUsername = config?.projectAuthor || (await askGithubName());

      // Get Vercel team name if not in config
      vercelTeamName = config?.projectState || (await askVercelName());

      // Store GitHub and Vercel usernames in memory
      await updateReliverseMemory({
        name: username,
        githubUsername,
        vercelUsername: vercelTeamName,
      });
    }

    // Get app name if not in config
    const projectName = config?.projectTemplate
      ? path.basename(config.projectTemplate)
      : await askProjectName();

    // Get domain if not in config
    const domain =
      config?.projectDomain || (await askProjectDomain(projectName));
    let targetDir: string | undefined;

    relinka("info", `Now I'm downloading the ${template} template...`);

    await task({
      spinnerSolution: "ora",
      initialMessage: "Downloading template...",
      successMessage: "✅ Template downloaded successfully!",
      errorMessage: "❌ Failed to download template...",
      async action(updateMessage) {
        targetDir = await downloadGitRepo(projectName, template, isDev);
        updateMessage("Some magic is happening... This may take a while...");
      },
    });

    await task({
      spinnerSolution: "ora",
      initialMessage: "Editing some texts in the initialized files...",
      successMessage:
        "✅ I edited some texts in the initialized files for you.",
      errorMessage:
        "❌ I've failed to edit some texts in the initialized files...",
      async action(updateMessage) {
        const { author, projectName: oldProjectName } =
          extractRepoInfo(template);
        updateMessage("Some magic is happening... This may take a while...");
        await replaceStringsInFiles(targetDir, {
          [`${oldProjectName}.com`]: domain,
          [author]: username,
          [oldProjectName]: projectName,
          ["relivator.com"]: domain,
        });
      },
    });

    if (allowI18nPrompt) {
      const i18nShouldBeEnabled = await confirmPrompt({
        title:
          "Do you want to enable i18n (internationalization) for this project?",
        content: "Option `N` here may not work currently. Please be patient.",
      });

      const i18nFolderExists = await fs.pathExists(
        path.join(targetDir, "src/app/[locale]"),
      );

      if (i18nFolderExists) {
        relinka(
          "info-verbose",
          "i18n is already enabled for this project. No changes needed.",
        );
      }

      if (i18nShouldBeEnabled && !i18nFolderExists) {
        await task({
          spinnerSolution: "ora",
          initialMessage: "Moving app to locale...",
          successMessage: "✅ I moved app to locale successfully!",
          errorMessage: "❌ I've failed to move app to locale...",
          async action(updateMessage) {
            try {
              await i18nMove(targetDir, "moveLocaleToApp");
              updateMessage(
                "Some magic is happening... This may take a while...",
              );
              await setupI18nFiles(targetDir);
            } catch (error) {
              relinka("error", "Error during i18n move:", error.toString());
              throw error;
            }
          },
        });
      }

      if (!i18nShouldBeEnabled && i18nFolderExists) {
        relinka(
          "info",
          "Just a moment...",
          "I'm trying to convert initialized project from i18n version to non-i18n...",
        );
        await task({
          spinnerSolution: "ora",
          initialMessage: "Moving app to locale...",
          successMessage: "✅ I moved app to locale successfully!",
          errorMessage: "❌ I've failed to move app to locale...",
          async action(updateMessage) {
            await i18nMove(targetDir, "moveLocaleToApp");
            updateMessage(
              "Some magic is happening... This may take a while...",
            );
            await setupI18nFiles(targetDir);
          },
        });
      }
    }

    await generateProjectConfigs(targetDir);

    const cwd = getCurrentWorkingDirectory();

    // Skip git initialization if configured
    if (!config?.autoGitInit) {
      const gitOption = await askGitInitialization();
      await initializeGitRepository(targetDir, gitOption);
    }

    // Skip dependency installation if configured
    let autoDepsInstall = !config?.autoDepsInstall;
    if (autoDepsInstall && !isDev) {
      autoDepsInstall = await confirmPrompt({
        title:
          "Do you want me to install dependencies? (it may take some time)",
        titleColor: "retroGradient",
        defaultValue: true,
      });
    }

    // Generate or update reliverse.json
    const rules = await getDefaultReliverseConfig(
      projectName || "my-app",
      username || "user",
    );

    // Update rules based on project setup
    rules.features = {
      ...rules.features,
      i18n: allowI18nPrompt,
      authentication: autoDeploy,
      database: autoDepsInstall,
    };

    if (autoDeploy) {
      rules.deployPlatform = deployService as ReliverseConfig["deployPlatform"];
      rules.deployUrl = domain
        ? `https://${domain}`
        : `https://${projectName}.vercel.app`;
      rules.projectRepository = `https://github.com/${githubUsername}/${projectName}`;
      rules.productionBranch = "main";
    }

    await writeReliverseConfig(targetDir, rules);
    relinka(
      "success-verbose",
      "Generated reliverse.json with project-specific settings",
    );

    if (autoDepsInstall) {
      await installDependencies({
        cwd: targetDir,
      });

      // Skip database scripts if configured
      if (!config?.autoDbScripts) {
        const hasDbPush = await checkScriptExists(targetDir, "db:push");
        const hasDbSeed = await checkScriptExists(targetDir, "db:seed");
        const hasCheck = await checkScriptExists(targetDir, "check");

        if (hasDbPush) {
          const shouldRunDbPush = await confirmPrompt({
            title: "Do you want to run `bun db:push`?",
            defaultValue: true,
          });
          if (shouldRunDbPush) {
            try {
              await execa("bun", ["db:push"], {
                cwd: targetDir,
                stdio: "inherit",
              });
            } catch (error) {
              relinka(
                "error",
                "Error running `bun db:push`:",
                error.toString(),
              );
            }
          }
        }

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
                error.toString(),
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
              relinka("error", "Error running `bun check`:", error.toString());
            }
          }
        }
      }
    }

    const vscodeInstalled = isVSCodeInstalled();

    const tempGitURL =
      "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";
    await composeEnvFile(targetDir, tempGitURL);

    if (autoDeploy) {
      await deployWebProject(
        memory,
        projectName,
        githubUsername,
        targetDir,
        domain,
        deployService,
        vercelTeamName,
      );
    }

    const shouldRemoveTemp = true;
    if (shouldRemoveTemp) {
      const tempRepoDir = isDev
        ? path.join(cwd, "tests-runtime", ".temp")
        : path.join(targetDir, ".temp");

      if (await fs.pathExists(tempRepoDir)) {
        await fs.remove(tempRepoDir);
        relinka("info-verbose", "Temporary directory removed.");
      }
    }

    relinka(
      "info",
      `🎉 ${template} was successfully installed to ${targetDir}.`,
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
        "",
        "- P.S. Run `reliverse` in the project directory to add/remove features.",
      ],
    });

    const nextActions = await multiselectPrompt({
      title: "What would you like to do next?",
      titleColor: "cyanBright",
      defaultValue: ["close", "ide"],
      options: [
        {
          label: "Close @reliverse/cli",
          value: "close",
        },
        {
          label: "Open Reliverse Documentation",
          value: "docs",
          hint: "View documentation",
        },
        {
          label: "Join Reliverse Discord Server",
          value: "discord",
        },
        {
          label: "Open Your Default Code Editor",
          value: "ide",
          hint: vscodeInstalled ? "Detected: VSCode-based IDE" : "",
        },
      ],
    });

    for (const action of nextActions) {
      if (action === "docs") {
        relinka("info", "Opening Reliverse Documentation...");
        try {
          await open("https://docs.reliverse.org");
        } catch (error) {
          relinka("error", "Error opening documentation:", error.toString());
        }
      } else if (action === "discord") {
        relinka("info", "Joining Reliverse Discord server...");
        try {
          await open("https://discord.gg/Pb8uKbwpsJ");
        } catch (error) {
          relinka("error", "Error opening Discord:", error.toString());
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
      `👋 I'll have some more features coming soon! See you soon, ${username}!`,
    );

    relinka("success", "✅ Project created successfully!");
  } catch (error) {
    relinka(
      "error",
      "Project creation failed:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
