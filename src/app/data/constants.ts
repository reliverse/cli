export const isVerboseEnabled = false;

// File conflict settings, useful for prompting user to resolve conflicts during project setup
export const FILE_CONFLICTS = [
  {
    description: "ESLint config",
    fileName: ".eslintrc.cjs",
    shouldCopy: false, // Deprecated file, don't copy
  },
  {
    customMessage:
      "Biome will be installed, so Prettier is not necessary. What would you like to do?",
    description: "Prettier config",
    fileName: "prettier.config.js",
  },
];

export const REPO_URLS = {
  "blefnk/relivator": "https://github.com/blefnk/relivator",
  "blefnk/next-react-ts-src-minimal":
    "https://github.com/blefnk/next-react-ts-src-minimal",
  "microsoft/vscode-extension-samples":
    "https://github.com/microsoft/vscode-extension-samples",
  "microsoft/vscode-extension-template":
    "https://github.com/microsoft/vscode-extension-template",
} as const;

export const MEMORY_FILE = ".reliverse/.reliverse";

// Path settings for important files and directories
export const FILE_PATHS = {
  layoutFile: "src/app/layout.tsx", // Path to layout file in the repo
  pageFile: "src/app/page.tsx", // Path to page file in the repo
};

// Files required for i18n setup
export const FILES_TO_DOWNLOAD = [FILE_PATHS.layoutFile, FILE_PATHS.pageFile];

// File categories used in conflict resolution or file download operations
// todo: figure out the better approach to get the files
// todo: instead of just getting them from the template repo
export const fileCategories: Record<string, string[]> = {
  biome: ["biome.json"],
  eslint: [".eslintrc.cjs", "eslint.config.js"],
  GitHub: [".github", "README.md"],
  IDE: [".vscode"],
};

// Get full URL from short name
export function getRepoUrl(shortName: keyof typeof REPO_URLS): string {
  return REPO_URLS[shortName];
}
