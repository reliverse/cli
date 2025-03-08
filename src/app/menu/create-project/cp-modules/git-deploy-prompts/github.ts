import { RequestError } from "@octokit/request-error";
import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import type { ReliverseConfig } from "~/libs/config/config-main.js";

import { UNKNOWN_VALUE } from "~/libs/sdk/constants.js";
import { type InstanceGithub } from "~/utils/instanceGithub.js";
import { cd } from "~/utils/terminalHelpers.js";

import { initGitDir } from "./git.js";
import { setupGitRemote } from "./utils-git-github.js";

export async function checkGithubRepoOwnership(
  githubInstance: InstanceGithub,
  owner: string,
  repo: string,
): Promise<{ exists: boolean; isOwner: boolean; defaultBranch?: string }> {
  try {
    const { data: repository } = await githubInstance.rest.repos.get({
      owner,
      repo,
    });
    return {
      exists: true,
      isOwner: repository.permissions?.admin ?? false,
      defaultBranch: repository.default_branch,
    };
  } catch (error) {
    if (error instanceof RequestError) {
      if (error.status === 404) {
        return { exists: false, isOwner: false };
      }
      if (error.status === 403) {
        throw new Error("GitHub API rate limit exceeded");
      }
      if (error.status === 401) {
        throw new Error("Invalid GitHub token");
      }
    }
    throw error;
  }
}

export async function createGithubRepo(
  githubInstance: InstanceGithub,
  repoName: string,
  repoOwner: string,
  projectPath: string,
  isDev: boolean,
  cwd: string,
  config: ReliverseConfig,
  isTemplateDownload: boolean,
): Promise<boolean> {
  if (isTemplateDownload) {
    relinka(
      "info-verbose",
      "Skipping createGithubRepo since it's a template download",
    );
    return true;
  }

  try {
    // 1. Ensure we have a GitHub token

    await cd(projectPath);

    // Initialize git and create repository
    relinka("info-verbose", "[C] initGitDir");
    await initGitDir({
      cwd,
      isDev,
      projectPath,
      projectName: repoName,
      allowReInit: true,
      createCommit: true,
      config,
      isTemplateDownload,
    });

    // For new repositories, determine privacy setting
    let privacyAction = config.repoPrivacy;
    if (privacyAction === UNKNOWN_VALUE) {
      const selectedPrivacyAction = await selectPrompt({
        title: "Choose repository privacy setting",
        defaultValue: "public",
        options: [
          {
            label: "Public repository",
            value: "public",
            hint: "Anyone can see the repository (recommended for open source)",
          },
          {
            label: "Private repository",
            value: "private",
            hint: "Only you and collaborators can see the repository",
          },
        ],
      });
      privacyAction = selectedPrivacyAction;
    }

    // Create the repository
    relinka("info-verbose", "Creating repository...");

    try {
      await githubInstance.rest.repos.createForAuthenticatedUser({
        name: repoName,
        private: privacyAction === "private",
        auto_init: false,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        relinka("error", `Repository '${repoName}' already exists on GitHub`);
        return false;
      }
      throw error;
    }

    // Setup remote and push initial commit
    const remoteUrl = `https://github.com/${repoOwner}/${repoName}.git`;
    relinka(
      "info-verbose",
      "Setting up Git remote and pushing initial commit...",
    );
    return await setupGitRemote(
      cwd,
      isDev,
      repoName,
      projectPath,
      remoteUrl,
      "origin",
    );
  } catch (error: any) {
    if (error instanceof RequestError) {
      if (error.status === 401 || error.status === 403) {
        relinka(
          "error",
          "GitHub token is invalid or lacks necessary permissions. Ensure your token has the 'repo' scope.",
        );
      } else if (error.status === 422) {
        relinka(
          "error",
          "Invalid repository name or repository already exists and you don't have access to it.",
        );
      } else if (error.message?.includes("rate limit")) {
        relinka(
          "error",
          "GitHub API rate limit exceeded. Please try again later.",
        );
      } else if (error.message?.includes("network")) {
        relinka(
          "error",
          "Network error occurred. Please check your internet connection.",
        );
      } else {
        relinka("error", "GitHub operation failed:", error.message);
      }
    } else {
      // Non-Octokit errors or unexpected exceptions
      relinka(
        "error",
        "An unexpected error occurred:",
        (error as Error)?.message ?? String(error),
      );
    }
    return false;
  }
}
