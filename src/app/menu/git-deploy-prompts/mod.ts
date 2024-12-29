import { confirmPrompt } from "@reliverse/prompts";

import type { Behavior, ReliverseConfig } from "~/types.js";

import { relinka } from "~/utils/console.js";

import { deployProject } from "./helpers/deploy.js";
import { createRepo, initGit } from "./helpers/git.js";

async function decide(
  config: ReliverseConfig,
  behaviorKey: keyof NonNullable<ReliverseConfig["experimental"]>,
  title: string,
  defaultValue = true,
): Promise<boolean> {
  const behavior = (config?.experimental?.[behaviorKey] ??
    "prompt") as Behavior;
  switch (behavior) {
    case "autoYes":
      relinka("info-verbose", `Auto-answering YES to: ${title}`);
      return true;
    case "autoNo":
      relinka("info-verbose", `Auto-answering NO to: ${title}`);
      return false;
    default:
      return await confirmPrompt({ title, defaultValue });
  }
}

export async function promptGitDeploy(
  projectName: string,
  config: ReliverseConfig,
  targetDir: string,
): Promise<void> {
  try {
    // 1. First ask about git initialization
    const shouldInitGit = await decide(
      config,
      "gitBehavior",
      "Do you want to initialize git?",
    );

    if (!shouldInitGit) {
      relinka("info", "Skipping git initialization.");
      return;
    }

    // Initialize git locally without remote
    const gitInitialized = await initGit(targetDir);
    if (!gitInitialized) {
      relinka(
        "error",
        "Failed to initialize git. Stopping git and deploy process.",
      );
      return;
    }

    // 2. Then ask about GitHub repository
    const shouldCreateRepo = await decide(
      config,
      "gitBehavior",
      "Do you want to create a GitHub repository and push the initial commit?",
    );

    if (!shouldCreateRepo) {
      relinka("info", "Skipping GitHub repository creation.");
      return;
    }

    const repoCreated = await createRepo(projectName, targetDir, config);
    if (!repoCreated) {
      relinka(
        "error",
        "Failed to create GitHub repository. Stopping deploy process.",
      );
      return;
    }

    // 3. Finally ask about deployment
    const shouldDeployProject = await decide(
      config,
      "deployBehavior",
      "Do you want to deploy this project to Vercel?",
    );

    if (!shouldDeployProject) {
      relinka("info", "Skipping project deployment.");
      return;
    }

    const deployed = await deployProject(projectName, config, targetDir);

    if (!deployed) {
      relinka("error", "Failed to deploy project.");
      return;
    }

    relinka(
      "success",
      "Git initialization, GitHub setup, and deployment completed successfully!",
    );
  } catch (error) {
    relinka(
      "error",
      "An unexpected error occurred:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
