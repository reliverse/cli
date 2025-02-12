import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import path, { dirname } from "pathe";
import { simpleGit } from "simple-git";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { cliConfigJsonc, cliConfigTs } from "~/app/constants.js";
import { initGitDir } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/git.js";
import { setHiddenAttributeOnWindows } from "~/utils/filesysHelpers.js";
import { getReliverseConfigPath } from "~/utils/reliverseConfig.js";

/**
 * Defines the options for downloading a project from a remote repository.
 */
type DownloadRepoOptions = {
  /**
   * The repository to download, such as "owner/repo" (github:owner/repo), "owner/repo#ref" (github:owner/repo#ref), or "github:owner/repo/subdir".
   */
  repoURL: string;
  /**
   * The name of the new local project directory.
   */
  projectName: string;
  /**
   * Indicates if this operation is running in a development environment (used to place project in a 'tests-runtime' folder).
   */
  isDev: boolean;
  /**
   * The current working directory where the new project folder will be created.
   */
  cwd: string;
  /**
   * Optional authentication token (e.g., GitHub personal access token) if the repository is private.
   */
  auth?: string;
  /**
   * If true, automatically installs dependencies (via `nypm`) after downloading.
   */
  install?: boolean;
  /**
   * Specifies which Git hosting service to use. Supported values are "github", "gitlab", "bitbucket", and "sourcehut".
   */
  provider?: "github" | "gitlab" | "bitbucket" | "sourcehut";
  /**
   * If set, only extracts a specified subdirectory from the downloaded repository.
   */
  subdirectory?: string;
  /**
   * If true, forces the download to proceed even if the target directory is not empty.
   */
  force?: boolean;
  /**
   * If true, removes any existing contents in the target directory before downloading.
   */
  forceClean?: boolean;
  /**
   * If true, preserves the .git directory when cloning, maintaining Git history.
   * @default true
   */
  preserveGit?: boolean;
  /**
   * Configuration for the project when initializing a fresh Git repository.
   * Only used when preserveGit is false.
   */
  config?: ReliverseConfig | undefined;
  /**
   * If true, returns the duration (in seconds) it took to complete the download.
   */
  returnTime?: boolean;
  /**
   * If true, returns the total size (in MB) of the downloaded project folder.
   */
  returnSize?: boolean;
  /**
   * If true, returns the number of concurrent Git processes used.
   */
  returnConcurrency?: boolean;
  /**
   * If provided, use the fast clone method.
   * This should be the local path to a pre-populated ".git" folder that contains the complete history.
   */
  fastCloneSource?: string;
  /**
   * If true, the downloaded repository is a template download.
   */
  isTemplateDownload: boolean;
};

/**
 * Minimal structure containing repository metadata needed for download operations.
 */
type RepoInfo = {
  name: string;
  version: string;
  gitUrl?: string;
  subdir?: string;
  defaultDir?: string;
  headers?: Record<string, string>;
};

type GitProvider = "github" | "gitlab" | "bitbucket" | "sourcehut";

/**
 * Represents the result of a successful download operation, including the source URL,
 * the local directory path, and optionally the duration, size, and concurrency.
 */
export type DownloadResult = {
  source: string;
  dir: string;
  /**
   * The duration (in seconds) it took to complete the download.
   */
  time?: number;
  /**
   * The total size (in MB) of the downloaded project.
   */
  size?: number;
  /**
   * The number of concurrent Git processes used.
   */
  concurrency?: number;
};

/**
 * Recursively calculates the total size of a folder in bytes.
 * Optionally, directories with a basename found in skipDirs will be skipped.
 */
async function getFolderSize(
  directory: string,
  skipDirs: string[] = [],
): Promise<number> {
  let totalSize = 0;
  const entries = await fs.readdir(directory);
  for (const entry of entries) {
    // Skip directories that match one of the names in skipDirs.
    if (skipDirs.includes(entry)) continue;

    const fullPath = path.join(directory, entry);
    const stats = await fs.stat(fullPath);
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      totalSize += await getFolderSize(fullPath, skipDirs);
    }
  }
  return totalSize;
}

/**
 * Reads a Git repository string and extracts the provider (if any), repository path, reference/branch, and subdirectory.
 *
 * Supports formats such as:
 *   - "owner/repo"
 *   - "owner/repo#ref"
 *   - "provider:owner/repo"
 *   - "provider:owner/repo#ref"
 *   - Full URLs (e.g., "https://github.com/owner/repo")
 */
