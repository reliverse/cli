import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import {
  downloadRepo,
  type DownloadResult,
} from "~/utils/downloading/downloadRepo.js";
import { setHiddenAttributeOnWindows } from "~/utils/filesysHelpers.js";
import {
  REPOS,
  saveRepoToDevice,
  getRepoInfo,
  type Repo,
  type RepoFromSchema,
  type CategoryFromSchema,
} from "~/utils/projectRepository.js";

type UnghRepoResponse = {
  repo?: {
    pushedAt: string;
  };
};

async function checkRepoVersion(repo: Repo) {
  const [owner, repoName] = repo.id.split("/");
  if (!owner || !repoName) return null;

  const response = await fetch(`https://ungh.cc/repos/${owner}/${repoName}`);
  const data = (await response.json()) as UnghRepoResponse;
  return data.repo?.pushedAt ?? null;
}

export async function handleDownload({
  cwd,
  isDev,
  skipPrompts,
  projectPath,
  projectName,
  selectedRepo,
  auth,
  config,
  preserveGit = true,
  install = false,
  isCustom = false,
  isTemplateDownload,
}: {
  cwd: string;
  isDev: boolean;
  skipPrompts: boolean;
  projectPath: string;
  projectName: string;
  selectedRepo: string;
  auth?: string | undefined;
  preserveGit?: boolean | undefined;
  config?: ReliverseConfig | undefined;
  install?: boolean | undefined;
  isCustom?: boolean | undefined;
  isTemplateDownload: boolean;
}): Promise<DownloadResult> {
  if (isTemplateDownload) {
    relinka("info-verbose", "Handling template downloading...");
  }

  // -------------------------------------------------
  // 1) Identify chosen repo
  // -------------------------------------------------
  let repo: Repo;
  const foundRepo = REPOS.find((t) => t.id === selectedRepo);
  if (foundRepo && !isCustom) {
    repo = foundRepo;
  } else {
    // For custom repos, create a minimal repo object
    const [author, name] = selectedRepo.split("/");
    if (!author || !name) {
      throw new Error(
        `Invalid repo format: ${selectedRepo}. Expected format: owner/repo`,
      );
    }
    repo = {
      id: selectedRepo as RepoFromSchema, // We trust the user input for custom repos
      author,
      name,
      description: "Custom repository",
      category: "unknown" as CategoryFromSchema,
    };
  }

  // -------------------------------------------------
  // 2) Check for local repo copy
  // -------------------------------------------------
  const localRepoPath = path.join(
    os.homedir(),
    ".reliverse",
    "repos",
    repo.author,
    repo.name,
  );

  let useLocalRepo = false;
  if (await fs.pathExists(localRepoPath)) {
    // Get local repo info
    const localInfo = await getRepoInfo(repo.id);
    const currentPushedAt = await checkRepoVersion(repo);

    if (skipPrompts) {
      // Auto skip => use local copy
      useLocalRepo = true;
      relinka("info", "Using local repo copy (auto).");
    } else if (localInfo && currentPushedAt) {
      const localDate = new Date(localInfo.github.pushedAt);
      const currentDate = new Date(currentPushedAt);

      if (currentDate > localDate) {
        // Current version is newer
        const choice = await selectPrompt({
          title: "A newer version of the repo is available",
          options: [
            {
              label: "Download latest version",
              value: "download",
              hint: `Last updated ${currentDate.toLocaleDateString()}`,
            },
            {
              label: "Use local copy",
              value: "local",
              hint: `Downloaded ${localDate.toLocaleDateString()}`,
            },
          ],
        });
        useLocalRepo = choice === "local";
      } else {
        // Local version is up to date, use it automatically
        useLocalRepo = true;
        relinka("info", "Using local repo copy (up to date)...");
      }
    } else {
      // Fallback to simple prompt if version check fails
      useLocalRepo = await confirmPrompt({
        title: "Local copy found. Use it?",
        content: "If no, I'll download a fresh version.",
        defaultValue: true,
      });
    }

    if (useLocalRepo) {
      projectPath = isDev
        ? path.join(cwd, "tests-runtime", projectName)
        : path.join(cwd, projectName);
      await fs.copy(localRepoPath, projectPath);
      await setHiddenAttributeOnWindows(path.join(projectPath, ".git"));
    }
  }

  let result: DownloadResult;

  // -------------------------------------------------
  // 3) Download repo if no local copy used
  // -------------------------------------------------
  const term = isTemplateDownload ? "template" : "repo";
  if (!projectPath) {
    try {
      relinka(
        "info",
        `Now I'm downloading the '${selectedRepo}' ${term}...`,
        "The download speed depends on your internet connection and GitHub limits.",
      );
      result = await downloadRepo({
        repoURL: selectedRepo,
        projectName,
        isDev,
        cwd,
        ...(auth ? { auth } : {}),
        preserveGit,
        ...(config ? { config } : {}),
        install,
        returnTime: true,
        returnSize: true,
        isTemplateDownload,
      });
      projectPath = result.dir;
      if (result.time) {
        const includesGit = preserveGit
          ? " (size includes the preserved .git folder)."
          : ".";
        relinka(
          "success",
          `Successfully downloaded ${term} to ${projectPath}`,
          `It took ${result.time} seconds to download ${result.size} MB${includesGit}`,
        );
      }
    } catch (error) {
      relinka("error", `Failed to download ${term}:`, String(error));
      throw error;
    }
  } else {
    result = {
      source: selectedRepo,
      dir: projectPath,
    };
  }

  // -------------------------------------------------
  // 4) Optionally save repo to device
  // -------------------------------------------------
  let shouldSaveRepo = !useLocalRepo;
  if (!skipPrompts && !useLocalRepo) {
    shouldSaveRepo = await confirmPrompt({
      title: `Save a copy of the ${term} to your device?`,
      content: `This is useful if you have limited internet data or plan to reuse the ${term} soon.`,
      defaultValue: true,
    });
  }
  // If skipPrompts => remain true (but only if not using local copy)
  if (shouldSaveRepo) {
    await saveRepoToDevice(repo, projectPath);
  }

  return result;
}
