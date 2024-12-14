// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import {
  confirmPrompt,
  selectPrompt,
  task,
  inputPrompt,
} from "@reliverse/prompts";
import { multiselectPrompt, nextStepsPrompt } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import os from "os";
import path from "pathe";
import pc from "picocolors";

import { FILE_PATHS } from "~/app/data/constants.js";
import { askAppDomain } from "~/app/menu/askAppDomain.js";
import { askAppName } from "~/app/menu/askAppName.js";
import { askCheckAndDownloadFiles } from "~/app/menu/askCheckAndDownloadFiles.js";
import { askGithubName } from "~/app/menu/askGithubName.js";
import { askGitInitialization } from "~/app/menu/askGitInitialization.js";
import { askUserName } from "~/app/menu/askUserName.js";
import { askVercelName } from "~/app/menu/askVercelName.js";
import { composeEnvFile } from "~/app/menu/composeEnvFile.js";
import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import {
  CHECKPOINT_STEPS,
  type CheckpointStep,
  clearCheckpoint,
  getPreviousStep,
  isValidCheckpointStep,
  readCheckpoint,
  saveCheckpoint,
} from "~/utils/checkpoint.js";
import { relinka } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { downloadI18nFiles } from "~/utils/downloadI18nFiles.js";
import { extractRepoInfo } from "~/utils/extractRepoInfo.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { initializeGitRepository } from "~/utils/git.js";
import { ghLogin } from "~/utils/github.js";
import { i18nMove } from "~/utils/i18nMove.js";
import { isVSCodeInstalled } from "~/utils/isAppInstalled.js";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles.js";

// import { isBunInstalled, getPackageManager } from "~/utils/temp/menu/utils/packageManager.js";

