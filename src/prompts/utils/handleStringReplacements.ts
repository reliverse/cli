import { extractRepoInfo } from "~/prompts/utils/extractRepoInfo";
import { replaceStringsInFiles } from "~/prompts/utils/replaceStringsInFiles";

export async function handleStringReplacements(
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
    ["relivator.com"]: website,
  };

  await replaceStringsInFiles(targetDir, replacements);
}
