import { extractRepoInfo } from "~/utils/extractRepoInfo.js";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles.js";

export async function handleStringReplacements(
  targetDir: string,
  template: string,
  projectName: string,
  githubUser: string,
  website: string,
): Promise<void> {
  const { author, projectName: oldProjectName } = extractRepoInfo(template);

  const replacements = {
    [`${oldProjectName}.com`]: website,
    [author]: githubUser,
    [oldProjectName]: projectName,
    ["relivator.com"]: website,
  };

  await replaceStringsInFiles(targetDir, replacements);
}