async function checkScriptExists(
  targetDir: string,
  scriptName: string,
): Promise<boolean> {
  try {
    const packageJsonPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return !!packageJson.scripts?.[scriptName];
    }
    return false;
  } catch (error: unknown) {
    relinka(
      "error",
      `Error checking for script ${scriptName}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export async function createWebProject({
  template,
  message,
  allowI18nPrompt,
  isDev,
  checkpointName,
}: {
  template: string;
  message: string;
  mode: "buildBrandNewThing" | "installAnyGitRepo";
  allowI18nPrompt: boolean;
  isDev: boolean;
  checkpointName?: string;
}) {
  relinka("info", message);

  // Track deployment and GitHub CLI state from memory
  const memory = await readReliverseMemory();
  let useGitHubCLI = false;
  let isGitHubCLIInstalled = false;
  let currentStep: CheckpointStep = CHECKPOINT_STEPS.NOT_STARTED;

  // If checkpoint exists, try to restore state
  if (checkpointName) {
    const checkpoint = await readCheckpoint(checkpointName, isDev);
    if (checkpoint && isValidCheckpointStep(checkpoint.step)) {
      relinka("info", `Resuming project from checkpoint: ${checkpoint.step}`);
      currentStep = checkpoint.step;

      // If we're resuming from a failed state, start from the previous successful step
      if (currentStep === CHECKPOINT_STEPS.FAILED) {
        currentStep = getPreviousStep(currentStep);
      }
    }
  }

  try {
    const planToDeploy = await confirmPrompt({
      title: "Do you plan to deploy this project after creation?",
      content: "This will help me prepare the necessary tools.",
      defaultValue: true,
    });

    // Store planToDeploy in memory
    await updateReliverseMemory({
      user: {
        ...memory.user,
        planToDeploy,
      },
    });

    // Get usernames based on deployment plan
    const username = await askUserName();
    let githubUsername = "";
    let vercelUsername = "";

    if (planToDeploy) {
      githubUsername = await askGithubName();
      vercelUsername = await askVercelName();

      // Store GitHub and Vercel usernames in memory
      await updateReliverseMemory({
        user: {
          ...memory.user,
          name: username,
          githubName: githubUsername,
          vercelName: vercelUsername,
        },
      });
    }

    const appName = await askAppName();

    // Save initial checkpoint
    if (!checkpointName) {
      checkpointName = appName;
    }

    currentStep = CHECKPOINT_STEPS.INITIAL_SETUP;
    await saveCheckpoint(
      checkpointName,
      {
        step: currentStep,
        data: {
          appName,
        },
      },
      isDev,
    );

    if (planToDeploy) {
      relinka("info", "Checking if GitHub CLI is installed...");

      try {
        const { stdout } = await execa("gh", ["--version"]);
        isGitHubCLIInstalled = true;
        useGitHubCLI = true;
        // Store GitHub CLI state in memory
        await updateReliverseMemory({
          user: {
            ...memory.user,
            useGitHubCLI,
            isGitHubCLIInstalled,
          },
        });
        relinka(
          "success",
          `GitHub CLI is already installed! (${stdout.split("\n")[0]})`,
        );
      } catch (error: unknown) {
        const gitChoice = await selectPrompt({
          title: "GitHub CLI is not installed. How would you like to proceed?",
          endTitle: "After that, please run `reliverse` again.",
          titleColor: "red",
          content:
            "GitHub CLI provides a smoother experience for repository management and deployment.",
          options: [
            {
              label: "Install GitHub CLI (Recommended)",
              value: "gh",
              hint: pc.dim("Smoother experience with repository management"),
            },
            {
              label: "Use Classic Git",
              value: "git",
              hint: pc.dim(
                "Basic git commands only | Use it if you don't want to install GitHub CLI",
              ),
            },
          ],
        });

        if (gitChoice === "gh") {
          relinka(
            "info",
            "Opening GitHub CLI installation page in your browser...",
          );
          await open("https://cli.github.com");
          relinka(
            "error",
            "🔴 Please install GitHub CLI, then restart your terminal, and run `reliverse` again.",
          );
          return;
        }
        // If user chose classic git, continue without GitHub CLI
        useGitHubCLI = false;
        // Store GitHub CLI state in memory
        await updateReliverseMemory({
          user: {
            ...memory.user,
            useGitHubCLI,
            isGitHubCLIInstalled: false,
          },
        });

        if (error) {
          relinka(
            "error",
            "Error checking if GitHub CLI is installed:",
            error.toString(),
          );
          return;
        }
      }
    }

    const deployService = await selectPrompt({
      title: "Which deployment service do you want to use?",
      content:
        "You can deploy anywhere manually. But this choice is allows me to prepare specific code for each platform. If you want, I will also try to deploy your project to the selected platform. Currently, I support only Vercel.",
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

    const domain = await askAppDomain(appName);
    let targetDir: string | undefined;

    relinka("info", `Now I'm downloading the ${template} template...`);

    await task({
      spinnerSolution: "ora",
      initialMessage: "Downloading template...",
      successMessage: "✅ Template downloaded successfully!",
      errorMessage: "❌ Failed to download template...",
      async action(updateMessage) {
        targetDir = await downloadGitRepo(appName, template, isDev);
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
          [oldProjectName]: appName,
          ["relivator.com"]: domain,
        });
      },
    });

    if (allowI18nPrompt) {
      const i18nShouldBeEnabled = await confirmPrompt({
        title:
          "Do you want to enable i18n (internationalization) for this project?",
      });

      const i18nFolderExists = await fs.pathExists(
        path.join(targetDir, "src/app/[locale]"),
      );

      if (i18nFolderExists) {
        relinka(
          "info-verbose",
          "i18n is already enabled for this project. Skipping...",
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
              await downloadI18nFiles(targetDir, isDev);
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
            await downloadI18nFiles(targetDir, isDev);
          },
        });
      }
    }

    await askCheckAndDownloadFiles(targetDir, appName);

    const cwd = getCurrentWorkingDirectory();

    // const { pmName } = await getPackageManager(cwd);
    // let pm = pmName;
    // if (await isBunInstalled()) {
    //   pm = "bun";
    // }

    const gitOption = await askGitInitialization();
    const vscodeInstalled = isVSCodeInstalled();

    const tempGitURL =
      "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";
    await composeEnvFile(targetDir, tempGitURL);

    await initializeGitRepository(targetDir, gitOption);

    let shouldInstallByDefault = true;
    if (isDev) {
      shouldInstallByDefault = false;
    }
    const shouldInstallDependencies = await confirmPrompt({
      title: "Do you want me to install dependencies? (it may take some time)",
      titleColor: "retroGradient",
      defaultValue: shouldInstallByDefault,
    });

    if (!shouldInstallDependencies) {
      relinka("info", "You can always install dependencies manually later.");
    } else {
      await installDependencies({
        cwd: targetDir,
      });

      // deprecated
      /* Ask user if they want to install dependencies
      const installDeps = await confirmPrompt({
        title: "Would you like to install dependencies now?",
        defaultValue: true,
      });

      if (installDeps) {
        // Detect package manager and install dependencies
        const hasYarn = await fs.pathExists(path.join(targetDir, "yarn.lock"));
        const hasPnpm = await fs.pathExists(
          path.join(targetDir, "pnpm-lock.yaml"),
        );
        const hasBun = await fs.pathExists(path.join(targetDir, "bun.lockb"));

        const installCmd = hasBun
          ? "bun install"
          : hasPnpm
            ? "pnpm install"
            : hasYarn
              ? "yarn"
              : "npm install";

        await execa(installCmd.split(" ")[0], installCmd.split(" ").slice(1), {
          cwd: targetDir,
        });
        relinka("success-verbose", "Dependencies installed successfully");
      } */
    }

    if (!isDev && shouldInstallDependencies) {
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
    } else {
      const scripts = [];
      if (await checkScriptExists(targetDir, "db:push")) {
        scripts.push("`bun db:push`");
      }
      if (await checkScriptExists(targetDir, "db:seed")) {
        scripts.push("`bun db:seed`");
      }
      if (await checkScriptExists(targetDir, "check")) {
        scripts.push("`bun check`");
      }

      if (scripts.length > 0) {
        relinka(
          "info",
          `Please run \`bun i\`, ${scripts.join(", ")} manually.`,
          "It's recommended to do it before starting the project at the first time.",
        );
      } else {
        relinka(
          "info",
          "Please run `bun i` manually.",
          "It's recommended to do it before starting the project at the first time.",
        );
      }
    }

    const shouldDeploy = await confirmPrompt({
      title: `Do you want to deploy this project to ${deployService}?`,
      content: "This will start the deployment process.",
      defaultValue: false,
    });

    if (shouldDeploy) {
      // Use the existing GitHub CLI state instead of checking again
      if (!isGitHubCLIInstalled && useGitHubCLI) {
        relinka(
          "error",
          "GitHub CLI is required but not installed. Please restart the process after installing GitHub CLI.",
        );
        return;
      }

      // Check if repo exists and handle repo creation
      let repoName = appName;
      let repoExists = false;

      do {
        try {
          if (useGitHubCLI) {
            // Check GitHub CLI authentication status
            try {
              await execa("gh", ["auth", "status"]);
            } catch (authError: unknown) {
              relinka("info-verbose", authError.toString());
              await ghLogin();
            }

            await execa("gh", [
              "repo",
              "view",
              `${githubUsername}/${repoName}`,
            ]);
          } else {
            // Use git ls-remote for classic git check
            await execa("git", [
              "ls-remote",
              `https://github.com/${githubUsername}/${repoName}.git`,
            ]);
          }
          repoExists = true;
          relinka(
            "info",
            `Repository ${githubUsername}/${repoName} already exists.`,
          );
        } catch (error: unknown) {
          if (error instanceof Error && error.message?.includes("404")) {
            relinka(
              "info",
              `Repository ${githubUsername}/${repoName} is available.`,
            );
          } else {
            relinka("error", "Error checking repository:", error.toString());
            return;
          }

          try {
            relinka("info", "Creating new repository...");
            if (useGitHubCLI) {
              await execa(
                "gh",
                ["repo", "create", repoName, "--public", "--source", "."],
                {
                  cwd: targetDir,
                },
              );
            } else {
              // Create repo using classic git commands
              await execa("git", ["init"], { cwd: targetDir });
              await execa("git", ["add", "."], { cwd: targetDir });
              await execa("git", ["commit", "-m", "Initial commit"], {
                cwd: targetDir,
              });
              await execa(
                "git",
                [
                  "remote",
                  "add",
                  "origin",
                  `https://github.com/${githubUsername}/${repoName}.git`,
                ],
                { cwd: targetDir },
              );
            }
            repoExists = true;
            relinka(
              "success",
              `Repository ${githubUsername}/${repoName} created successfully!`,
            );
          } catch (createError: unknown) {
            if (
              createError instanceof Error &&
              createError.message?.includes("already exists")
            ) {
              relinka("error", "Repository name already taken.");
              repoName = await inputPrompt({
                title: "Please enter a different repository name:",
                defaultValue: `${repoName}-1`,
                validate: (value: string): string | void => {
                  if (!value?.trim()) {
                    return "Repository name is required";
                  }
                  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
                    return "Invalid repository name. Use only letters, numbers, hyphens, and underscores";
                  }
                },
              });
              continue;
            }

            relinka(
              "error",
              "Failed to create repository:",
              createError instanceof Error
                ? createError.message
                : String(createError),
            );
            return;
          }
        }
      } while (!repoExists);

      const shouldPushCommit = await confirmPrompt({
        title: "Do you want to push the commit to the remote repository?",
        defaultValue: true,
      });

      if (shouldPushCommit) {
        try {
          relinka("info", "Pushing to remote repository...");
          await execa("git", ["push", "origin", "main"], {
            cwd: targetDir,
          });
          relinka("success", "Successfully pushed to remote repository!");
        } catch (pushError: unknown) {
          relinka(
            "error",
            "Failed to push to repository:",
            pushError instanceof Error ? pushError.message : String(pushError),
          );
          return;
        }
      }

      if (deployService === "Vercel") {
        relinka("info", "Let me check if Vercel CLI is installed...");

        let isVercelInstalled = false;

        // Check if vercel is installed
        try {
          const { stdout } = await execa("vercel", ["--version"]);
          isVercelInstalled = true;
          relinka(
            "success",
            `Vercel CLI is already installed! (${stdout.trim()})`,
          );
        } catch (error: unknown) {
          relinka("info", "Vercel CLI is not installed. Installing it now...");
          relinka("info-verbose", error.toString());

          try {
            const { stdout: installOutput } = await execa("bun", [
              "install",
              "-g",
              "vercel",
            ]);
            isVercelInstalled = true;
            relinka("success", "Vercel CLI installed successfully!");
            relinka("info-verbose", installOutput);
          } catch (installError: unknown) {
            const errorMessage =
              installError instanceof Error
                ? installError.message
                : String(installError);

            relinka(
              "error",
              "Failed to install Vercel CLI. Please install it manually using 'bun install -g vercel'",
              errorMessage,
            );
            return;
          }
        }

        if (!isVercelInstalled) {
          relinka("error", "Unable to proceed without Vercel CLI installed.");
          return;
        }

        relinka("info", "Checking for Vercel authentication...");

        // First try to get token from memory
        let memory = await readReliverseMemory();
        let vercelToken = memory.key;

        // If no token in memory, guide user to create one
        if (!vercelToken) {
          relinka("info", "Opening Vercel tokens page in your browser...");
          await open("https://vercel.com/account/tokens");

          vercelToken = await inputPrompt({
            title: "Please create and paste your Vercel token:",
            content: "It will be saved securely on your machine.",
            validate: (value: string): string | void => {
              if (!value?.trim()) {
                return "Token is required";
              }
            },
          });

          // Save token to memory
          await updateReliverseMemory({
            key: vercelToken,
          });

          // Verify token was saved
          memory = await readReliverseMemory();
          if (!memory.key) {
            relinka("error", "Failed to save Vercel token to memory.");
            return;
          }

          relinka("success", "Vercel token saved successfully!");
        }

        try {
          const { Vercel } = await import("@vercel/sdk");
          const vercel = new Vercel({
            bearerToken: vercelToken,
          });

          const createResponse = await vercel.deployments.createDeployment({
            requestBody: {
              name: appName,
              target: "production",
              gitSource: {
                type: "github",
                repo: appName,
                ref: "main",
                org: githubUsername,
              },
            },
          });

          relinka(
            "info",
            `Deployment created: ID ${createResponse.id} and status ${createResponse.status}`,
          );

          // Check deployment status
          let deploymentStatus;
          let deploymentURL;
          do {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between checks

            const statusResponse = await vercel.deployments.getDeployment({
              idOrUrl: createResponse.id,
              withGitRepoInfo: "true",
            });

            deploymentStatus = statusResponse.status;
            deploymentURL = statusResponse.url;
            relinka("info", `Deployment status: ${deploymentStatus}`);
          } while (
            deploymentStatus === "BUILDING" ||
            deploymentStatus === "INITIALIZING"
          );

          if (deploymentStatus === "READY") {
            relinka("success", `Deployment successful. URL: ${deploymentURL}`);

            // Set up domain if provided
            if (domain) {
              try {
                const addDomainResponse =
                  await vercel.projects.addProjectDomain({
                    idOrName: appName,
                    requestBody: {
                      name: domain,
                    },
                  });

                relinka("success", `Domain added: ${addDomainResponse.name}`);
              } catch (error) {
                relinka(
                  "error",
                  "Error setting up domain:",
                  error instanceof Error ? error.message : String(error),
                );
              }
            }
          } else {
            relinka("error", "Deployment failed or was canceled");
          }
        } catch (error) {
          if (error instanceof Error && error.message?.includes("403")) {
            relinka(
              "error",
              "Authentication failed. Your token might be invalid or expired.",
              "Please create a new token at https://vercel.com/account/tokens",
            );
            // Remove invalid token from memory
            await updateReliverseMemory({
              key: null,
            });
          } else {
            relinka(
              "error",
              "Error during deployment:",
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    }

    const shouldRemoveTemp = true;
    if (shouldRemoveTemp) {
      // TODO: maybe we should reimplement this in a better way
      const tempRepoDir = isDev
        ? path.join(cwd, "tests-runtime", FILE_PATHS.tempRepoClone)
        : path.join(
            os.homedir(),
            ".reliverse",
            "checkpoints",
            FILE_PATHS.tempRepoClone,
          );

      if (await fs.pathExists(tempRepoDir)) {
        await fs.remove(tempRepoDir);
        relinka("info-verbose", "Temporary clone folder removed.");
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
          hint: "Close @reliverse/cli",
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

    // Update checkpoint before potentially risky operations
    currentStep = CHECKPOINT_STEPS.DEPLOYMENT_SETUP;
    await saveCheckpoint(
      checkpointName,
      {
        step: currentStep,
        data: {
          username,
          appName,
          domain,
          deployService,
          targetDir,
          template,
        },
      },
      isDev,
    );

    // Mark as completed at the end
    if (checkpointName) {
      await saveCheckpoint(
        checkpointName,
        {
          step: CHECKPOINT_STEPS.COMPLETED,
          data: {
            username,
            appName,
            domain,
            deployService,
            targetDir,
            template,
          },
        },
        isDev,
      );
      await clearCheckpoint(checkpointName, isDev);
      relinka("success", "Project completed successfully! Checkpoint cleared.");
    }
  } catch (error) {
    // Save failed state if something goes wrong
    if (checkpointName) {
      await saveCheckpoint(
        checkpointName,
        {
          step: CHECKPOINT_STEPS.FAILED,
          data: {
            error: error instanceof Error ? error.message : String(error),
            lastStep: currentStep,
          },
        },
        isDev,
      );
      relinka(
        "error",
        "Project creation failed. You can resume from the last successful step later.",
      );
    }
    throw error;
  }
}
