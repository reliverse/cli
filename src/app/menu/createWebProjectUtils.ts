import type { Octokit } from "octokit";

import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import { relinka } from "~/utils/console.js";
import { initializeGitRepository } from "~/utils/git.js";

export async function checkScriptExists(
  targetDir: string,
  scriptName: string,
): Promise<boolean> {
  try {
    const packageJsonPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return !!packageJson.scripts?.[scriptName];
    }
    return false;
  } catch (error: unknown) {
    relinka(
      "error",
      `Error checking for script ${scriptName}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export async function handleGitHubOperations(
  octokit: Octokit,
  repoOwner: string,
  repoName: string,
  targetDir: string,
): Promise<boolean> {
  try {
    // First check if repo exists
    try {
      await octokit.rest.repos.get({
        owner: repoOwner,
        repo: repoName,
      });
      relinka("info", `Repository ${repoOwner}/${repoName} already exists.`);
    } catch (error: any) {
      if (error?.status === 404) {
        // Create the repository if it doesn't exist
        await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          description: `Created with @reliverse/cli - ${new Date().toISOString()}`,
          private: false,
          auto_init: false,
          has_issues: true,
          has_projects: true,
          has_wiki: true,
        });
        relinka(
          "success",
          `Repository ${repoOwner}/${repoName} created successfully!`,
        );
      } else {
        relinka(
          "error",
          "Failed to check repository existence:",
          error?.message || String(error),
        );
        throw error;
      }
    }

    // Initialize git repository
    await initializeGitRepository(targetDir, "initializeNewGitRepository");
    const git = simpleGit({ baseDir: targetDir });

    // Create remote
    const remoteUrl = `https://github.com/${repoOwner}/${repoName}.git`;
    const remotes = await git.getRemotes();

    if (!remotes.find((remote) => remote.name === "origin")) {
      await git.addRemote("origin", remoteUrl);
      relinka("success", "Remote 'origin' added successfully.");
    } else {
      relinka("info", "Remote 'origin' already exists.");
    }

    return true;
  } catch (error: any) {
    relinka(
      "error",
      "GitHub operation failed:",
      error?.message || String(error),
    );
    return false;
  }
}
