import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";
import { inputPrompt, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { ReliverseMemory } from "~/types.js";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { cd } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { updateReliverseMemory } from "~/args/memory/impl.js";

import { setupGitRemote } from "./git.js";

const userAgent = "reliverse-cli/1.4.15";

export async function ensureGithubToken(
  memory: ReliverseMemory,
): Promise<string> {
  if (memory.githubKey) {
    // Validate existing token
    try {
      // Providing a custom userAgent to help identify requests on GitHub’s side
      const octokit = new Octokit({
        auth: memory.githubKey,
        userAgent,
      });

      await octokit.rest.users.getAuthenticated();
      return memory.githubKey;
    } catch (_error) {
      relinka(
        "warn",
        "Existing GitHub token is invalid. Please provide a new one.",
      );
    }
  }

  const token = await inputPrompt({
    title:
      "Please enter your GitHub personal access token.\n(It will be securely stored on your machine):",
    content:
      "Create one at https://github.com/settings/tokens/new \n" +
      "Set the `repo` scope and click `Generate token`",
    validate: async (value: string): Promise<string | boolean> => {
      if (!value?.trim()) {
        return "Token is required";
      }
      try {
        const octokit = new Octokit({
          auth: value,
          userAgent,
        });
        await octokit.rest.users.getAuthenticated();
        return true;
      } catch (_error) {
        return "Invalid token. Please ensure it has the correct permissions.";
      }
    },
  });

  await updateReliverseMemory({ githubKey: token });
  return token;
}

export async function checkRepoExists(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<{ exists: boolean; isOwner: boolean; defaultBranch?: string }> {
  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    // Check if the authenticated user is the owner
    const isOwner = response.data.permissions?.admin === true;
    return {
      exists: true,
      isOwner,
      defaultBranch: response.data.default_branch,
    };
  } catch (error: any) {
    // Handle Octokit errors
    if (error instanceof RequestError) {
      if (error.status === 404) {
        relinka(
          "info-verbose",
          `Repository ${owner}/${repo} does not exist yet (404 is expected here).`,
        );
        return { exists: false, isOwner: false };
      }
      if (error.status === 403) {
        relinka("error", "Rate limit exceeded. Please try again later.");
        throw new Error("GitHub API rate limit exceeded");
      }
      if (error.status === 401) {
        relinka("error", "GitHub token is invalid or expired.");
        throw new Error("Invalid GitHub token");
      }
      // Log other possible request errors
      relinka(
        "error-verbose",
        `Error checking repository existence: ${error.message}`,
      );
      throw error;
    }

    // If it’s not a RequestError, rethrow
    throw error;
  }
}

export async function getAvailableRepoName(
  octokit: Octokit,
  owner: string,
  initialName: string,
): Promise<{
  name: string;
  exists: boolean;
  defaultBranch: string | undefined;
}> {
  let repoName = initialName;
  let repoStatus = await checkRepoExists(octokit, owner, repoName);

  while (repoStatus.exists) {
    if (repoStatus.isOwner) {
      const action = await selectPrompt({
        title: `Repository "${owner}/${repoName}" already exists`,
        options: [
          {
            label: "Use existing repository",
            value: "use",
            hint: "Continue working with your existing repository",
          },
          {
            label: "Create with different name",
            value: "new",
            hint: "Enter a new name for the repository",
          },
          {
            label: "Close the application",
            value: "close",
            hint: "Exit without completing the setup",
          },
        ],
      });

      switch (action) {
        case "use":
          return {
            name: repoName,
            exists: true,
            defaultBranch: repoStatus.defaultBranch,
          };
        case "close":
          relinka("info", "Setup cancelled by user.");
          process.exit(0);
      }
    }

    repoName = await inputPrompt({
      title: `Repository "${repoName}" ${
        repoStatus.isOwner ? "exists (owned by you)" : "already exists"
      }. Please enter a different name:`,
      defaultValue: repoName,
      validate: async (value: string): Promise<string | boolean> => {
        if (!value?.trim()) {
          return "Repository name is required";
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          return "Repository name can only contain letters, numbers, dots, hyphens, and underscores";
        }
        const status = await checkRepoExists(octokit, owner, value);
        if (status.exists && !status.isOwner) {
          return `Repository "${value}" already exists. Please choose a different name`;
        }
        return true;
      },
    });
    repoStatus = await checkRepoExists(octokit, owner, repoName);
  }

  return { name: repoName, exists: false, defaultBranch: undefined };
}

export async function createGithubRepo(
  memory: ReliverseMemory,
  repoName: string,
  repoOwner: string,
  targetDir: string,
  isDev: boolean,
): Promise<boolean> {
  try {
    // 1. Ensure we have a GitHub token
    const githubKey = await ensureGithubToken(memory);
    const octokit = new Octokit({
      auth: githubKey,
      userAgent,
      throttle: {
        onRateLimit: (
          _retryAfter: number,
          options: {
            method: string;
            url: string;
            request: { retryCount: number };
          },
          octokit: InstanceType<typeof Octokit>,
        ) => {
          octokit.log.warn(
            `Request quota exhausted for ${options.method} ${options.url}`,
          );
          return options.request.retryCount === 0; // retry once
        },
        onSecondaryRateLimit: (
          _retryAfter: number,
          options: {
            method: string;
            url: string;
            request: { retryCount: number };
          },
          octokit: InstanceType<typeof Octokit>,
        ) => {
          octokit.log.warn(
            `Secondary rate limit for ${options.method} ${options.url}`,
          );
          return options.request.retryCount === 0; // retry once
        },
      },
    });

    await cd(targetDir);

    // 2. Get an available repository name and check its status
    relinka("info", "Checking repository status...");
    const { name: finalRepoName, exists: repoExists } =
      await getAvailableRepoName(octokit, repoOwner, repoName);
    repoName = finalRepoName;

    let isPrivate = false;

    if (repoExists) {
      // Get existing repo's privacy setting
      const { data: repo } = await octokit.rest.repos.get({
        owner: repoOwner,
        repo: repoName,
      });
      isPrivate = repo.private;
      relinka("info", `Using existing repository ${repoOwner}/${repoName}`);

      try {
        // Remove existing .git directory if it exists
        const gitDir = path.join(targetDir, ".git");
        if (await fs.pathExists(gitDir)) {
          await fs.remove(gitDir);
          relinka("info", "Removed template's .git directory");
        }

        // Initialize git and set up remote
        const git = simpleGit(targetDir);
        await git.init();

        // Use authenticated URL with token as username
        const repoUrl = `https://${memory.githubKey}:x-oauth-basic@github.com/${repoOwner}/${repoName}.git`;
        await git.addRemote("origin", repoUrl);

        // Add all files to git to prevent checkout conflicts
        await git.add(".");
        await git.commit("Initial commit before fetching repository");

        // Fetch the repository
        await git.fetch(["origin", "HEAD"]);

        // Force checkout to handle any conflicts
        await git.raw(["checkout", "FETCH_HEAD", "-f"]);

        relinka("success", "Retrieved repository git data");
        return true;
      } catch (error) {
        relinka(
          "error",
          "Failed to set up existing repository:",
          error instanceof Error ? error.message : String(error),
        );
        return false;
      }
    } else {
      // New repository
      const privacyAction = await selectPrompt({
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
      isPrivate = privacyAction === "public";

      // Create the repository
      relinka("info", `Creating repository ${repoOwner}/${repoName}...`);
      try {
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
      } catch (error: any) {
        if (error instanceof RequestError) {
          if (error.status === 422 && error.message?.includes("exists")) {
            relinka(
              "error",
              `Repository ${repoOwner}/${repoName} was just created by someone else. Please try again with a different name.`,
            );
            return false;
          }
          if (error.status === 403) {
            relinka("error", "Rate limit exceeded. Please try again later.");
            return false;
          }
        }
        // If not specifically handled above, rethrow
        throw error;
      }
    }

    // 4. Setup remote and push initial commit
    const remoteUrl = `https://github.com/${repoOwner}/${repoName}.git`;
    relinka("info", "Setting up Git remote and pushing initial commit...");
    return await setupGitRemote(
      isDev,
      repoName,
      targetDir,
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

/**
 * Creates a new commit using GitHub's API
 */
export async function createGithubCommit({
  octokit,
  owner,
  repo,
  message,
  files,
  branch = "main",
}: {
  octokit: Octokit;
  owner: string;
  repo: string;
  message: string;
  files: { path: string; content: string }[];
  branch?: string;
}): Promise<boolean> {
  try {
    // Get the current branch ref
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    // Get the current commit SHA
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: ref.object.sha,
    });

    // Create a tree with all the changes
    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: commit.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content,
      })),
    });

    // Create a new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [commit.sha],
    });

    // Update the reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return true;
  } catch (error) {
    if (error instanceof RequestError) {
      if (error.status === 404) {
        relinka(
          "error",
          `Repository or branch not found: ${owner}/${repo}:${branch}`,
        );
      } else if (error.status === 403) {
        relinka("error", "Permission denied. Check your token's permissions.");
      } else {
        relinka("error", `Failed to create commit: ${error.message}`);
      }
    } else {
      relinka(
        "error",
        "Unexpected error creating commit:",
        error instanceof Error ? error.message : String(error),
      );
    }
    return false;
  }
}

/**
 * Creates a new commit with all local changes
 */
export async function commitLocalChanges({
  octokit,
  owner,
  repo,
  directory,
  changedFiles,
  message = "Update by @reliverse/cli",
  branch = "main",
}: {
  octokit: InstanceType<typeof Octokit>;
  owner: string;
  repo: string;
  directory: string;
  changedFiles: string[];
  message?: string;
  branch?: string;
}): Promise<boolean> {
  try {
    // Read all changed files
    const files = await Promise.all(
      changedFiles.map(async (filePath) => {
        const content = await fs.readFile(
          path.join(directory, filePath),
          "utf8",
        );
        return { path: filePath, content };
      }),
    );

    return await createGithubCommit({
      octokit,
      owner,
      repo,
      message,
      files,
      branch,
    });
  } catch (error) {
    relinka(
      "error",
      "Failed to read local files:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
