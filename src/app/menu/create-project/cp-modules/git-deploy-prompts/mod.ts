import type { Octokit } from "@octokit/rest";

import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import type { DeploymentService, ReliverseMemory } from "~/types.js";
import type { ReliverseConfig } from "~/utils/reliverseSchema.js";

import { askGithubName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askGithubName.js";
import { handleReliverseMemory } from "~/utils/reliverseMemory.js";

import { deployProject } from "./deploy.js";
import { createGithubRepository, initGit } from "./git.js";
import { ensureDbInitialized } from "./helpers/handlePkgJsonScripts.js";
import { promptForDomain } from "./helpers/promptForDomain.js";
import { createOctokitInstance } from "./octokit-instance.js";
import { getVercelProjectDomain } from "./vercel/vercel-domain.js";
import { isProjectDeployed } from "./vercel/vercel-mod.js";

type DecisionKey = "gitBehavior" | "deployBehavior";

type GithubSetupResult = {
  success: boolean;
  octokit?: InstanceType<typeof Octokit>;
  username?: string;
};

/**
 * Makes a decision based on config or user prompt
 */
export async function decide(
  config: ReliverseConfig,
  behaviorKey: DecisionKey,
  title: string,
  content?: string,
  defaultValue = true,
): Promise<boolean> {
  try {
    const behavior = config?.[behaviorKey] ?? "prompt";

    switch (behavior) {
      case "autoYes":
        relinka("info-verbose", `Auto-answering YES to: ${title}`);
        return true;
      case "autoNo":
        relinka("info-verbose", `Auto-answering NO to: ${title}`);
        return false;
      case "prompt":
        return await confirmPrompt({
          title,
          content: content ?? "",
          defaultValue,
        });
      default:
        relinka("warn", `Unknown behavior '${behavior}', defaulting to prompt`);
        return await confirmPrompt({
          title,
          content: content ?? "",
          defaultValue,
        });
    }
  } catch (error) {
    relinka(
      "error",
      "Failed to get decision:",
      error instanceof Error ? error.message : String(error),
    );
    return defaultValue;
  }
}

/**
 * Handles the git initialization step
 */
export async function handleGitInit(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
): Promise<boolean> {
  const gitInitialized = await initGit(cwd, isDev, projectName, projectPath);
  if (!gitInitialized) {
    relinka(
      "error",
      "Failed to initialize git. Stopping git and deploy process.",
    );
    return false;
  }
  return true;
}

/**
 * Handles the GitHub repository creation step
 */
export async function handleGithubRepo(
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  projectName: string,
  projectPath: string,
  shouldMaskSecretInput: boolean,
): Promise<{
  success: boolean;
  octokit?: InstanceType<typeof Octokit>;
  username?: string;
}> {
  if (!memory) {
    relinka("error", "Failed to read reliverse memory");
    return { success: false };
  }

  const githubUsername = await askGithubName(memory);
  if (!githubUsername) {
    relinka("error", "Could not determine GitHub username");
    return { success: false };
  }

  // Even if token is not found, we proceed to createGithubRepo which will handle token prompting
  const repoCreated = await createGithubRepository(
    cwd,
    isDev,
    memory,
    projectName,
    projectPath,
    shouldMaskSecretInput,
  );
  if (!repoCreated) {
    relinka(
      "error",
      "Failed to create GitHub repository. Stopping deploy process.",
    );
    return { success: false };
  }

  // Read the memory again to get the new GitHub token
  const updatedMemory = await handleReliverseMemory();

  if (!updatedMemory?.githubKey) {
    relinka("error", "GitHub token still not found after setup");
    return { success: false };
  }

  const octokit = createOctokitInstance(updatedMemory.githubKey);

  return { success: true, octokit, username: githubUsername };
}

async function checkVercelDeployment(
  projectName: string,
  memory: ReliverseMemory,
): Promise<boolean> {
  try {
    return await isProjectDeployed(projectName, memory);
  } catch (error) {
    // If we can't check deployments, assume there are none
    relinka(
      "info-verbose",
      "Could not check Vercel deployments (assuming none):",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Main function to handle git initialization, GitHub repo creation, and deployment
 */
export async function promptGitDeploy({
  projectName,
  config,
  projectPath,
  primaryDomain,
  hasDbPush,
  shouldRunDbPush,
  shouldInstallDeps,
  isDev,
  memory,
  cwd,
  shouldMaskSecretInput,
}: {
  projectName: string;
  config: ReliverseConfig;
  projectPath: string;
  primaryDomain: string;
  hasDbPush: boolean;
  shouldRunDbPush: boolean;
  shouldInstallDeps: boolean;
  isDev: boolean;
  memory: ReliverseMemory;
  cwd: string;
  shouldMaskSecretInput: boolean;
}): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  let allDomains: string[] = [];
  try {
    // 1. Ask about GitHub repository first
    const shouldCreateRepo = await decide(
      config,
      "gitBehavior",
      "Do you want to create/use a GitHub repository for this project?",
      "This will allow you to:\n" +
        "- Store your code on GitHub\n" +
        "- Collaborate with others\n" +
        "- Deploy to services like Vercel\n" +
        "- Track changes with git automatically",
    );

    if (!shouldCreateRepo) {
      // If no GitHub, ask about local git
      const shouldInitGit = await decide(
        config,
        "gitBehavior",
        "Do you want to initialize git locally? (recommended)",
        "This will allow you to:\n" +
          "- Track changes in your code\n" +
          "- Create commits\n" +
          "- Work with branches",
      );

      if (!shouldInitGit) {
        relinka("info", "Skipping git initialization.");
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }

      // Only initialize git if user wants git but not GitHub
      if (!(await handleGitInit(cwd, isDev, projectName, projectPath))) {
        relinka(
          "error",
          "Failed to initialize git. You can try to initialize it manually later.",
        );
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }
      relinka("info", "Skipping GitHub repository creation.");
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // 2. Setup GitHub (this will handle git initialization if needed)
    let retryCount = 0;
    let skipGitHub = false;
    let githubData: GithubSetupResult = { success: false };

    while (retryCount < 3 && !skipGitHub) {
      try {
        githubData = await handleGithubRepo(
          cwd,
          isDev,
          memory,
          projectName,
          projectPath,
          shouldMaskSecretInput,
        );
        if (githubData.success) {
          break;
        }
        retryCount++;
        if (retryCount < 3) {
          const action = await selectPrompt({
            title: "GitHub setup failed. What would you like to do?",
            options: [
              {
                label: "Try again",
                value: "retry",
                hint: "Attempt GitHub setup again (might help if error was temporary)",
              },
              {
                label: "Continue without GitHub",
                value: "skip",
                hint: "Initialize git locally and proceed without GitHub",
              },
              {
                label: "Close the application",
                value: "close",
                hint: "Exit without completing the setup",
              },
            ],
          });

          switch (action) {
            case "retry":
              continue;
            case "skip":
              skipGitHub = true;
              // Initialize git locally if GitHub is skipped
              if (
                !(await handleGitInit(cwd, isDev, projectName, projectPath))
              ) {
                relinka(
                  "error",
                  "Failed to initialize git. You can try to initialize it manually later.",
                );
                return {
                  deployService: "none",
                  primaryDomain,
                  isDeployed: false,
                  allDomains,
                };
              }
              break;
            case "close":
              relinka("info", "Setup cancelled by user.");
              return {
                deployService: "none",
                primaryDomain,
                isDeployed: false,
                allDomains,
              };
          }
        }
      } catch (error) {
        relinka(
          "error",
          "GitHub setup failed:",
          error instanceof Error ? error.message : String(error),
        );
        retryCount++;
        if (retryCount < 3) {
          const action = await selectPrompt({
            title: "GitHub setup failed. What would you like to do?",
            options: [
              {
                label: "Try again",
                value: "retry",
                hint: "Attempt GitHub setup again (might help if error was temporary)",
              },
              {
                label: "Continue without GitHub",
                value: "skip",
                hint: "Initialize git locally and proceed without GitHub",
              },
              {
                label: "Close the application",
                value: "close",
                hint: "Exit without completing the setup",
              },
            ],
          });

          switch (action) {
            case "retry":
              continue;
            case "skip":
              skipGitHub = true;
              // Initialize git locally if GitHub is skipped
              if (
                !(await handleGitInit(cwd, isDev, projectName, projectPath))
              ) {
                relinka(
                  "error",
                  "Failed to initialize git. You can try to initialize it manually later.",
                );
                return {
                  deployService: "none",
                  primaryDomain,
                  isDeployed: false,
                  allDomains,
                };
              }
              break;
            case "close":
              relinka("info", "Setup cancelled by user.");
              return {
                deployService: "none",
                primaryDomain,
                isDeployed: false,
                allDomains,
              };
          }
        }
      }
    }

    if (retryCount === 3 && !skipGitHub) {
      const action = await selectPrompt({
        title:
          "GitHub setup failed after 3 attempts. What would you like to do?",
        options: [
          {
            label: "Continue without GitHub",
            value: "skip",
            hint: "Initialize git locally and proceed without GitHub",
          },
          {
            label: "Close the application",
            value: "close",
            hint: "Exit without completing the setup",
          },
        ],
      });

      switch (action) {
        case "skip":
          // Initialize git locally if GitHub is skipped
          if (!(await handleGitInit(cwd, isDev, projectName, projectPath))) {
            relinka(
              "error",
              "Failed to initialize git. You can try to initialize it manually later.",
            );
            return {
              deployService: "none",
              primaryDomain,
              isDeployed: false,
              allDomains,
            };
          }
          skipGitHub = true;
          break;
        case "close":
          relinka("info", "Setup cancelled by user.");
          return {
            deployService: "none",
            primaryDomain,
            isDeployed: false,
            allDomains,
          };
      }
    }

    // 3. Deployment (only if GitHub setup was successful)
    if (
      !skipGitHub &&
      githubData.success &&
      githubData.octokit &&
      githubData.username
    ) {
      try {
        // Check for Vercel deployments
        const hasVercelDeployment = await checkVercelDeployment(
          projectName,
          memory,
        );

        if (hasVercelDeployment) {
          relinka(
            "success",
            "Project already has Vercel deployments configured. New commits will trigger deployments automatically.",
          );
          return {
            deployService: "vercel",
            primaryDomain,
            isDeployed: true,
            allDomains,
          };
        }

        // Only ask about deployment if there's no existing Vercel deployment
        const shouldDeployProject = await decide(
          config,
          "deployBehavior",
          "Do you want to deploy this project?",
          "This will:\n" +
            "- Set up deployment configuration\n" +
            "- Configure environment variables\n" +
            "- Deploy to your chosen platform",
        );

        if (!shouldDeployProject) {
          relinka("info", "Skipping project deployment.");
          return {
            deployService: "none",
            primaryDomain,
            isDeployed: false,
            allDomains,
          };
        }

        // 4. Database initialization
        const dbStatus = await ensureDbInitialized(
          hasDbPush,
          shouldRunDbPush,
          shouldInstallDeps,
          projectPath,
        );

        if (dbStatus === "cancel") {
          relinka(
            "info",
            "Deployment cancelled during database initialization.",
          );
          return {
            deployService: "none",
            primaryDomain,
            isDeployed: false,
            allDomains,
          };
        }

        // 5. Project deployment
        if (!hasVercelDeployment) {
          primaryDomain = await promptForDomain(projectName);
        } else {
          const result = await getVercelProjectDomain(projectName, memory);
          primaryDomain = result.primary;
          allDomains = result.domains;
        }
        let deployRetryCount = 0;
        while (deployRetryCount < 3) {
          try {
            const deployResult = await deployProject(
              projectName,
              config,
              projectPath,
              primaryDomain,
              memory,
              shouldMaskSecretInput,
            );
            if (deployResult.deployService !== "none") {
              relinka(
                "success",
                `${skipGitHub ? "Git" : "Git, GitHub,"} and deployment completed successfully! 🎉`,
              );
              return deployResult;
            }
            deployRetryCount++;
            if (deployRetryCount < 3) {
              const shouldRetry = await decide(
                config,
                "deployBehavior",
                "Deployment failed. Would you like to retry?",
                "This might help if the error was temporary",
              );
              if (!shouldRetry) break;
            }
          } catch (error) {
            relinka(
              "error",
              "Deployment failed:",
              error instanceof Error ? error.message : String(error),
            );
            deployRetryCount++;
            if (deployRetryCount < 3) {
              const shouldRetry = await decide(
                config,
                "deployBehavior",
                "Would you like to retry deployment?",
                "This might help if the error was temporary",
              );
              if (!shouldRetry) break;
            }
          }
        }

        if (deployRetryCount === 3) {
          relinka("error", "Deployment failed after 3 attempts.");
          return {
            deployService: "none",
            primaryDomain,
            isDeployed: false,
            allDomains,
          };
        }
      } catch (error) {
        relinka(
          "error",
          "Failed to check repository deployments:",
          error instanceof Error ? error.message : String(error),
        );
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }
    } else {
      relinka(
        "success",
        "Git initialized successfully! You can set up GitHub and deployment later. 🎉",
      );
    }

    return {
      deployService: skipGitHub ? "none" : "vercel",
      primaryDomain,
      isDeployed: !skipGitHub,
      allDomains,
    };
  } catch (error) {
    if (error instanceof Error) {
      relinka("error", `Process failed: ${error.message}`);
      if (error.stack) {
        relinka("error-verbose", "Stack trace:", error.stack);
      }
    } else {
      relinka("error", "An unexpected error occurred:", String(error));
    }
    return {
      deployService: "none",
      primaryDomain,
      isDeployed: false,
      allDomains,
    };
  }
}
