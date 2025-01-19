import type { PackageJson } from "pkg-types";

import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

/**
 * Checks if the given directory is a git repository
 */
export async function isDirHasGit(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
): Promise<boolean> {
  const effectiveDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    if (!(await fs.pathExists(effectiveDir))) {
      relinka("error", `Directory does not exist: ${effectiveDir}`);
      return false;
    }

    const gitDir = path.join(effectiveDir, ".git");
    if (!(await fs.pathExists(gitDir))) {
      return false;
    }

    const git = simpleGit({ baseDir: effectiveDir });
    return await git.checkIsRepo();
  } catch (error) {
    // Only log if it's not a "not a git repo" error
    if (
      !(
        error instanceof Error && error.message.includes("not a git repository")
      )
    ) {
      relinka(
        "error",
        "Error checking git repository:",
        error instanceof Error ? error.message : String(error),
      );
    }
    return false;
  }
}

/**
 * Sets up a remote for an existing local git repository and pushes the initial commit
 */
export async function setupGitRemote(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
  remoteUrl: string,
  remoteName = "origin",
): Promise<boolean> {
  const effectiveDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    // Validate directory and git repo
    if (!(await fs.pathExists(effectiveDir))) {
      relinka("error", `Directory does not exist: ${effectiveDir}`);
      return false;
    }

    if (!(await isDirHasGit(cwd, isDev, projectName, projectPath))) {
      relinka(
        "error",
        "Not a git repository, git should be initialized before setupGitRemote. Something went wrong. Please notify developers.",
      );
      return false;
    }

    const git = simpleGit({ baseDir: effectiveDir });
    const remotes = await git.getRemotes();

    // Setup remote
    if (!remotes.find((remote) => remote.name === remoteName)) {
      await git.addRemote(remoteName, remoteUrl);
      relinka("success-verbose", `Remote '${remoteName}' added successfully.`);
    } else {
      // Update existing remote URL if different
      const remoteGetUrl = await git.remote(["get-url", remoteName]);
      const existingUrl = remoteGetUrl ? remoteGetUrl.trim() : "";

      if (existingUrl !== remoteUrl) {
        await git.remote(["set-url", remoteName, remoteUrl]);
        relinka("info", `Updated ${remoteName} remote URL to ${remoteUrl}`);
      } else {
        relinka(
          "info",
          `Remote '${remoteName}' already exists with correct URL.`,
        );
      }
    }

    // Push initial commit (if any) — sets upstream if it hasn’t been set
    await git.push(remoteName, "main", ["--set-upstream"]);
    relinka("success", "Initial commit pushed to remote repository.");

    return true;
  } catch (error) {
    relinka(
      "error",
      `Failed to setup git remote: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    relinka(
      "info",
      `You can setup the remote manually:\ncd ${effectiveDir}\ngit remote add ${remoteName} ${remoteUrl}\ngit push -u ${remoteName} main`,
    );
    return false;
  }
}

export function extractGithubUsername(
  packageJson: PackageJson | null,
  memory: ReliverseMemory,
  fallback: string,
): string {
  let githubUsername = memory.githubUsername;
  if (!githubUsername && packageJson?.repository) {
    const repoUrl =
      typeof packageJson.repository === "string"
        ? packageJson.repository
        : packageJson.repository.url;

    if (repoUrl) {
      const match = /github\.com[:/]([^/]+)/.exec(repoUrl);
      if (match) {
        githubUsername = match[1];
      }
    }
  }
  return githubUsername ?? fallback;
}
