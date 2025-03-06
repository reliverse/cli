import type { Static } from "@sinclair/typebox";

import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import { Value } from "@sinclair/typebox/value";
import { parseJSONC } from "confbox";
import fs from "fs-extra";
import { ofetch } from "ofetch";
import path from "pathe";

import type { VSCodeRepoOption } from "~/app/menu/menu-impl.js";
import type { reliverseConfigSchema } from "~/libs/config/config-main.js";

import { cliHomeRepos, experimental, recommended } from "~/app/constants.js";

import { setHiddenAttributeOnWindows } from "./filesysHelpers.js";
import {
  DEFAULT_REPOS_CONFIG,
  type RepoInfo,
  type ReposConfig,
  reposSchema,
  generateReposJsonSchema,
  shouldRegenerateSchema,
} from "./schemaTemplate.js";

// ────────────────────────────────────────────────
// Type Definitions
// ────────────────────────────────────────────────

// Extract project template type from the config schema.
export type RepoFromSchema = NonNullable<
  Static<(typeof reliverseConfigSchema)["properties"]["projectTemplate"]>
>;

// Extract category type from the config schema.
export type CategoryFromSchema = NonNullable<
  Static<(typeof reliverseConfigSchema)["properties"]["projectCategory"]>
>;

export type CloneOrTemplateRepo = {
  id: RepoFromSchema;
  author: string;
  name: string;
  description: string;
  category: CategoryFromSchema;
};

export type RepoOption = CloneOrTemplateRepo["id"] | "unknown";

// ────────────────────────────────────────────────
// Repo Options
// ────────────────────────────────────────────────

export const REPO_TEMPLATES: CloneOrTemplateRepo[] = [
  {
    id: "blefnk/relivator",
    author: "blefnk",
    name: "relivator",
    description: "Full-featured e-commerce template with auth, payments, etc.",
    category: "website",
  },
  {
    id: "blefnk/next-react-ts-src-minimal",
    author: "blefnk",
    name: "next-react-ts-src-minimal",
    description: "Essentials only: minimal Next.js with TypeScript template",
    category: "website",
  },
  {
    id: "blefnk/all-in-one-nextjs-template",
    author: "blefnk",
    name: "all-in-one-nextjs-template",
    description:
      "Comprehensive Next.js eCommerce template with multiple features",
    category: "website",
  },
  {
    id: "blefnk/create-t3-app",
    author: "blefnk",
    name: "create-t3-app",
    description: "Type-safe Next.js template with tRPC, Drizzle, and Tailwind",
    category: "website",
  },
  {
    id: "blefnk/create-next-app",
    author: "blefnk",
    name: "create-next-app",
    description: "Basic Next.js starter template",
    category: "website",
  },
  {
    id: "blefnk/astro-starlight-template",
    author: "blefnk",
    name: "astro-starlight-template",
    description: "Documentation site template using Astro and Starlight",
    category: "website",
  },
  {
    id: "blefnk/versator",
    author: "blefnk",
    name: "versator",
    description: "Versatile Next.js template for various use cases",
    category: "website",
  },
  {
    id: "microsoft/vscode-extension-samples",
    author: "microsoft",
    name: "vscode-extension-samples",
    description: "Official VS Code extension samples",
    category: "vscode",
  },
  {
    id: "microsoft/vscode-extension-template",
    author: "microsoft",
    name: "vscode-extension-template",
    description: "Basic VS Code extension template",
    category: "vscode",
  },
  {
    id: "reliverse/template-browser-extension",
    author: "reliverse",
    name: "repo-browser-extension",
    description: "Browser extension starter template",
    category: "browser",
  },
  {
    id: "blefnk/relivator-docker-template",
    author: "blefnk",
    name: "relivator-docker-template",
    description: "Relivator template with Docker",
    category: "website",
  },
];

// ────────────────────────────────────────────────
// Repos Config Utilities
// ────────────────────────────────────────────────

async function getReposConfigPath(): Promise<string> {
  await fs.ensureDir(cliHomeRepos);

  // Regenerate schema if required.
  if (await shouldRegenerateSchema()) {
    await generateReposJsonSchema();
  }

  return path.join(cliHomeRepos, "repos.json");
}

async function readReposConfig(): Promise<ReposConfig> {
  const configPath = await getReposConfigPath();
  if (!(await fs.pathExists(configPath))) {
    return DEFAULT_REPOS_CONFIG;
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parseJSONC(content);
    if (Value.Check(reposSchema, parsed)) {
      return parsed;
    }
  } catch (error) {
    relinka("warn", "Failed to parse repos.json:", String(error));
  }
  return DEFAULT_REPOS_CONFIG;
}

