import { extractRepoInfo } from "~/utils/extractRepoInfo";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles";

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
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    ["relivator.com"]: website,
  };

  await replaceStringsInFiles(targetDir, replacements);
}
