import type { SimpleGit } from "simple-git";

import {
  inputPrompt,
  selectPrompt,
  deleteLastLine,
  relinka,
} from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { GitModParams } from "~/app/app-types.js";
import type { InstanceGithub } from "~/utils/instanceGithub.js";
import type { ReliverseConfig } from "~/utils/libs/config/schemaConfig.js";
import type { RepoOption } from "~/utils/projectRepository.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { cliName } from "~/app/constants.js";
import { getEffectiveDir } from "~/utils/getEffectiveDir.js";
import { cd, pwd } from "~/utils/terminalHelpers.js";

import { checkGithubRepoOwnership, createGithubRepo } from "./github.js";
import { isDirHasGit } from "./utils-git-github.js";
import { handleExistingRepo } from "./utils-repo-exists.js";

/* -----------------------------------------------------------------------------
 * Utility Functions
 * -------------------------------------------------------------------------- */

/**
 * Validates that the provided directory exists.
 */
async function validateProjectPath(effectiveDir: string): Promise<boolean> {
  const exists = await fs.pathExists(effectiveDir);
  if (!exists) {
    relinka("error", `Project directory does not exist: ${effectiveDir}`);
  }
  return exists;
}

/**
 * Removes the .git directory from the given directory.
 */
async function removeGitDir(effectiveDir: string): Promise<boolean> {
  const gitDir = path.join(effectiveDir, ".git");
  try {
    await fs.remove(gitDir);
    relinka("info-verbose", "Removed existing .git directory");
    return true;
  } catch (error) {
    relinka(
      "error",
      "Failed to remove existing .git directory:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Initializes Git repository in effectiveDir if not already present.
 * Also renames the default branch to config.repoBranch if provided.
 */
async function initializeGitRepo(
  git: SimpleGit,
  alreadyGit: boolean,
  config: ReliverseConfig,
  isTemplateDownload: boolean,
): Promise<void> {
  // Skip initializing repo if this is a template download.
  if (isTemplateDownload) {
    relinka(
      "info-verbose",
      "Skipping git initialization for template download",
    );
    return;
  }

  if (!alreadyGit) {
    await git.init();
    deleteLastLine();
    relinka("success", "Git repository initialized");

    // Rename branch if necessary.
    const branchName =
      config.repoBranch && config.repoBranch !== "main"
        ? config.repoBranch
        : "main";
    try {
      await git.raw(["branch", "-M", branchName]);
    } catch (error) {
      relinka(
        "warn",
        "Failed to rename default branch:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } else {
    relinka("info", "Using existing git repository");
  }
}

/**
 * Creates a Git commit with all changes.
 * If there are no files and the repo is empty, creates an empty commit.
 */
async function createGitCommit(
  git: SimpleGit,
  effectiveDir: string,
  alreadyGit: boolean,
  isTemplateDownload: boolean,
  message?: string,
): Promise<void> {
  if (isTemplateDownload) {
    relinka("info-verbose", "Skipping commit creation for template download");
    return;
  }

  const status = await git.status();

  // If not a git repo (empty directory) then add a .gitkeep and commit.
  if (status.files.length === 0 && !alreadyGit) {
    relinka("info", "No files to commit. Creating an empty commit");
    await fs.writeFile(path.join(effectiveDir, ".gitkeep"), "");
    await git.add(".gitkeep");
    await git.commit(message ?? `Initial commit by ${cliName}`);
    relinka("success", "Created empty initial commit");
  } else if (status.files.length > 0) {
    // Commit all changes.
    await git.add(".");
    await git.commit(
      message ??
        (alreadyGit ? `Update by ${cliName}` : `Initial commit by ${cliName}`),
    );
    relinka(
      "success",
      alreadyGit ? "Changes committed" : "Initial commit created",
    );
  } else {
    relinka("info", "No changes to commit in existing repository");
  }
}

/* -----------------------------------------------------------------------------
 * Git Repository Core Operations
 * -------------------------------------------------------------------------- */

/**
 * Initializes a git repository for the given project.
 * If allowReInit is true and a repository exists, it is removed and reinitialized.
 */
export async function initGitDir(
  params: GitModParams & {
    allowReInit: boolean;
    createCommit: boolean;
    config: ReliverseConfig;
    isTemplateDownload: boolean;
  },
): Promise<boolean> {
  if (params.isTemplateDownload) {
    relinka(
      "info-verbose",
      "Skipping git initialization for template download",
    );
    return true;
  }

  const effectiveDir = getEffectiveDir(params);

  try {
    if (!(await validateProjectPath(effectiveDir))) {
      return false;
    }

    const alreadyGit = await isDirHasGit(
      params.cwd,
      params.isDev,
      params.projectName,
      params.projectPath,
    );

    if (alreadyGit && params.allowReInit) {
      deleteLastLine(); // Clear previous log line
      relinka("info-verbose", "Reinitializing existing git repository...");
      if (!(await removeGitDir(effectiveDir))) return false;
      const git: SimpleGit = simpleGit({ baseDir: effectiveDir });
      await initializeGitRepo(
        git,
        false,
        params.config,
        params.isTemplateDownload,
      );
      if (params.createCommit) {
        await createGitCommit(
          git,
          effectiveDir,
          false,
          params.isTemplateDownload,
        );
      }
      return true;
    }

    const git: SimpleGit = simpleGit({ baseDir: effectiveDir });
    await initializeGitRepo(
      git,
      alreadyGit,
      params.config,
      params.isTemplateDownload,
    );

    if (params.createCommit) {
      await createGitCommit(
        git,
        effectiveDir,
        alreadyGit,
        params.isTemplateDownload,
      );
    }

    return true;
  } catch (error) {
    const alreadyGit = await isDirHasGit(
      params.cwd,
      params.isDev,
      params.projectName,
      params.projectPath,
    );
    relinka(
      "error",
      `Failed to ${alreadyGit ? "update" : "initialize"} git: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    relinka(
      "info",
      `You can ${alreadyGit ? "commit changes" : "initialize git"} manually:\ncd ${effectiveDir}\n${
        alreadyGit
          ? 'git add .\ngit commit -m "Update"'
          : 'git init\ngit add .\ngit commit -m "Initial commit"'
      }`,
    );
    return false;
  }
}

/**
 * Creates a commit in the repository.
 * If the repository isn’t initialized yet, it initializes it.
 */
export async function createCommit(
  params: GitModParams & {
    message?: string;
    config: ReliverseConfig;
    isTemplateDownload: boolean;
  },
): Promise<boolean> {
  if (params.isTemplateDownload) {
    relinka("info-verbose", "Skipping commit creation for template download");
    return true;
  }

  const effectiveDir = getEffectiveDir(params);

  try {
    if (!(await validateProjectPath(effectiveDir))) return false;

    const alreadyGit = await isDirHasGit(
      params.cwd,
      params.isDev,
      params.projectName,
      params.projectPath,
    );

    const git: SimpleGit = simpleGit({ baseDir: effectiveDir });
    await initializeGitRepo(
      git,
      alreadyGit,
      params.config,
      params.isTemplateDownload,
    );
    await createGitCommit(
      git,
      effectiveDir,
      alreadyGit,
      params.isTemplateDownload,
      params.message,
    );

    return true;
  } catch (error) {
    const alreadyGit = await isDirHasGit(
      params.cwd,
      params.isDev,
      params.projectName,
      params.projectPath,
    );
    relinka(
      "error",
      `Failed to ${alreadyGit ? "create commit" : "initialize"} git: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    relinka(
      "info",
      `You can ${alreadyGit ? "commit changes" : "initialize git"} manually:\ncd ${effectiveDir}\n${
        alreadyGit
          ? 'git add .\ngit commit -m "Update"'
          : 'git init\ngit add .\ngit commit -m "Initial commit"'
      }`,
    );
    return false;
  }
}

/* -----------------------------------------------------------------------------
 * GitHub Integration
 * -------------------------------------------------------------------------- */

/**
 * Checks whether the provided GitHub user owns the repository.
 */
async function isRepoOwner(
  githubUsername: string,
  repoName: string,
  githubToken: string,
  githubInstance: InstanceGithub,
): Promise<boolean> {
  if (!githubToken) {
    relinka("error", "GitHub token not found in Reliverse's memory");
    return false;
  }
  try {
    const { isOwner } = await checkGithubRepoOwnership(
      githubInstance,
      githubUsername,
      repoName,
    );
    return isOwner;
  } catch (error) {
    relinka(
      "error",
      "Error checking repository ownership:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Handles GitHub repository creation or usage.
 * If the repo does not exist, it is created; if it exists,
 * the user is prompted whether to make a new commit, skip commit, or create a new repository.
 */
export async function handleGithubRepo(
  params: GitModParams & {
    skipPrompts: boolean;
    memory: ReliverseMemory;
    config: ReliverseConfig;
    maskInput: boolean;
    selectedTemplate: RepoOption;
    isTemplateDownload: boolean;
    githubInstance: InstanceGithub;
    githubToken: string;
    githubUsername: string;
    isDev: boolean;
  },
): Promise<boolean> {
  if (params.isTemplateDownload) {
    relinka(
      "info-verbose",
      "Skipping GitHub repository handling for template download",
    );
    return true;
  }

  const effectiveDir = getEffectiveDir(params);

  if (!params.memory || !params.githubUsername || !params.githubToken) {
    relinka("error", "Something went wrong. Please notify CLI developers.");
    return false;
  }

  // Check whether the user already owns the repository.
  const repoExists = await isRepoOwner(
    params.githubUsername,
    params.projectName,
    params.githubToken,
    params.githubInstance,
  );

  if (!repoExists) {
    // Repo DOES NOT exist: create a new one.
    return await createGithubRepo(
      params.githubInstance,
      params.projectName,
      params.githubUsername,
      effectiveDir,
      params.isDev,
      params.cwd,
      params.config,
      params.isTemplateDownload,
    );
  } else {
    // Repo DOES exist: prompt the user for actions.
    if (params.isDev) {
      await cd(effectiveDir);
      pwd();
    }
    // Decide what to do with the existing repo.
    let choice: "commit" | "skip" | "new" = "commit";
    const alreadyExistsDecision = params.config.existingRepoBehavior;
    if (params.skipPrompts) {
      switch (alreadyExistsDecision) {
        case "autoYes":
          choice = "commit";
          break;
        case "autoYesSkipCommit":
          choice = "skip";
          break;
        case "autoNo":
          choice = "new";
          break;
      }
    } else {
      choice = await selectPrompt({
        title: `Repository ${params.githubUsername}/${params.projectName} already exists and you own it. What would you like to do?`,
        content:
          "Note: A commit will be created and pushed only if there are uncommitted changes.",
        options: [
          {
            value: "commit",
            label: `${re.greenBright("✅ Recommended")} Use existing repository and create+push new commit`,
          },
          {
            value: "skip",
            label: "Use existing repository, but skip creating a commit",
          },
          {
            value: "new",
            label:
              "Initialize a brand-new GitHub repository with a different name",
          },
        ],
        defaultValue: "commit",
      });
    }

    if (choice === "commit" || choice === "skip") {
      await handleExistingRepo(params, choice === "commit", params.isDev);
      // Continue with other operations.
    } else if (choice === "new") {
      // User wants to create a new repository under a new name.
      const newName = await inputPrompt({
        title: "Enter a new repository name:",
        validate: (value: string) => {
          const trimmed = value.trim();
          if (!trimmed) return "Repository name is required";
          if (!/^[a-zA-Z0-9-_]+$/.test(trimmed))
            return "Invalid repository name format";
          return true;
        },
      });
      if (!newName || typeof newName !== "string") {
        relinka("error", "Invalid repository name provided");
        return false;
      }
      return await createGithubRepo(
        params.githubInstance,
        newName,
        params.githubUsername,
        effectiveDir,
        params.isDev,
        params.cwd,
        params.config,
        params.isTemplateDownload,
      );
    }
    return true;
  }
}

/**
 * Pushes local commits to the remote GitHub repository.
 */
export async function pushGitCommits(params: GitModParams): Promise<boolean> {
  const effectiveDir = getEffectiveDir(params);
  try {
    if (
      !(await isDirHasGit(
        params.cwd,
        params.isDev,
        params.projectName,
        params.projectPath,
      ))
    ) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: effectiveDir });

    // Determine current branch.
    const currentBranch = (await git.branch()).current;
    if (!currentBranch) {
      relinka("error", "No current branch found.");
      return false;
    }

    // Check for commits to push.
    const status = await git.status();
    if (status.ahead === 0) {
      relinka("info", "No commits to push.");
      return true;
    }

    await git.push("origin", currentBranch);
    relinka(
      "success",
      `Pushed ${status.ahead} commit(s) to origin/${currentBranch}`,
    );

    return true;
  } catch (error) {
    relinka(
      "error",
      `Failed to push commits: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}
