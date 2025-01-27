import { relinka } from "@reliverse/prompts";
import { simpleGit } from "simple-git";

import type { GitModParams } from "~/app/app-types.js";
import type { RepoOption } from "~/utils/projectRepository.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { cliName } from "~/app/constants.js";
import { getEffectiveDir } from "~/utils/getEffectiveDir.js";
import { migrateReliverseConfig } from "~/utils/reliverseConfig.js";
import { handleReplacements } from "~/utils/replacements/reps-mod.js";

import { handleExistingRepoContent } from "./utils-private-repo.js";

export async function handleExistingRepo(
  params: GitModParams & {
    memory: ReliverseMemory;
    config: ReliverseConfig;
    githubUsername: string;
    selectedTemplate: RepoOption;
  },
  shouldCommitAndPush: boolean,
): Promise<boolean> {
  const effectiveDir = getEffectiveDir(params);

  relinka(
    "info",
    `Using existing repo: ${params.githubUsername}/${params.projectName}`,
  );

  const { success: repoSuccess, externalReliversePath } =
    await handleExistingRepoContent(
      params.memory,
      params.githubUsername,
      params.projectName,
      effectiveDir,
    );

  if (!repoSuccess) {
    throw new Error("Failed to handle existing repository content");
  }

  // If we have a temp.reliverse file, migrate its data
  if (externalReliversePath) {
    await migrateReliverseConfig(externalReliversePath, effectiveDir);
  }

  // Run replacements after temp.reliverse
  // migration (even if migration failed)
  await handleReplacements(
    effectiveDir,
    params.selectedTemplate,
    "",
    {
      ...params.config,
      cliUsername: params.githubUsername,
      primaryDomain: `${params.projectName}.com`,
    },
    true,
    false,
  );

  if (shouldCommitAndPush) {
    // Create Octokit instance with GitHub token
    if (!params.memory.githubKey) {
      throw new Error("GitHub token not found");
    }

    // Add and commit all files in the working directory
    const git = simpleGit({ baseDir: effectiveDir });
    await git.add(".");
    await git.commit(`Update by ${cliName}`);

    // Get the latest commit details
    const latestCommit = await git.log({ maxCount: 1 });
    if (!latestCommit.latest) {
      throw new Error("Failed to get latest commit");
    }

    // Push the commit
    try {
      await git.push("origin", "main");
      relinka("success", "Created and pushed new commit with changes");
      return true;
    } catch (error) {
      relinka(
        "error",
        "Failed to push commit:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }
  return true;
}
