import type { Static } from "@sinclair/typebox";

import { re } from "@reliverse/relico";
import { relinka } from "@reliverse/relinka";
import { Value } from "@sinclair/typebox/value";
import { parseJSONC } from "confbox";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import type { VSCodeTemplateOption } from "~/app/menu/menu-impl.js";

import { experimental, recommended } from "~/app/constants.js";

import type { reliverseConfigSchema } from "./schemaConfig.js";

import { setHiddenAttributeOnWindows } from "./filesysHelpers.js";
import {
  DEFAULT_TEMPLATES_CONFIG,
  type TemplateInfo,
  type TemplatesConfig,
  templatesSchema,
  generateTemplatesJsonSchema,
  shouldRegenerateSchema,
} from "./schemaTemplate.js";

// Extract the template type from the schema
export type TemplateFromSchema = NonNullable<
  Static<(typeof reliverseConfigSchema)["properties"]["projectTemplate"]>
>;

// Extract the category type from the schema
export type CategoryFromSchema = NonNullable<
  Static<(typeof reliverseConfigSchema)["properties"]["projectCategory"]>
>;

export type Template = {
  id: TemplateFromSchema;
  author: string;
  name: string;
  description: string;
  category: CategoryFromSchema;
};

export const TEMPLATES: Template[] = [
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
    description: "Type-safe Next.js template with tRPC, Prisma, and Tailwind",
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
    name: "template-browser-extension",
    description: "Browser extension starter template",
    category: "browser",
  },
  {
    id: "blefnk/relivator-docker-template",
    author: "blefnk",
    name: "relivator-docker-template",
    description: "Relivator template with Docker, PostgreSQL, and Redis",
    category: "website",
  },
];

export type TemplateOption = Template["id"] | "unknown";

async function getTemplatesConfigPath(): Promise<string> {
  const templatesPath = path.join(os.homedir(), ".reliverse", "templates");
  await fs.ensureDir(templatesPath);

  // Check if schema needs to be regenerated based on CLI version
  if (await shouldRegenerateSchema()) {
    await generateTemplatesJsonSchema();
  }

  return path.join(templatesPath, "templates.json");
}

async function readTemplatesConfig(): Promise<TemplatesConfig> {
  const configPath = await getTemplatesConfigPath();

  if (!(await fs.pathExists(configPath))) {
    return DEFAULT_TEMPLATES_CONFIG;
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parseJSONC(content);

    if (Value.Check(templatesSchema, parsed)) {
      return parsed;
    }
  } catch (error) {
    relinka("warn", "Failed to parse templates.json:", String(error));
  }

  return DEFAULT_TEMPLATES_CONFIG;
}

async function writeTemplatesConfig(config: TemplatesConfig): Promise<void> {
  const configPath = await getTemplatesConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function getTemplateInfo(
  templateId: string,
): Promise<TemplateInfo | null> {
  const config = await readTemplatesConfig();
  return config.templates.find((t) => t.id === templateId) ?? null;
}

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

async function fetchRepoInfo(owner: string, name: string) {
  try {
    const response = await fetch(`https://ungh.cc/repos/${owner}/${name}`);
    const data = (await response.json()) as UnghRepoResponse;
    return data.repo;
  } catch (error) {
    relinka("warn", "Failed to fetch repo info from ungh:", String(error));
    return null;
  }
}

export async function saveTemplateToDevice(
  template: Template,
  projectPath: string,
) {
  try {
    const templateSavePath = path.join(
      os.homedir(),
      ".reliverse",
      "templates",
      template.author,
      template.name,
    );
    await fs.ensureDir(path.dirname(templateSavePath));
    await fs.copy(projectPath, templateSavePath);

    // Set hidden attribute for .git folder on Windows
    const gitFolderPath = path.join(templateSavePath, ".git");
    await setHiddenAttributeOnWindows(gitFolderPath);

    // Get GitHub repository information
    const [owner, repo] = template.id.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid template ID format: ${template.id}`);
    }
    const repoInfo = await fetchRepoInfo(owner, repo);

    // Save template info
    const templateInfo: TemplateInfo = {
      id: template.id,
      author: template.author,
      name: template.name,
      description: template.description,
      category: template.category,
      lastUpdated: new Date().toISOString(),
      localPath: templateSavePath,
      github: repoInfo
        ? {
            stars: repoInfo.stars,
            forks: repoInfo.forks,
            watchers: repoInfo.watchers,
            createdAt: repoInfo.createdAt,
            updatedAt: repoInfo.updatedAt,
            pushedAt: repoInfo.pushedAt,
            defaultBranch: repoInfo.defaultBranch,
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

    const config = await readTemplatesConfig();
    const existingIndex = config.templates.findIndex(
      (t) => t.id === template.id,
    );

    if (existingIndex >= 0) {
      config.templates[existingIndex] = templateInfo;
    } else {
      config.templates.push(templateInfo);
    }

    await writeTemplatesConfig(config);
  } catch (error) {
    relinka("error", "Failed to save template:", String(error));
    throw error;
  }
}

export const TEMP_FULLSTACK_WEBSITE_TEMPLATE_OPTIONS = {
  "blefnk/relivator": {
    label: `Relivator ${recommended}`,
    value: "blefnk/relivator",
    hint: re.dim("Full-featured e-commerce template with auth, payments, etc."),
  },
  "blefnk/next-react-ts-src-minimal": {
    label: `Next.js Only ${experimental}`,
    value: "blefnk/next-react-ts-src-minimal",
    hint: re.dim("Essentials only: minimal Next.js with TypeScript template"),
  },
} as const satisfies Partial<
  Record<TemplateOption, { label: string; value: TemplateOption; hint: string }>
>;

export const TEMP_SEPARATED_WEBSITE_TEMPLATE_OPTIONS = {
  "blefnk/relivator-docker-template": {
    label: `${experimental} Relivator Docker Template`,
    value: "blefnk/relivator-docker-template",
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
  Exclude<VSCodeTemplateOption, "unknown">,
  { label: string; value: VSCodeTemplateOption; hint: string }
>;

export const TEMP_BROWSER_TEMPLATE_OPTIONS = {
  "reliverse/template-browser-extension": {
    label: "Browser Extension Template",
    value: "reliverse/template-browser-extension",
    hint: re.dim("Browser extension starter template"),
  },
};