async function writeReposConfig(config: ReposConfig): Promise<void> {
  const configPath = await getReposConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function getRepoInfo(repoId: string): Promise<RepoInfo | null> {
  const config = await readReposConfig();
  return config.repos.find((t) => t.id === repoId) ?? null;
}

// ────────────────────────────────────────────────
// Fetch Repository Data from UNGH API
// ────────────────────────────────────────────────

type UnghRepoResponse = {
  repo: {
    stars: number;
    forks: number;
    watchers: number;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    defaultBranch: string;
  };
};

async function fetchRepoData(
  owner: string,
  name: string,
): Promise<UnghRepoResponse["repo"] | null> {
  const url = `https://ungh.cc/repos/${owner}/${name}`;
  try {
    // ofetch with generic will automatically parse json using destr
    const data = await ofetch<UnghRepoResponse>(url);
    return data.repo;
  } catch (error) {
    relinka("warn", "Failed to fetch repo info from ungh:", String(error));
    return null;
  }
}

// ────────────────────────────────────────────────
// Save Repository to Local Device
// ────────────────────────────────────────────────

export async function saveRepoToDevice(
  repo: CloneOrTemplateRepo,
  projectPath: string,
): Promise<void> {
  try {
    // Build destination path
    const repoSavePath = path.join(cliHomeRepos, repo.author, repo.name);
    await fs.ensureDir(path.dirname(repoSavePath));
    await fs.copy(projectPath, repoSavePath);

    // Set the .git folder hidden on Windows
    const gitFolderPath = path.join(repoSavePath, ".git");
    await setHiddenAttributeOnWindows(gitFolderPath);

    // Validate repo ID format
    const [owner, repoName] = repo.id.split("/");
    if (!owner || !repoName) {
      throw new Error(`Invalid repo ID format: ${repo.id}`);
    }
    const repoData = await fetchRepoData(owner, repoName);

    // Construct repository info object
    const repoInfo: RepoInfo = {
      id: repo.id,
      author: repo.author,
      name: repo.name,
      description: repo.description,
      category: repo.category,
      lastUpdated: new Date().toISOString(),
      localPath: repoSavePath,
      github: repoData
        ? {
            stars: repoData.stars,
            forks: repoData.forks,
            watchers: repoData.watchers,
            createdAt: repoData.createdAt,
            updatedAt: repoData.updatedAt,
            pushedAt: repoData.pushedAt,
            defaultBranch: repoData.defaultBranch,
          }
        : {
            stars: 0,
            forks: 0,
            watchers: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pushedAt: new Date().toISOString(),
            defaultBranch: "main",
          },
    };

    const config = await readReposConfig();
    const existingIndex = config.repos.findIndex((t) => t.id === repo.id);
    if (existingIndex >= 0) {
      config.repos[existingIndex] = repoInfo;
    } else {
      config.repos.push(repoInfo);
    }
    await writeReposConfig(config);
  } catch (error) {
    relinka("error", "Failed to save repo:", String(error));
    throw error;
  }
}

// ────────────────────────────────────────────────
// Template Options for CLI Prompts
// ────────────────────────────────────────────────

export const TEMP_FULLSTACK_WEBSITE_TEMPLATE_OPTIONS = {
  "blefnk/relivator": {
    label: `Relivator ${recommended}`,
    value: "blefnk/relivator",
    hint: re.dim("Full-featured e-commerce repo with auth, payments, etc."),
  },
  "blefnk/next-react-ts-src-minimal": {
    label: `Next.js Only ${experimental}`,
    value: "blefnk/next-react-ts-src-minimal",
    hint: re.dim("Essentials only: minimal Next.js with TypeScript repo"),
  },
} as const satisfies Partial<
  Record<RepoOption, { label: string; value: RepoOption; hint: string }>
>;

export const TEMP_SEPARATED_WEBSITE_TEMPLATE_OPTIONS = {
  "blefnk/relivator-docker-repo": {
    label: `${experimental} Relivator Docker Repo`,
    value: "blefnk/relivator-docker-repo",
    hint: re.dim("Separated frontend and backend"),
  },
};

export const TEMP_VSCODE_TEMPLATE_OPTIONS = {
  "microsoft/vscode-extension-samples": {
    label: "VS Code Extension Sample",
    value: "microsoft/vscode-extension-samples",
    hint: re.dim("Official VS Code extension samples"),
  },
  "microsoft/vscode-extension-template": {
    label: "VS Code Extension Template",
    value: "microsoft/vscode-extension-template",
    hint: re.dim("Basic VS Code extension template"),
  },
} as const satisfies Record<
  Exclude<VSCodeRepoOption, "unknown">,
  { label: string; value: VSCodeRepoOption; hint: string }
>;

export const TEMP_BROWSER_TEMPLATE_OPTIONS = {
  "reliverse/repo-browser-extension": {
    label: "Browser Extension Repo",
    value: "reliverse/repo-browser-extension",
    hint: re.dim("Browser extension starter repo"),
  },
};
