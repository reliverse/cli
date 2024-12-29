import { confirmPrompt, inputPrompt } from "@reliverse/prompts";
import { Octokit } from "octokit";

import type { ReliverseMemory } from "~/types.js";

import { updateReliverseMemory } from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

import { setupGitRemote } from "./git.js";

async function ensureGithubToken(memory: ReliverseMemory): Promise<string> {
  if (memory.githubKey) {
    return memory.githubKey;
  }

  const token = await inputPrompt({
    title: "Please enter your GitHub personal access token:",
    content:
      "Create one at https://github.com/settings/tokens/new \n" +
      "Set the `repo` scope and click `Generate token`",
    validate: (value: string): string | boolean => {
      if (!value?.trim()) {
        return "Token is required";
      }
      return true;
    },
  });

  await updateReliverseMemory({ githubKey: token });
  return token;
}

async function checkRepoExists(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<boolean> {
  try {
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch (error: any) {
    if (error?.status === 404) {
      return false;
    }
    throw error;
  }
}

async function getAvailableRepoName(
  octokit: Octokit,
  owner: string,
  initialName: string,
): Promise<string> {
  let repoName = initialName;
  let exists = await checkRepoExists(octokit, owner, repoName);

  while (exists) {
    repoName = await inputPrompt({
      title: `Repository "${repoName}" already exists. Please enter a different name:`,
      defaultValue: repoName,
      validate: async (value: string): Promise<string | boolean> => {
        if (!value?.trim()) {
          return "Repository name is required";
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          return "Repository name can only contain letters, numbers, dots, hyphens, and underscores";
        }
        const exists = await checkRepoExists(octokit, owner, value);
        if (exists) {
          return `Repository "${value}" already exists. Please choose a different name`;
        }
        return true;
      },
    });
    exists = await checkRepoExists(octokit, owner, repoName);
  }

  return repoName;
}

export async function createGithubRepo(
  memory: ReliverseMemory,
  repoName: string,
  repoOwner: string,
  targetDir: string,
): Promise<boolean> {
  try {
    // 1. Ensure we have a GitHub token
    const githubKey = await ensureGithubToken(memory);
    const octokit = new Octokit({ auth: githubKey });

    // 2. Get an available repository name
    repoName = await getAvailableRepoName(octokit, repoOwner, repoName);

    // 3. Create the repository
    const isPrivate = await confirmPrompt({
      title: "Do you want repo to be private?",
      defaultValue: false,
    });

    await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: `Created with @reliverse/cli - ${new Date().toISOString()}`,
      private: isPrivate,
      auto_init: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
    });
    relinka(
      "success",
      `Repository ${repoOwner}/${repoName} created successfully!`,
    );

    // 4. Setup remote and push initial commit
    const remoteUrl = `https://github.com/${repoOwner}/${repoName}.git`;
    return await setupGitRemote(targetDir, remoteUrl);
  } catch (error: any) {
    relinka(
      "error",
      "GitHub operation failed:",
      (error as Error)?.message ?? String(error),
    );
    return false;
  }
}
