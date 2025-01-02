import { confirmPrompt } from "@reliverse/prompts";

import type { DeploymentService, ReliverseConfig } from "~/types.js";

import { relinka } from "~/utils/console.js";

import { deployProject } from "./deploy.js";
import { createGithubRepository, initGit } from "./git.js";

type DecisionKey = "gitBehavior" | "deployBehavior";

/**
 * Makes a decision based on config or user prompt
 * @param config - Reliverse configuration
 * @param behaviorKey - Which behavior to check
 * @param title - Prompt title for user
 * @param defaultValue - Default value if prompting
 */
export async function decide(
  config: ReliverseConfig,
  behaviorKey: DecisionKey,
  title: string,
  content?: string,
  defaultValue = true,
): Promise<boolean> {
  try {
    const behavior = config?.experimental?.[behaviorKey] ?? "prompt";

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
export async function handleGitInit(targetDir: string): Promise<boolean> {
  const gitInitialized = await initGit(targetDir);
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
  projectName: string,
  targetDir: string,
): Promise<boolean> {
  const repoCreated = await createGithubRepository(projectName, targetDir);
  if (!repoCreated) {
    relinka(
      "error",
      "Failed to create GitHub repository. Stopping deploy process.",
    );
    return false;
  }
  return true;
}

/**
 * Main function to handle git initialization, GitHub repo creation, and deployment
 */
export async function promptGitDeploy(
  projectName: string,
  config: ReliverseConfig,
  targetDir: string,
): Promise<DeploymentService | "none"> {
  try {
    // 1. Git initialization
    const shouldInitGit = await decide(
      config,
      "gitBehavior",
      "Do you want to initialize git in your project?",
      "This will allow you to push your project to e.g. GitHub and deploy it to e.g. Vercel",
    );

    if (!shouldInitGit) {
      relinka("info", "Skipping git initialization.");
      return "none";
    }

    if (!(await handleGitInit(targetDir))) return "none";

    // 2. GitHub repository
    const shouldCreateRepo = await decide(
      config,
      "gitBehavior",
      "Do you want to create a GitHub repository and push your code?",
    );

    if (!shouldCreateRepo) {
      relinka("info", "Skipping GitHub repository creation.");
      return "none";
    }

    if (!(await handleGithubRepo(projectName, targetDir))) return "none";

    // 3. Deployment
    const shouldDeployProject = await decide(
      config,
      "deployBehavior",
      "Do you want to deploy this project?",
    );

    if (!shouldDeployProject) {
      relinka("info", "Skipping project deployment.");
      return "none";
    }

    if ((await deployProject(projectName, config, targetDir)) === "none")
      return "none";

    relinka(
      "success",
      "Git initialization, GitHub setup, and deployment completed successfully! 🎉",
    );

    return "vercel";
  } catch (error) {
    if (error instanceof Error) {
      relinka("error", `Deployment process failed: ${error.message}`);
      if (error.stack) {
        relinka("error-verbose", "Stack trace:", error.stack);
      }
    } else {
      relinka("error", "An unexpected error occurred:", String(error));
    }
  }

  return "vercel";
}
