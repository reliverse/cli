import { re } from "@reliverse/relico";
import path from "pathe";
import { fileURLToPath } from "url";

export const cliVersion = "1.4.55";
export const cliName = "@reliverse/cli";
export const cliDomain = "https://docs.reliverse.org";

export const useLocalhost = false;
export const isVerboseEnabled = false;

export const DEFAULT_CLI_USERNAME = "johnny911";

export const endTitle =
  "📚 Check the docs to learn more: https://docs.reliverse.org";

export const recommended = re.green("🚀 Recommended");
export const experimental = re.red("🚨 Experimental");

export const UNKNOWN_VALUE = "unknown";
export const DEFAULT_DOMAIN = "https://example.com";
export const RELIVERSE_SCHEMA_DEV = "./schema.json";
export const RELIVERSE_SCHEMA_URL = "https://reliverse.org/schema.json";

export const RELIVERSE_TEMPLATES = {
  relivator: "blefnk/relivator",
  nextReactTsSrcMinimal: "blefnk/next-react-ts-src-minimal",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PKG_ROOT = path.resolve(__dirname, "../../../..");

export const FALLBACK_ENV_EXAMPLE_URL =
  "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";

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
  "blefnk/relivator": "blefnk/relivator",
  "blefnk/next-react-ts-src-minimal": "blefnk/next-react-ts-src-minimal",
  "microsoft/vscode-extension-samples": "microsoft/vscode-extension-samples",
  "microsoft/vscode-extension-template": "microsoft/vscode-extension-template",
} as const;

export const MEMORY_FILE = ".reliverse/reliverse.db";
export const DEFAULT_APP_NAME = "my-reliverse-app";
export const CREATE_RELIVERSE_APP = "reliverse";

// Configuration file categories for generation
export const CONFIG_CATEGORIES = {
  core: [".reliverse", ".reliverse"],
  linting: ["biome.json"],
  ide: [".vscode/settings.json"],
  git: [".gitignore"],
} as const;

// Get full URL from short name
export function getRepoUrl(shortName: keyof typeof REPO_URLS): string {
  return `https://github.com/${REPO_URLS[shortName]}`;
}
