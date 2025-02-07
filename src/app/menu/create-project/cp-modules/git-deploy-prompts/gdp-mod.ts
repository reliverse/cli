import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import type { DeploymentService } from "~/types.js";
import type { RepoOption } from "~/utils/projectRepository.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { deployProject } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/deploy.js";
import {
  handleGithubRepo,
  initGitDir,
} from "~/app/menu/create-project/cp-modules/git-deploy-prompts/git.js";
import { isSpecialDomain } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/helpers/domainHelpers.js";
import { ensureDbInitialized } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/helpers/handlePkgJsonScripts.js";
import { promptForDomain } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/helpers/promptForDomain.js";
import { getVercelProjectDomain } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-domain.js";
import { decide } from "~/utils/decideHelper.js";
import { initGithubSDK, type InstanceGithub } from "~/utils/instanceGithub.js";
import { initVercelSDK } from "~/utils/instanceVercel.js";
import { getReliverseMemory } from "~/utils/reliverseMemory.js";

import { checkVercelDeployment } from "./vercel/vercel-check.js";

/**
 * Result object from a GitHub setup attempt.
 */
type GithubSetupResult = {
  success: boolean;
  githubInstance?: InstanceGithub;
  username?: string;
};

/**
 * Initializes the local git repository.
 */
export async function handleGitInit(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
  config: ReliverseConfig,
  isTemplateDownload: boolean,
): Promise<boolean> {
  relinka("info-verbose", "[B] initGitDir");
  const gitInitialized = await initGitDir({
    cwd,
    isDev,
    projectName,
    projectPath,
    allowReInit: true,
    createCommit: true,
    config,
    isTemplateDownload,
  });
  if (!gitInitialized) {
    relinka("error", "Failed to initialize git. Stopping git/deploy process.");
    return false;
  }
  return true;
}

/**
 * Configures a GitHub repository:
 * - Prompts for a GitHub username if needed.
 * - Uses handleGithubRepo to create or select an existing repository.
 * - Re-reads memory for the GitHub token and initializes the Octokit instance.
 */
export async function configureGithubRepo(
  githubInstance: InstanceGithub,
  githubToken: string,
  skipPrompts: boolean,
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  config: ReliverseConfig,
  projectName: string,
  projectPath: string,
  maskInput: boolean,
  selectedTemplate: RepoOption,
  isTemplateDownload: boolean,
  githubUsername: string,
): Promise<GithubSetupResult> {
  if (!memory) {
    relinka("error", "Failed to read reliverse memory");
    return { success: false };
  }

  // Attempt to create/use the GitHub repository.
  const repoCreated = await handleGithubRepo({
    skipPrompts,
    cwd,
    isDev,
    memory,
    config,
    projectName,
    projectPath,
    maskInput,
    selectedTemplate,
    isTemplateDownload,
    githubInstance,
    githubToken,
    githubUsername,
  });
  if (!repoCreated) {
    relinka(
      "error",
      "Failed to create GitHub repository. Stopping deploy process.",
    );
    return { success: false };
  }

  // Refresh memory to retrieve updated GitHub token.
  const updatedMemory = await getReliverseMemory();
  if (!updatedMemory?.githubKey) {
    relinka("error", "GitHub token still not found after setup");
    return { success: false };
  }
  return { success: true };
}

/**
 * Orchestrates the entire deployment flow.
 * It first asks whether the user wishes to use GitHub, then:
 * - Sets up local git if needed.
 * - Configures GitHub by attempting up to 3 retries.
 * - Proceeds with Vercel deployment (including domain selection).
 */
