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

/**
 * A string literal union for either 'gitBehavior' or 'deployBehavior'
 */
type DecisionKey = "gitBehavior" | "deployBehavior";

/**
 * Collects details from a GitHub setup attempt.
 */
type GithubSetupResult = {
  success: boolean;
  octokit?: InstanceType<typeof Octokit>;
  username?: string;
};

/**
 * This function handles the final "yes/no" decision, taking into account:
 * - The config's behavior key (autoYes, autoNo, prompt)
 * - Whether skipPrompts is true
 */
export async function decide(
  config: ReliverseConfig,
  behaviorKey: DecisionKey,
  title: string,
  content: string | undefined,
  defaultValue: boolean,
  skipPrompts: boolean,
): Promise<boolean> {
  try {
    let behavior = config?.[behaviorKey] ?? "prompt";

    // If skipPrompts is true AND the config is set to "prompt",
    // we override that behavior to "autoYes" so no user input is needed.
    if (skipPrompts && behavior === "prompt") {
      behavior = "autoYes";
    }

    switch (behavior) {
      case "autoYes":
        relinka("info-verbose", `Auto-answering YES to: "${title}"`);
        return true;
      case "autoNo":
        relinka("info-verbose", `Auto-answering NO to: "${title}"`);
        return false;
      // default is "prompt":
      default:
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
 * Initializes a local Git repository.
 */
export async function handleGitInit(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
): Promise<boolean> {
  const gitInitialized = await initGit(cwd, isDev, projectName, projectPath);
  if (!gitInitialized) {
    relinka("error", "Failed to initialize git. Stopping git/deploy process.");
    return false;
  }
  return true;
}

/**
 * Creates or configures a GitHub repo (plus local git) if needed.
 */
export async function handleGithubRepo(
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  projectName: string,
  projectPath: string,
  shouldMaskSecretInput: boolean,
): Promise<GithubSetupResult> {
  if (!memory) {
    relinka("error", "Failed to read reliverse memory");
    return { success: false };
  }

  const githubUsername = await askGithubName(memory);
  if (!githubUsername) {
    relinka("error", "Could not determine GitHub username");
    return { success: false };
  }

  // Even if token is not found, we proceed. createGithubRepo() will prompt for a token if needed.
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

  // Read memory again to get the new GitHub token
  const updatedMemory = await handleReliverseMemory();

  if (!updatedMemory?.githubKey) {
    relinka("error", "GitHub token still not found after setup");
    return { success: false };
  }

  const octokit = createOctokitInstance(updatedMemory.githubKey);

  return { success: true, octokit, username: githubUsername };
}

/**
 * Checks whether there's an existing Vercel deployment for a project.
 */
async function checkVercelDeployment(
  projectName: string,
  memory: ReliverseMemory,
): Promise<boolean> {
  try {
    return await isProjectDeployed(projectName, memory);
  } catch (error) {
    // If we can't check deployments, assume none exist
    relinka(
      "info-verbose",
      "Could not check Vercel deployments (assuming none):",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Orchestrates the entire flow for initializing git, creating a GitHub repo, and deploying.
 *
 * - If `skipPrompts === true`, we won't prompt for user confirmations (i.e., treat "prompt" as "autoYes").
 * - If `isMultiConfig === true`, we also assume a fully automated flow (so we basically do the same as skipPrompts).
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
  skipPrompts,
  isMultiConfig,
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
  skipPrompts: boolean;
  isMultiConfig: boolean;
}): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  let allDomains: string[] = [];

  try {
    // If isMultiConfig, also force skipPrompts to true
    const finalSkipPrompts = skipPrompts || isMultiConfig;

    // -------------------------------------------------
    // 1) Ask user about creating/using a GitHub repo
    //    (or skip if finalSkipPrompts => autoYes)
    // -------------------------------------------------
    const shouldCreateRepo = await decide(
      config,
      "gitBehavior",
      "Do you want to create/use a GitHub repository for this project?",
      "This will allow you to:\n" +
        "- Store your code on GitHub\n" +
        "- Collaborate with others\n" +
        "- Deploy to services like Vercel\n" +
        "- Track changes with git automatically",
      true,
      finalSkipPrompts,
    );

    if (!shouldCreateRepo) {
      // If user doesn't want a GitHub repo, ask if they still want local git
      const shouldInitGitLocally = await decide(
        config,
        "gitBehavior",
        "Do you want to initialize git locally? (recommended)",
        "This allows you to track changes, create commits, and work with branches.",
        true,
        finalSkipPrompts,
      );

      if (!shouldInitGitLocally) {
        relinka("info", "Skipping git initialization entirely.");
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }

      // If user wants local git
      if (!(await handleGitInit(cwd, isDev, projectName, projectPath))) {
        relinka("error", "Failed to initialize git locally.");
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }

      relinka("info", "Skipping GitHub repository creation step.");
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // -------------------------------------------------
    // 2) GitHub setup (will handle git init if needed)
    // -------------------------------------------------
    let githubRetryCount = 0;
    let skipGitHub = false;
    let githubData: GithubSetupResult = { success: false };

    // Attempt up to 3 times
    while (githubRetryCount < 3 && !skipGitHub) {
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
          break; // success => break out of loop
        }

        githubRetryCount++;
        if (githubRetryCount < 3 && !finalSkipPrompts) {
          // Only show this "retry/skip/close" prompt if we're NOT skipping prompts
          const userAction = await selectPrompt({
            title: "GitHub setup failed. What would you like to do?",
            options: [
              {
                label: "Try again",
                value: "retry",
                hint: "Attempt GitHub setup again (if error was temporary)",
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

          if (userAction === "retry") {
            continue; // loop again
          } else if (userAction === "skip") {
            skipGitHub = true;
            // If skipping GitHub, initialize local git
            if (!(await handleGitInit(cwd, isDev, projectName, projectPath))) {
              relinka(
                "error",
                "Failed to initialize local git after skipping GitHub.",
              );
              return {
                deployService: "none",
                primaryDomain,
                isDeployed: false,
                allDomains,
              };
            }
          } else {
            // "close"
            relinka("info", "Setup cancelled by user.");
            return {
              deployService: "none",
              primaryDomain,
              isDeployed: false,
              allDomains,
            };
          }
        } else if (finalSkipPrompts) {
          // If we're skipping prompts, break after first failure
          break;
        }
      } catch (error) {
        relinka(
          "error",
          "GitHub setup encountered an error:",
          error instanceof Error ? error.message : String(error),
        );
        githubRetryCount++;
        if (githubRetryCount < 3 && !finalSkipPrompts) {
          // Show "retry/skip/close" if not skipping
          const userAction = await selectPrompt({
            title: "GitHub setup failed. How do you want to proceed?",
            options: [
              {
                label: "Try again",
                value: "retry",
                hint: "Attempt GitHub setup again",
              },
              {
                label: "Continue without GitHub",
                value: "skip",
                hint: "Initialize git locally and proceed",
              },
              {
                label: "Close the application",
                value: "close",
                hint: "Exit entirely",
              },
            ],
          });

          if (userAction === "retry") {
            continue; // loop again
          } else if (userAction === "skip") {
            skipGitHub = true;
            if (!(await handleGitInit(cwd, isDev, projectName, projectPath))) {
              relinka(
                "error",
                "Failed to initialize local git after skipping GitHub.",
              );
              return {
                deployService: "none",
                primaryDomain,
                isDeployed: false,
                allDomains,
              };
            }
          } else {
            // "close"
            relinka("info", "Setup cancelled by user.");
            return {
              deployService: "none",
              primaryDomain,
              isDeployed: false,
              allDomains,
            };
          }
        } else if (finalSkipPrompts) {
          // If skipping prompts, just break out
          break;
        }
      }
    }

    if (githubRetryCount === 3 && !skipGitHub && !finalSkipPrompts) {
      // If user used all attempts and we are not skipping prompts
      const userAction = await selectPrompt({
        title: "GitHub setup failed after 3 attempts. Next steps?",
        options: [
          {
            label: "Continue without GitHub",
            value: "skip",
            hint: "Initialize git locally and proceed without GitHub",
          },
          {
            label: "Close the application",
            value: "close",
            hint: "Exit the setup",
          },
        ],
      });

      if (userAction === "skip") {
        if (!(await handleGitInit(cwd, isDev, projectName, projectPath))) {
          relinka("error", "Failed to initialize local git after final skip.");
          return {
            deployService: "none",
            primaryDomain,
            isDeployed: false,
            allDomains,
          };
        }
        skipGitHub = true;
      } else {
        // "close"
        relinka("info", "Setup cancelled by user.");
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }
    }

    // If we skip GitHub entirely
    if (skipGitHub) {
      relinka(
        "success",
        "Git initialized locally! You can set up GitHub & deployment later. 🎉",
      );
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // If we get here, GitHub is set up
    if (!githubData.success || !githubData.octokit || !githubData.username) {
      relinka(
        "error",
        "GitHub setup did not complete successfully despite multiple attempts.",
      );
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // -------------------------------------------------
    // 3) Deployment (only if GitHub was successful)
    // -------------------------------------------------
    let alreadyDeployed = false;
    try {
      // Check if there's an existing Vercel deployment
      alreadyDeployed = await checkVercelDeployment(projectName, memory);
    } catch (vercelError) {
      // If we can't check, we assume false
      relinka(
        "warn",
        "Could not check existing Vercel deployments. Assuming none:",
        vercelError instanceof Error
          ? vercelError.message
          : String(vercelError),
      );
    }

    if (alreadyDeployed) {
      relinka(
        "success",
        "Project already has Vercel deployments configured. New commits auto-deploy!",
      );
      return {
        deployService: "vercel",
        primaryDomain,
        isDeployed: true,
        allDomains,
      };
    }

    // If no existing deployment, ask if we want to deploy
    const shouldDeployProject = await decide(
      config,
      "deployBehavior",
      "Do you want to deploy this project?",
      "This will:\n- Set up deployment configuration\n- Configure environment variables\n- Deploy to your chosen platform",
      true,
      finalSkipPrompts,
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

    // 4) Ensure DB is initialized (if requested)
    const dbStatus = await ensureDbInitialized(
      hasDbPush,
      shouldRunDbPush,
      shouldInstallDeps,
      projectPath,
    );
    if (dbStatus === "cancel") {
      relinka("info", "Deployment cancelled during database initialization.");
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // 5) Proceed with deployment
    // If not previously deployed, prompt user for domain
    if (!alreadyDeployed) {
      // If skipPrompts => supply a default domain or read from config
      if (finalSkipPrompts && config.projectDomain) {
        primaryDomain = config.projectDomain.replace(/^https?:\/\//, "");
      } else {
        primaryDomain = await promptForDomain(projectName);
      }
    } else {
      // (already deployed => fetch domain from vercel)
      const domainResult = await getVercelProjectDomain(projectName, memory);
      primaryDomain = domainResult.primary;
      allDomains = domainResult.domains;
    }

    // Attempt deployment up to 3 times
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
            "Git, GitHub, and deployment completed successfully! 🎉",
          );
          return deployResult;
        }
        deployRetryCount++;
        if (deployRetryCount < 3 && !finalSkipPrompts) {
          const shouldRetryDeploy = await decide(
            config,
            "deployBehavior",
            "Deployment failed. Retry?",
            "Might help if the error was temporary",
            true,
            finalSkipPrompts,
          );
          if (!shouldRetryDeploy) break;
        } else {
          // skipPrompts => no user prompt => break
          break;
        }
      } catch (error) {
        relinka(
          "error",
          "Deployment failed:",
          error instanceof Error ? error.message : String(error),
        );
        deployRetryCount++;
        if (deployRetryCount < 3 && !finalSkipPrompts) {
          const shouldRetryDeploy = await decide(
            config,
            "deployBehavior",
            "Retry deployment?",
            "Might help if the error was temporary",
            true,
            finalSkipPrompts,
          );
          if (!shouldRetryDeploy) break;
        } else {
          // skipPrompts => no user prompt => break
          break;
        }
      }
    }

    if (deployRetryCount === 3) {
      relinka("error", "Deployment failed after 3 attempts.");
    }
    return {
      deployService: "none",
      primaryDomain,
      isDeployed: false,
      allDomains,
    };
  } catch (error) {
    // Global catch-all for unexpected errors
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
