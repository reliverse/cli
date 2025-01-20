import { relinka } from "@reliverse/relinka";
import { parseJSONC } from "confbox";
import fs from "fs-extra";
import { simpleGit } from "simple-git";

import type { GitModParams } from "~/app/app-types.js";
import type { TemplateOption } from "~/utils/projectTemplate.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { cliName } from "~/app/constants.js";
import { getEffectiveDir } from "~/utils/getEffectiveDir.js";
import { updateReliverseConfig } from "~/utils/reliverseConfig.js";
import { handleReplacements } from "~/utils/replacements/reps-mod.js";

import { handleExistingRepoContent } from "./utils-private-repo.js";

export async function handleExistingRepo(
  params: GitModParams & {
    memory: ReliverseMemory;
    config: ReliverseConfig;
    githubUsername: string;
    selectedTemplate: TemplateOption;
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
    try {
      const content = await fs.readFile(externalReliversePath, "utf-8");
      const parsed = parseJSONC(content);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid JSONC format in temp.reliverse");
      }

      const tempConfig = parsed as Partial<ReliverseConfig>;
      const migratedFields: string[] = [];

      // Only migrate fields that match our schema
      const validConfig: Partial<ReliverseConfig> = {
        // Project info
        ...(tempConfig.projectDescription && {
          projectDescription: tempConfig.projectDescription,
          [migratedFields.push("projectDescription")]: undefined,
        }),
        ...(tempConfig.projectVersion && {
          projectVersion: tempConfig.projectVersion,
          [migratedFields.push("projectVersion")]: undefined,
        }),
        ...(tempConfig.projectLicense && {
          projectLicense: tempConfig.projectLicense,
          [migratedFields.push("projectLicense")]: undefined,
        }),
        ...(tempConfig.projectRepository && {
          projectRepository: tempConfig.projectRepository,
          [migratedFields.push("projectRepository")]: undefined,
        }),
        ...(tempConfig.projectCategory && {
          projectCategory: tempConfig.projectCategory,
          [migratedFields.push("projectCategory")]: undefined,
        }),
        ...(tempConfig.projectSubcategory && {
          projectSubcategory: tempConfig.projectSubcategory,
          [migratedFields.push("projectSubcategory")]: undefined,
        }),
        ...(tempConfig.projectFramework && {
          projectFramework: tempConfig.projectFramework,
          [migratedFields.push("projectFramework")]: undefined,
        }),
        ...(tempConfig.projectTemplate && {
          projectTemplate: tempConfig.projectTemplate,
          [migratedFields.push("projectTemplate")]: undefined,
        }),
        ...(tempConfig.projectArchitecture && {
          projectArchitecture: tempConfig.projectArchitecture,
          [migratedFields.push("projectArchitecture")]: undefined,
        }),
        ...(tempConfig.projectRuntime && {
          projectRuntime: tempConfig.projectRuntime,
          [migratedFields.push("projectRuntime")]: undefined,
        }),

        // Features and preferences
        ...(tempConfig.features && {
          features: tempConfig.features,
          [migratedFields.push("features")]: undefined,
        }),
        ...(tempConfig.preferredLibraries && {
          preferredLibraries: tempConfig.preferredLibraries,
          [migratedFields.push("preferredLibraries")]: undefined,
        }),
        ...(tempConfig.codeStyle && {
          codeStyle: tempConfig.codeStyle,
          [migratedFields.push("codeStyle")]: undefined,
        }),
        ...(tempConfig.monorepo && {
          monorepo: tempConfig.monorepo,
          [migratedFields.push("monorepo")]: undefined,
        }),
        ...(tempConfig.ignoreDependencies && {
          ignoreDependencies: tempConfig.ignoreDependencies,
          [migratedFields.push("ignoreDependencies")]: undefined,
        }),
        ...(tempConfig.customRules && {
          customRules: tempConfig.customRules,
          [migratedFields.push("customRules")]: undefined,
        }),

        // Behaviors
        ...(tempConfig.skipPromptsUseAutoBehavior !== undefined && {
          skipPromptsUseAutoBehavior: tempConfig.skipPromptsUseAutoBehavior,
          [migratedFields.push("skipPromptsUseAutoBehavior")]: undefined,
        }),
        ...(tempConfig.deployBehavior && {
          deployBehavior: tempConfig.deployBehavior,
          [migratedFields.push("deployBehavior")]: undefined,
        }),
        ...(tempConfig.depsBehavior && {
          depsBehavior: tempConfig.depsBehavior,
          [migratedFields.push("depsBehavior")]: undefined,
        }),
        ...(tempConfig.gitBehavior && {
          gitBehavior: tempConfig.gitBehavior,
          [migratedFields.push("gitBehavior")]: undefined,
        }),
        ...(tempConfig.i18nBehavior && {
          i18nBehavior: tempConfig.i18nBehavior,
          [migratedFields.push("i18nBehavior")]: undefined,
        }),
        ...(tempConfig.scriptsBehavior && {
          scriptsBehavior: tempConfig.scriptsBehavior,
          [migratedFields.push("scriptsBehavior")]: undefined,
        }),
        ...(tempConfig.existingRepoBehavior && {
          existingRepoBehavior: tempConfig.existingRepoBehavior,
          [migratedFields.push("existingRepoBehavior")]: undefined,
        }),
        ...(tempConfig.repoPrivacy && {
          repoPrivacy: tempConfig.repoPrivacy,
          [migratedFields.push("repoPrivacy")]: undefined,
        }),
      };

      // Update the .reliverse config with migrated data, preserving comments
      const success = await updateReliverseConfig(effectiveDir, validConfig);

      if (success) {
        relinka("success", "Successfully migrated .reliverse config");
        relinka(
          "success-verbose",
          "Migrated fields:",
          migratedFields.join(", "),
        );
      }

      // Clean up temp.reliverse after migration
      await fs.remove(externalReliversePath);
    } catch (error) {
      relinka(
        "warn",
        "Failed to migrate data from temp.reliverse:",
        String(error),
      );
    }
  }

  // Always run replacements after migration (or if migration failed)
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
