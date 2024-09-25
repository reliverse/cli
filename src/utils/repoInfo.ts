// Utility to extract author and project name from template URL
export function extractRepoInfo(templateUrl: string): {
  author: string;
  projectName: string;
} {
  // Ensure the template URL has the correct github: prefix
  if (!templateUrl.startsWith("github:")) {
    templateUrl = `github:${templateUrl}`;
  }

  const match = /^github:([^/]+)\/([^/]+)$/.exec(templateUrl);

  if (!match) {
    throw new Error(`Invalid GitHub URL format: ${templateUrl}`);
  }

  const [, author, projectName] = match;

  return {
    author: author!, // Non-null assertion to assure TypeScript it's not undefined
    projectName: projectName!.replace(".git", ""), // Non-null assertion and removing .git if present
  };
}
