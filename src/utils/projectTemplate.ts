import type { Static } from "@sinclair/typebox";

import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";
import pc from "picocolors";

import type { VSCodeTemplateOption } from "~/app/menu/menu-mod.js";

import { experimental, recommended } from "~/app/constants.js";

import type { reliverseConfigSchema } from "./reliverseSchema.js";

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
    category: "webapp",
  },
  {
    id: "blefnk/next-react-ts-src-minimal",
    author: "blefnk",
    name: "next-react-ts-src-minimal",
    description: "Essentials only: minimal Next.js with TypeScript template",
    category: "webapp",
  },
  {
    id: "blefnk/all-in-one-nextjs-template",
    author: "blefnk",
    name: "all-in-one-nextjs-template",
    description: "Comprehensive Next.js template with multiple features",
    category: "webapp",
  },
  {
    id: "blefnk/create-t3-app",
    author: "blefnk",
    name: "create-t3-app",
    description: "Type-safe Next.js template with tRPC, Prisma, and Tailwind",
    category: "webapp",
  },
  {
    id: "blefnk/create-next-app",
    author: "blefnk",
    name: "create-next-app",
    description: "Basic Next.js starter template",
    category: "webapp",
  },
  {
    id: "blefnk/astro-starlight-template",
    author: "blefnk",
    name: "astro-starlight-template",
    description: "Documentation site template using Astro and Starlight",
    category: "webapp",
  },
  {
    id: "blefnk/versator",
    author: "blefnk",
    name: "versator",
    description: "Versatile Next.js template for various use cases",
    category: "webapp",
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
];

export type TemplateOption = Template["id"];

export async function saveTemplateToDevice(
  template: Template,
  projectPath: string,
) {
  try {
    const templateSavePath = path.join(
      os.homedir(),
      ".reliverse",
      template.author,
      template.name,
    );
    await fs.ensureDir(path.dirname(templateSavePath));
    await fs.copy(projectPath, templateSavePath);
  } catch (error) {
    relinka("error", "Failed to save template:", String(error));
    throw error;
  }
}

export const TEMP_WEBAPP_TEMPLATE_OPTIONS = {
  "blefnk/relivator": {
    label: `Relivator ${recommended}`,
    value: "blefnk/relivator",
    hint: pc.dim("Full-featured e-commerce template with auth, payments, etc."),
  },
  "blefnk/next-react-ts-src-minimal": {
    label: `Next.js Only ${experimental}`,
    value: "blefnk/next-react-ts-src-minimal",
    hint: pc.dim("Essentials only: minimal Next.js with TypeScript template"),
  },
} as const satisfies Partial<
  Record<TemplateOption, { label: string; value: TemplateOption; hint: string }>
>;

export const TEMP_VSCODE_TEMPLATE_OPTIONS = {
  "microsoft/vscode-extension-samples": {
    label: "VS Code Extension Sample",
    value: "microsoft/vscode-extension-samples",
    hint: pc.dim("Official VS Code extension samples"),
  },
  "microsoft/vscode-extension-template": {
    label: "VS Code Extension Template",
    value: "microsoft/vscode-extension-template",
    hint: pc.dim("Basic VS Code extension template"),
  },
} as const satisfies Record<
  Exclude<VSCodeTemplateOption, "coming-soon">,
  { label: string; value: VSCodeTemplateOption; hint: string }
>;

export const TEMP_BROWSER_TEMPLATE_OPTIONS = {
  "reliverse/template-browser-extension": {
    label: "Browser Extension Template",
    value: "reliverse/template-browser-extension",
    hint: pc.dim("Browser extension starter template"),
  },
};
