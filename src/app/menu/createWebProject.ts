import { confirmPrompt, selectPrompt, task } from "@reliverse/prompts";
import { multiselectPrompt, nextStepsPrompt } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import path from "pathe";

import type { Behavior, GitOption, ReliverseConfig } from "~/types.js";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import { decideBehavior } from "~/utils/behavior.js";
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

  // Read memory for state
  const memory = await readReliverseMemory();

  // Determine deploy behavior from config or default to "prompt"
  const deployBehavior: Behavior = config?.deployBehavior || "prompt";

  let shouldDeploy: boolean;
  if (deployBehavior === "autoYes") {
    // auto=yes, no prompt
    shouldDeploy = true;
  } else if (deployBehavior === "autoNo") {
    // auto=no, no prompt
    shouldDeploy = false;
  } else {
    shouldDeploy = await confirmPrompt({
      title: "Do you plan to deploy this project right after creation?",
      defaultValue: true,
    });
  }

  const username = config?.projectAuthor || (await askUserName());
  let githubUsername = "";
  let vercelTeamName = "";
  let deployService = "";

  if (shouldDeploy) {
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
    githubUsername =
      memory?.githubUsername !== ""
        ? memory?.githubUsername
        : await askGithubName();

    // Get Vercel team name if not in config
    vercelTeamName =
      memory?.vercelUsername !== ""
        ? memory?.vercelUsername
        : await askVercelName();

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
  const domain = config?.projectDomain || (await askProjectDomain(projectName));
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
    successMessage: "✅ I edited some texts in the initialized files for you.",
    errorMessage:
      "❌ I've failed to edit some texts in the initialized files...",
    async action(updateMessage) {
      const { author, projectName: oldProjectName } = extractRepoInfo(template);
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
      relinka("info-verbose", "i18n is already enabled. No changes needed.");
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
      relinka("info", "Converting from i18n version to non-i18n...");
      await task({
        spinnerSolution: "ora",
        initialMessage: "Moving app to locale...",
        successMessage: "✅ I moved app to locale successfully!",
        errorMessage: "❌ I've failed to move app to locale...",
        async action(updateMessage) {
          await i18nMove(targetDir, "moveLocaleToApp");
          updateMessage("Some magic is happening... This may take a while...");
          await setupI18nFiles(targetDir);
        },
      });
    }
  }

  await generateProjectConfigs(targetDir);

  const cwd = getCurrentWorkingDirectory();

  const gitBehavior: Behavior = config?.gitBehavior || "prompt";
  const gitDecision = decideBehavior(gitBehavior);

  let gitOption: GitOption;

  if (gitDecision) {
    // auto yes means always initialize a new Git repo
    gitOption = "initializeNewGitRepository";
  } else if (!gitDecision) {
    // auto no means keep existing .git folder
    gitOption = "keepExistingGitFolder";
  } else {
    // gitDecision === null => prompt the user
    gitOption = await askGitInitialization();
  }

  await task({
    spinnerSolution: "ora",
    initialMessage: "Initializing Git repository...",
    successMessage: "✅ Git repository handled",
    errorMessage: "❌ Failed to handle Git repository...",
    async action() {
      await initializeGitRepository(targetDir, gitOption);
    },
  });

  const depsBehavior: Behavior = config?.depsBehavior || "prompt";
  const depsDecision = decideBehavior(depsBehavior);

  let shouldInstallDeps: boolean;
  if (depsDecision) {
    shouldInstallDeps = true;
  } else if (!depsDecision) {
    shouldInstallDeps = false;
  } else {
    shouldInstallDeps = await confirmPrompt({
      title: "Do you want me to install dependencies? (it may take some time)",
      titleColor: "retroGradient",
      defaultValue: true,
    });
  }

  const rules = await getDefaultReliverseConfig(
    projectName || "my-app",
    username || "user",
  );

  // Update rules based on project setup
  rules.features = {
    ...rules.features,
    i18n: allowI18nPrompt,
    authentication: shouldDeploy,
    database: shouldInstallDeps,
  };

  if (shouldDeploy) {
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

  if (shouldInstallDeps) {
    await installDependencies({
      cwd: targetDir,
    });

    const hasDbPush = await checkScriptExists(targetDir, "db:push");
    const hasDbSeed = await checkScriptExists(targetDir, "db:seed");
    const hasCheck = await checkScriptExists(targetDir, "check");

    if (hasDbPush) {
      const dbPushBehavior: Behavior = config?.scriptsBehavior || "prompt";
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
        } catch (error) {
          relinka("error", "Error running `bun db:push`:", error.toString());
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
          relinka("error", "Error running `bun db:seed`:", error.toString());
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

  const vscodeInstalled = isVSCodeInstalled();

  const tempGitURL =
    "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";
  await composeEnvFile(targetDir, tempGitURL);

  await deployWebProject(
    deployBehavior,
    memory,
    projectName,
    githubUsername,
    targetDir,
    domain,
    vercelTeamName,
  );

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

  relinka("info", `🎉 ${template} was successfully installed to ${targetDir}.`);

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
      "- P.S. Run `reliverse cli` in the project directory to add/remove features.",
    ],
  });

  const nextActions = await multiselectPrompt({
    title: "What would you like to do next?",
    titleColor: "cyanBright",
    defaultValue: ["ide"],
    options: [
      {
        label: "Open Your Default Code Editor",
        value: "ide",
        hint: vscodeInstalled ? "Detected: VSCode-based IDE" : "",
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
}
