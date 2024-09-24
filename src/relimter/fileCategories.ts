// fileCategories.ts
export const fileCategories: Record<string, string[]> = {
  "eslint, biome, putout": ["eslint.config.js", "biome.json", ".putout.json"],
  GitHub: [".github", "README.md"],
  IDE: [".vscode"],
  "Reliverse configs": ["reliverse.config.ts", "reliverse.info.ts"],
};

export const GITHUB_REPO_URL =
  "https://github.com/blefnk/relivator-nextjs-template.git";

export const TEMP_GITHUB_REPO_NAME = "blefnk/relivator";

export const TEMP_CLONE_DIR = "temp-repo-clone";