function parseGitURI(input: string) {
  const normalizedInput = input
    .trim()
    .replace(
      /^https?:\/\/(www\.)?(github|gitlab|bitbucket|sourcehut)\.com\//,
      "",
    )
    .replace(/^(github|gitlab|bitbucket|sourcehut)\.com\//, "")
    .replace(/^https?:\/\/git\.sr\.ht\/~/, "")
    .replace(/^git\.sr\.ht\/~/, "");
  const pattern =
    /^(?:(?<provider>[^:]+):)?(?<repo>[^#]+)(?<refPart>#[^/]+)?(?<subdir>\/.*)?$/;
  const match = pattern.exec(normalizedInput);
  if (!match?.groups) {
    return {
      provider: undefined,
      repo: normalizedInput,
      ref: "main",
      subdir: "",
    };
  }
  const { provider, repo, refPart, subdir } = match.groups;
  return {
    provider: provider?.trim(),
    repo: repo?.trim() ?? normalizedInput,
    ref: refPart ? refPart.slice(1).trim() : "main",
    subdir: subdir?.trim() ?? "",
  };
}

/**
 * Gets the repository URL based on the provider.
 */
function getRepoUrl(repo: string, provider: GitProvider): string {
  switch (provider) {
    case "gitlab":
      return `https://gitlab.com/${repo}.git`;
    case "bitbucket":
      return `https://bitbucket.org/${repo}.git`;
    case "sourcehut":
      return `https://git.sr.ht/~${repo}`;
    default:
      return `https://github.com/${repo}.git`;
  }
}

/**
 * Creates a final RepoInfo object (including gitUrl and optional headers)
 * from the raw repo string and user options (e.g., auth, subdirectory).
 */
function computeRepoInfo(
  input: string,
  defaultProvider: GitProvider,
  auth?: string,
  subdirectory?: string,
): RepoInfo {
  const { provider: parsedProvider, repo, ref, subdir } = parseGitURI(input);
  const actualProvider = (parsedProvider ?? defaultProvider) as GitProvider;
  const name = repo.replace("/", "-");
  const headers: Record<string, string> = {};
  if (auth) {
    headers["Authorization"] = `Bearer ${auth}`;
  }
  const gitUrl = getRepoUrl(repo, actualProvider);
  return {
    name,
    version: ref,
    // Use the subdir from parseGitURI if no explicit subdirectory is given
    subdir: subdirectory ?? subdir.replace(/^\/+/, ""),
    defaultDir: name,
    headers,
    gitUrl,
  };
}

/**
 * Generates a new project name with an iteration number if the directory already exists.
 */
async function getUniqueProjectPath(
  basePath: string,
  projectName: string,
  isDev: boolean,
): Promise<string> {
  let iteration = 1;
  let currentPath = basePath;
  let currentName = projectName;
  while (await fs.pathExists(currentPath)) {
    currentName = `${projectName}-${iteration}`;
    currentPath = isDev
      ? path.join(dirname(basePath), "tests-runtime", currentName)
      : path.join(dirname(basePath), currentName);
    iteration++;
  }
  return currentPath;
}

/**
 * Downloads a repository using git clone (shallow clone) and optionally installs dependencies.
 * If a subdirectory is requested and preserveGit is true, a sparse checkout is used so that the
 * final project directory contains just that subdirectory’s content (with Git history preserved).
 * Otherwise, a temporary clone is used to extract only the desired subdirectory.
 * If the fastCloneSource option is provided, the method copies the pre-populated ".git" folder from
 * that source and runs "git checkout -- ." to quickly rebuild the working tree while preserving complete history.
 * If the corresponding return options are enabled, the returned result will include:
 *  - time: the duration (in seconds) it took to complete the download,
 *  - size: the total size (in MB) of the downloaded project (excluding the .git folder when preserveGit is false),
 *  - concurrency: the max number of concurrent Git processes used.
 */
export async function downloadRepo({
  repoURL,
  projectName,
  isDev,
  cwd,
  auth,
  install = false,
  provider = "github",
  subdirectory,
  force = false,
  forceClean = false,
  preserveGit = true,
  config,
  returnTime = false,
  returnSize = false,
  returnConcurrency = false,
  fastCloneSource,
  isTemplateDownload,
}: DownloadRepoOptions): Promise<DownloadResult> {
  relinka("info-verbose", `Downloading repo ${repoURL}...`);
  const startTime = Date.now();
  let tempCloneDir: string | undefined = undefined;
  const maxConcurrentProcesses = 6;

  try {
    // 1) Decide where to create the project
    let projectPath = isDev
      ? path.join(cwd, "tests-runtime", projectName)
      : path.join(cwd, projectName);
    relinka("info-verbose", `Preparing to place repo in: ${projectPath}`);

    // 2) Handle existing directory
    if (forceClean) {
      await fs.remove(projectPath);
    } else if (!force && (await fs.pathExists(projectPath))) {
      const files = await fs.readdir(projectPath);
      const hasOnlyReliverseConfig =
        files.length === 1 && files[0] === cliConfigJsonc;
      if (files.length > 0 && !hasOnlyReliverseConfig) {
        projectPath = await getUniqueProjectPath(
          projectPath,
          projectName,
          isDev,
        );
        relinka(
          "info-verbose",
          `Directory already exists. Using new path: ${projectPath}`,
        );
      }
    }
    await fs.ensureDir(projectPath);

    // 3) Handle reliverse config file
    const parentDir = dirname(projectPath);
    const { configPath: tempReliverseConfigPath } =
      await getReliverseConfigPath(parentDir);
    const { configPath: projectReliverseConfigPath } =
      await getReliverseConfigPath(projectPath);

    const hasReliverseConfig = await fs.pathExists(projectReliverseConfigPath);
    if (hasReliverseConfig) {
      if (await fs.pathExists(tempReliverseConfigPath)) {
        const choice = await selectPrompt({
          title: `${projectReliverseConfigPath} already exists in parent directory. What would you like to do?`,
          options: [
            { value: "delete", label: "Delete existing file" },
            { value: "backup", label: "Create backup" },
          ],
        });
        if (choice === "delete") {
          await fs.remove(tempReliverseConfigPath);
        } else {
          let backupPath = path.join(
            parentDir,
            projectReliverseConfigPath.endsWith(cliConfigJsonc)
              ? "reliverse-bak.jsonc"
              : "reliverse-bak.ts",
          );
          let iteration = 1;
          while (await fs.pathExists(backupPath)) {
            backupPath = path.join(
              parentDir,
              `${projectReliverseConfigPath.endsWith(cliConfigJsonc) ? "reliverse-bak-" : "reliverse-bak-"}${iteration}.${
                projectReliverseConfigPath.endsWith(cliConfigJsonc)
                  ? "jsonc"
                  : "ts"
              }`,
            );
            iteration++;
          }
          await fs.move(tempReliverseConfigPath, backupPath);
        }
      }
      // Move the file from projectPath to the parent directory
      await fs.move(
        path.join(
          projectPath,
          projectReliverseConfigPath.endsWith(cliConfigJsonc)
            ? cliConfigJsonc
            : cliConfigTs,
        ),
        tempReliverseConfigPath,
      );
      await fs.remove(projectPath);
      await fs.ensureDir(projectPath);
    }

    // 4) Parse and compute final repo info
    const repoInfo = computeRepoInfo(repoURL, provider, auth, subdirectory);
    if (!repoInfo.gitUrl) {
      throw new Error(`Invalid repository URL or provider: ${repoURL}`);
    }

    // 5) Prepare final URL (embed auth token if needed)
    let finalUrl = repoInfo.gitUrl;
    if (auth) {
      const authUrl = new URL(repoInfo.gitUrl);
      authUrl.username = "oauth2";
      authUrl.password = auth;
      finalUrl = authUrl.toString();
    }

    // 6) Clone or fast clone the repository
    if (fastCloneSource) {
      // --- Fast clone method ---
      // Copy the pre-populated ".git" folder from fastCloneSource into projectPath
      relinka(
        "info-verbose",
        `Using fast clone method from: ${fastCloneSource}`,
      );
      await fs.copy(fastCloneSource, path.join(projectPath, ".git"));
      const git = simpleGit({ maxConcurrentProcesses });
      await git.cwd(projectPath);
      // Rebuild the working tree using the complete history from the .git folder
      await git.checkout(["--", "."]);
    } else {
      // --- Normal clone method ---
      const git = simpleGit({ maxConcurrentProcesses });
      try {
        if (repoInfo.subdir) {
          // A subdirectory was requested
          if (preserveGit) {
            // Preserve Git history: use sparse-checkout to check out only the subdirectory.
            await git.clone(finalUrl, projectPath, [
              "--branch",
              repoInfo.version,
            ]);
            await git.cwd(projectPath);
            await git.raw(["sparse-checkout", "init", "--cone"]);
            await git.raw(["sparse-checkout", "set", repoInfo.subdir]);
            const subdirPath = path.join(projectPath, repoInfo.subdir);
            if (!(await fs.pathExists(subdirPath))) {
              throw new Error(
                `Subdirectory '${repoInfo.subdir}' not found in repository ${repoURL}`,
              );
            }
            const files = await fs.readdir(subdirPath);
            for (const file of files) {
              await fs.move(
                path.join(subdirPath, file),
                path.join(projectPath, file),
                { overwrite: true },
              );
            }
            await fs.remove(subdirPath);
          } else {
            // Not preserving Git: clone the entire repository shallowly into a temporary directory,
            // then copy only the requested subdirectory (excluding any .git files).
            tempCloneDir = await fs.mkdtemp(path.join(parentDir, "gitclone-"));
            await git.clone(finalUrl, tempCloneDir, [
              "--branch",
              repoInfo.version,
              "--depth",
              "1",
              "--single-branch",
            ]);
            const srcSubdir = path.join(tempCloneDir, repoInfo.subdir);
            if (!(await fs.pathExists(srcSubdir))) {
              throw new Error(
                `Subdirectory '${repoInfo.subdir}' not found in repository ${repoURL}`,
              );
            }
            await fs.copy(srcSubdir, projectPath, {
              filter: (src) => !src.includes(`${path.sep}.git`),
            });
          }
        } else {
          // No subdirectory requested: do a normal clone
          const cloneOptions = ["--branch", repoInfo.version];
          if (!preserveGit) {
            cloneOptions.push("--depth", "1", "--single-branch");
          }
          await git.clone(finalUrl, projectPath, cloneOptions);
        }

        // 7) Post-clone adjustments
        if (!repoInfo.subdir) {
          if (!preserveGit) {
            await fs.remove(path.join(projectPath, ".git"));
            if (config) {
              relinka("info-verbose", "[D] initGitDir");
              await initGitDir({
                cwd,
                isDev,
                projectName,
                projectPath,
                allowReInit: true,
                createCommit: true,
                config,
                isTemplateDownload,
              });
            }
          } else {
            await setHiddenAttributeOnWindows(path.join(projectPath, ".git"));
          }
        } else {
          if (preserveGit) {
            await setHiddenAttributeOnWindows(path.join(projectPath, ".git"));
          }
        }
      } finally {
        if (tempCloneDir && (await fs.pathExists(tempCloneDir))) {
          await fs.remove(tempCloneDir);
        }
      }
    }

    // 8) Restore config if it was moved
    if (hasReliverseConfig) {
      await fs.move(tempReliverseConfigPath, projectReliverseConfigPath, {
        overwrite: true,
      });
    }

    // 9) Install dependencies if requested
    if (install) {
      relinka("info", "Installing dependencies...");
      await installDependencies({
        cwd: projectPath,
        silent: false,
      });
    }

    relinka("success-verbose", "Repository downloaded successfully!");
    const durationSeconds = (Date.now() - startTime) / 1000;
    const result: DownloadResult = {
      source: repoURL,
      dir: projectPath,
    };
    if (returnTime) {
      result.time = durationSeconds;
    }
    if (returnSize) {
      // Convert size from bytes to megabytes (MB) and round to 2 decimal places.
      // When preserveGit is false, exclude any ".git" folders.
      const folderSizeBytes = await getFolderSize(
        projectPath,
        preserveGit ? [] : [".git"],
      );
      result.size = parseFloat((folderSizeBytes / (1024 * 1024)).toFixed(2));
    }
    if (returnConcurrency) {
      result.concurrency = maxConcurrentProcesses;
    }
    return result;
  } catch (error) {
    relinka("error", "Failed to download repository...");
    if (error instanceof Error) {
      throw new Error(`Failed to download ${repoURL}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}