export async function promptGitDeploy({
  projectName,
  config,
  projectPath,
  primaryDomain: initialPrimaryDomain,
  hasDbPush,
  shouldRunDbPush,
  shouldInstallDeps,
  isDev,
  memory,
  cwd,
  maskInput,
  skipPrompts,
  selectedTemplate,
  isTemplateDownload,
  frontendUsername,
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
  maskInput: boolean;
  skipPrompts: boolean;
  selectedTemplate: RepoOption;
  isTemplateDownload: boolean;
  frontendUsername: string;
}): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  let allDomains: string[] = [];
  let primaryDomain = initialPrimaryDomain;

  try {
    // -----------------------------------------------------------------
    // STEP 1: Decide whether to use GitHub repository management
    // -----------------------------------------------------------------
    const useGithubRepo = await decide(
      config,
      "gitBehavior",
      "Do you want to create/connect a GitHub repository for this project?",
      "This will allow you to store your code on GitHub, collaborate with others, deploy, and track changes automatically.",
      true,
      skipPrompts,
    );

    if (!useGithubRepo) {
      // If user declines GitHub repo creation, ask whether local git should be initialized.
      const initLocalGit = await decide(
        config,
        "gitBehavior",
        "Do you want to initialize git locally? (recommended)",
        "This allows you to track changes, create commits, and work with branches.",
        true,
        skipPrompts,
      );

      if (!initLocalGit) {
        relinka("info", "Skipping git initialization entirely.");
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }

      if (
        !(await handleGitInit(
          cwd,
          isDev,
          projectName,
          projectPath,
          config,
          isTemplateDownload,
        ))
      ) {
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

    // -----------------------------------------------------------------
    // STEP 2: Initialize GitHub SDK
    // -----------------------------------------------------------------
    const githubResult = await initGithubSDK(
      memory,
      frontendUsername,
      maskInput,
    );
    if (!githubResult) {
      throw new Error(
        "Failed to initialize Octokit SDK. Please notify CLI developers if the problem persists.",
      );
    }
    const [githubToken, githubInstance, githubUsername] = githubResult;

    // -----------------------------------------------------------------
    // STEP 3: GitHub Setup with Retry Logic
    // -----------------------------------------------------------------
    let githubRetryCount = 0;
    let skipGithub = false;
    let githubData: GithubSetupResult = { success: false };

    while (githubRetryCount < 3 && !skipGithub) {
      try {
        githubData = await configureGithubRepo(
          githubInstance,
          githubToken,
          skipPrompts,
          cwd,
          isDev,
          memory,
          config,
          projectName,
          projectPath,
          maskInput,
          selectedTemplate,
          isTemplateDownload,
          githubUsername,
        );
        if (githubData.success) break;
        githubRetryCount++;
      } catch (error) {
        githubRetryCount++;
        relinka(
          "error",
          "GitHub setup encountered an error:",
          error instanceof Error ? error.message : String(error),
        );
      }
      if (githubRetryCount < 3 && !skipPrompts) {
        const userAction = await selectPrompt({
          title: "GitHub setup failed. What would you like to do?",
          options: [
            {
              label: "Try again",
              value: "retry",
              hint: "Attempt GitHub setup again",
            },
            {
              label: "Continue without GitHub",
              value: "skip",
              hint: "Proceed without GitHub",
            },
            {
              label: "Close the application",
              value: "close",
              hint: "Exit setup",
            },
          ],
        });
        if (userAction === "retry") continue;
        else if (userAction === "skip") {
          skipGithub = true;
          if (
            !(await handleGitInit(
              cwd,
              isDev,
              projectName,
              projectPath,
              config,
              false,
            ))
          ) {
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
    if (githubRetryCount === 3 && !skipGithub && !skipPrompts) {
      const userAction = await selectPrompt({
        title: "GitHub setup failed after 3 attempts. What do you want to do?",
        options: [
          {
            label: "Continue without GitHub",
            value: "skip",
            hint: "Proceed using local git",
          },
          {
            label: "Close the application",
            value: "close",
            hint: "Exit setup",
          },
        ],
      });
      if (userAction === "skip") {
        if (
          !(await handleGitInit(
            cwd,
            isDev,
            projectName,
            projectPath,
            config,
            false,
          ))
        ) {
          relinka("error", "Failed to initialize local git after final skip.");
          return {
            deployService: "none",
            primaryDomain,
            isDeployed: false,
            allDomains,
          };
        }
        skipGithub = true;
      } else {
        relinka("info", "Setup cancelled by user.");
        return {
          deployService: "none",
          primaryDomain,
          isDeployed: false,
          allDomains,
        };
      }
    }

    if (skipGithub) {
      relinka(
        "success",
        "Git initialized locally! GitHub & deployments can be set up later by running the CLI inside your project folder.",
      );
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // TODO: Ensure GitHub setup succeeded.
    if (!githubData.success) {
      relinka(
        "error",
        "GitHub setup did not complete successfully after multiple attempts.",
      );
      return {
        deployService: "none",
        primaryDomain,
        isDeployed: false,
        allDomains,
      };
    }

    // -----------------------------------------------------------------
    // STEP 4: Deployment to Vercel (if GitHub was successful)
    // -----------------------------------------------------------------
    let alreadyDeployed = false;
    try {
      alreadyDeployed = await checkVercelDeployment(
        projectName,
        githubUsername,
        githubToken,
        githubInstance,
      );
    } catch (vercelError) {
      relinka(
        "warn",
        "Could not check existing Vercel deployments. Assuming none:",
        vercelError instanceof Error
          ? vercelError.message
          : String(vercelError),
      );
    }
    // If already deployed on Vercel, show the current status.
    if (alreadyDeployed) {
      relinka(
        "success",
        "Project already has Vercel deployments configured on GitHub.",
        "New deployments are triggered automatically on new commits.",
      );
      return {
        deployService: "vercel",
        primaryDomain,
        isDeployed: true,
        allDomains,
      };
    }

    // Ask if the user wants to deploy the project
    const shouldDeployProject = await decide(
      config,
      "deployBehavior",
      "Do you want to deploy this project?",
      "This will set up deployment configuration, environment variables, and deploy to your chosen platform.",
      true,
      skipPrompts,
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

    // Ensure DB is initialized. If user cancels, abort deployment.
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

    // Initialize Vercel SDK.
    const vercelResult = await initVercelSDK(memory, maskInput);
    if (!vercelResult) {
      throw new Error(
        "Failed to initialize Vercel SDK. Please notify CLI developers if the problem persists.",
      );
    }
    const [vercelToken, vercelInstance] = vercelResult;

    // Determine project domain:
    if (!alreadyDeployed) {
      if (skipPrompts && !isSpecialDomain(config.projectDomain)) {
        primaryDomain = config.projectDomain.replace(/^https?:\/\//, "");
      } else {
        primaryDomain = await promptForDomain(projectName);
      }
    } else {
      const domainResult = await getVercelProjectDomain(
        vercelInstance,
        vercelToken,
        projectName,
      );
      primaryDomain = domainResult.primary;
      allDomains = domainResult.domains;
    }

    // Double-check that the project is not already deployed.
    const deploymentCheck = await checkVercelDeployment(
      projectName,
      githubUsername,
      githubToken,
      githubInstance,
    );
    if (deploymentCheck) {
      relinka("info", `Project ${projectName} is already deployed to Vercel`);
      return {
        deployService: "vercel",
        primaryDomain,
        isDeployed: true,
        allDomains: [primaryDomain],
      };
    }

    // -----------------------------------------------------------------
    // STEP 5: Deploy project to Vercel with retry logic
    // -----------------------------------------------------------------
    let deployRetryCount = 0;
    while (deployRetryCount < 3) {
      try {
        const deployResult = await deployProject(
          githubInstance,
          vercelInstance,
          vercelToken,
          githubToken,
          skipPrompts,
          projectName,
          config,
          projectPath,
          primaryDomain,
          memory,
          "new",
          githubUsername,
        );
        if (deployResult.deployService !== "none") {
          relinka(
            "success",
            "Git, GitHub, and deployment completed successfully! 🎉",
          );
          return deployResult;
        }
        deployRetryCount++;
        if (deployRetryCount < 3 && !skipPrompts) {
          const retryChoice = await decide(
            config,
            "deployBehavior",
            "Deployment failed. Retry?",
            "This may help if the error was temporary.",
            true,
            skipPrompts,
          );
          if (!retryChoice) break;
        } else {
          break;
        }
      } catch (error) {
        deployRetryCount++;
        relinka(
          "error",
          "Deployment failed:",
          error instanceof Error ? error.message : String(error),
        );
        if (deployRetryCount < 3 && !skipPrompts) {
          const retryChoice = await decide(
            config,
            "deployBehavior",
            "Retry deployment?",
            "This may help if the error was temporary.",
            true,
            skipPrompts,
          );
          if (!retryChoice) break;
        } else {
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
  } catch (globalError) {
    if (globalError instanceof Error) {
      relinka("error", `Process failed: ${globalError.message}`);
      if (globalError.stack) {
        relinka("error-verbose", "Stack trace:", globalError.stack);
      }
    } else {
      relinka("error", "An unexpected error occurred:", String(globalError));
    }
    return {
      deployService: "none",
      primaryDomain,
      isDeployed: false,
      allDomains,
    };
  }
}
