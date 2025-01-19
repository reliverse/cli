import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { createTarGzip, type TarFileInput } from "nanotar";
import { homedir } from "node:os";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { setHiddenAttributeOnWindows } from "~/utils/filesysHelpers.js";

/**
 * Clones a repository to a temporary directory and copies specified files
 */
export async function archiveExistingRepoContent(
  repoUrl: string,
  projectPath: string,
): Promise<boolean> {
  const tempDir = path.join(
    homedir(),
    ".reliverse",
    "temp",
    Date.now().toString(),
  );
  try {
    // Create temp directory
    await fs.ensureDir(tempDir);

    // Clone repository to temp directory
    const git = simpleGit();
    await git.clone(repoUrl, tempDir);

    const shouldArchive = await confirmPrompt({
      title:
        "Would you like to create an archive of the existing repository content?",
      content:
        "In the future, you will be able to run `reliverse cli` to use merge operations on the project's old and new content. The term `cluster` is used as the name for the old content.",
      defaultValue: true,
    });

    if (shouldArchive) {
      // Create archive of tempDir content
      const fileInputs: TarFileInput[] = [];
      const tempFiles = await fs.readdir(tempDir);

      for (const file of tempFiles) {
        if (file !== ".git") {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (stats.isFile()) {
            const data = await fs.readFile(filePath);
            fileInputs.push({
              name: file,
              data: Buffer.isBuffer(data) ? data : Buffer.from(data),
            });
          } else if (stats.isDirectory()) {
            // Handle directories recursively
            const dirFiles = (await fs.readdir(filePath, {
              recursive: true,
            })) as string[];
            for (const dirFile of dirFiles) {
              const fullPath = path.join(tempDir, file, dirFile);
              if ((await fs.stat(fullPath)).isFile()) {
                const data = await fs.readFile(fullPath);
                fileInputs.push({
                  name: `${file}/${dirFile}`,
                  data: Buffer.isBuffer(data) ? data : Buffer.from(data),
                });
              }
            }
          }
        }
      }

      // Create archive if we have files to archive
      if (fileInputs.length > 0) {
        const archiveName = "cluster.tar.gz";
        const archivePath = path.join(projectPath, archiveName);
        const tarData = await createTarGzip(fileInputs);
        await fs.writeFile(archivePath, Buffer.from(tarData));
        relinka(
          "info",
          `Created archive of repository content at ${archiveName}`,
        );
      }
    }

    // Copy .git directory
    const gitDir = path.join(tempDir, ".git");
    if (await fs.pathExists(gitDir)) {
      // Remove existing .git directory if it exists
      const targetGitDir = path.join(projectPath, ".git");
      if (await fs.pathExists(targetGitDir)) {
        await fs.remove(targetGitDir);
        relinka("info-verbose", "Removed existing .git directory");
      }
      await fs.copy(gitDir, path.join(projectPath, ".git"), {
        preserveTimestamps: true,
        dereference: false,
        errorOnExist: false,
      });

      // Set hidden attribute for .git folder on Windows
      const gitFolderPath = path.join(projectPath, ".git");
      if (await fs.pathExists(gitFolderPath)) {
        await setHiddenAttributeOnWindows(gitFolderPath);
      }

      relinka("info", "Copied .git folder from existing repository");
    } else {
      throw new Error("Required .git folder not found");
    }

    // Copy specific files
    const filesToCopy = [
      { name: "README.md", required: false },
      { alternatives: ["LICENSE", "LICENSE.md"], required: false },
    ];

    for (const file of filesToCopy) {
      if (file.name) {
        const sourcePath = path.join(tempDir, file.name);
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, path.join(projectPath, file.name));
          relinka("info", `Copied ${file.name} from existing repository`);
        }
      } else if (file.alternatives) {
        for (const name of file.alternatives) {
          const filePath = path.join(tempDir, name);
          if (await fs.pathExists(filePath)) {
            await fs.copy(filePath, path.join(projectPath, name));
            relinka("info", `Copied ${name} from existing repository`);
            break;
          }
        }
      }
    }

    return true;
  } catch (error) {
    relinka(
      "error",
      "Failed to clone repository:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  } finally {
    // Cleanup temp directory
    try {
      await fs.remove(tempDir);
    } catch (error) {
      relinka("warn", "Failed to cleanup temporary directory:", String(error));
    }
  }
}

export async function handleExistingRepoContent(
  memory: ReliverseMemory,
  repoOwner: string,
  repoName: string,
  projectPath: string,
): Promise<boolean> {
  try {
    // Clone repo to temp dir and copy files
    const repoUrl = `https://oauth2:${memory.githubKey}@github.com/${repoOwner}/${repoName}.git`;
    const success = await archiveExistingRepoContent(repoUrl, projectPath);

    if (!success) {
      throw new Error("Failed to retrieve repository git data");
    }

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
}
