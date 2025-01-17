import type { Octokit } from "@octokit/rest";

import { RequestError } from "@octokit/request-error";
import { inputPrompt, selectPrompt } from "@reliverse/prompts";
import { deleteLastLine, relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { cliName } from "~/app/constants.js";
import { updateReliverseMemory } from "~/utils/reliverseMemory.js";
import { cd } from "~/utils/terminalHelpers.js";

import { initGitDir } from "./git.js";
import { createOctokitInstance } from "./octokit-instance.js";
import { setupGitRemote } from "./utils-git-github.js";

export async function checkGithubRepoOwnership(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<{ exists: boolean; isOwner: boolean; defaultBranch?: string }> {
  try {
    const { data: repository } = await octokit.rest.repos.get({ owner, repo });
    return {
      exists: true,
      isOwner: repository.permissions?.admin === true,
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
  message = `Update by ${cliName}`,
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
        const fullPath = path.join(directory, filePath);
        try {
          // Check if file exists and is readable
          if (await fs.pathExists(fullPath)) {
            const content = await fs.readFile(fullPath, "utf8");
            return { path: filePath, content };
          } else {
            relinka("warn", `File not found: ${filePath}, skipping...`);
            return null;
          }
        } catch (_error) {
          relinka("warn", `Could not read file ${filePath}, skipping...`);
          return null;
        }
      }),
    );

    // Filter out null entries (files that couldn't be read)
    const validFiles = files.filter(
      (file): file is { path: string; content: string } => file !== null,
    );

    if (validFiles.length === 0) {
      relinka("warn", "No valid files to commit");
      return false;
    }

    return await createGithubCommit({
      octokit,
      owner,
      repo,
      message,
      files: validFiles,
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

export async function getAvailableGithubRepoName(
  octokit: Octokit,
  owner: string,
  initialName: string,
): Promise<{
  name: string;
  exists: boolean;
  defaultBranch: string | undefined;
}> {
  let repoName = initialName;
  let repoStatus = await checkGithubRepoOwnership(octokit, owner, repoName);

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
        const status = await checkGithubRepoOwnership(octokit, owner, value);
        if (status.exists && !status.isOwner) {
          return `Repository "${value}" already exists. Please choose a different name`;
        }
        return true;
      },
    });
    repoStatus = await checkGithubRepoOwnership(octokit, owner, repoName);
  }

  return { name: repoName, exists: false, defaultBranch: undefined };
}

export async function ensureGithubToken(
  memory: ReliverseMemory,
  shouldMaskSecretInput: boolean,
): Promise<string> {
  if (memory.githubKey) {
    // Validate existing token
    try {
      const octokit = createOctokitInstance(memory.githubKey);
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
    mode: shouldMaskSecretInput ? "password" : "plain",
    validate: async (value: string): Promise<string | boolean> => {
      if (!value?.trim()) {
        return "Token is required";
      }
      try {
        const octokit = createOctokitInstance(value);
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

export async function createGithubRepo(
  memory: ReliverseMemory,
  repoName: string,
  repoOwner: string,
  projectPath: string,
  isDev: boolean,
  cwd: string,
  shouldMaskSecretInput: boolean,
  config: ReliverseConfig,
): Promise<boolean> {
  try {
    // 1. Ensure we have a GitHub token
    const githubKey = await ensureGithubToken(memory, shouldMaskSecretInput);
    const octokit = createOctokitInstance(githubKey);

    await cd(projectPath);

    // 2. Get an available repository name and check its status
    deleteLastLine(); // Deletes the "GET /repos/repoOwner/repoName - 404 ..." line
    relinka("info", "Checking repository status...");
    const { name: effectiveRepoName, exists: repoExists } =
      await getAvailableGithubRepoName(octokit, repoOwner, repoName);
    repoName = effectiveRepoName;

    if (repoExists) {
      relinka("info", `Using existing repository: ${repoOwner}/${repoName}`);
      // await handleExistingRepoContent(memory, repoOwner, repoName, projectPath);
    } else {
      // New repository
      await initGitDir({
        cwd,
        isDev,
        projectPath,
        projectName: repoName,
        allowReInit: true,
      });
      let privacyAction = config.repoPrivacy;
      if (privacyAction === "unknown") {
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
      // deleteLastLine(); // Deletes the "GET /repos/repoOwner/repoName - 404 ..." line
      relinka(
        "info",
        `Creating repository https://github.com/${repoOwner}/${repoName}`,
      );
      try {
        await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          description: `Created with ${cliName} - ${new Date().toISOString()}`,
          private: privacyAction === "private",
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
