// handleReplacements.ts

import { extractRepoInfo } from "~/prompts/utils/extractRepoInfo";
import { replaceStringsInFiles } from "~/prompts/utils/replaceStringsInFiles";

export async function handleReplacements(
  targetDir: string,
  template: string,
  projectName: string,
  githubUser: string,
  website: string,
): Promise<void> {
  const { author, projectName: oldProjectName } = extractRepoInfo(template);

  const replacements = {
    [`${oldProjectName}.sadmn.com`]: website,
    [author]: githubUser,
    [oldProjectName]: projectName,
    ["skateshop.sadmn.com"]: website,
  };

  await replaceStringsInFiles(targetDir, replacements);
}
