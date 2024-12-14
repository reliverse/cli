import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";

import type { ReliverseConfig, TemplateOption } from "~/types/config.js";

import { REPO_URLS } from "~/app/data/constants.js";
import { relinka } from "~/utils/console.js";

import {
  randomFrameworkTitle,
  randomInitialMessage,
  randomWebsiteCategoryTitle,
  randomWebsiteDetailsTitle,
} from "../data/messages.js";
import { createWebProject } from "./createWebProject.js";

const TEMPLATE_OPTIONS = {
  "blefnk/relivator": {
    label: "Relivator",
    value: "blefnk/relivator",
    hint: "Full-featured e-commerce template with auth, payments, etc.",
  },
  "blefnk/next-react-ts-src-minimal": {
    label: "Next.js Minimal",
    value: "blefnk/next-react-ts-src-minimal",
    hint: "Minimal Next.js + React + TypeScript template",
  },
} as const;

const VSCODE_TEMPLATE_OPTIONS = {
  "microsoft/vscode-extension-samples": {
    label: "VS Code Extension Sample",
    value: "microsoft/vscode-extension-samples",
    hint: "Official VS Code extension samples",
  },
  "microsoft/vscode-extension-template": {
    label: "VS Code Extension Template",
    value: "microsoft/vscode-extension-template",
    hint: "Basic VS Code extension template",
  },
} as const;

async function configureVSCodeExtension() {
  const extensionConfig = {
    displayName: await inputPrompt({
      title: "What's the display name of your extension?",
      defaultValue: "My Extension",
      validate: (value) => {
        if (!value?.trim()) {
          return "Display name is required";
        }
      },
    }),
    description: await inputPrompt({
      title: "Provide a short description of your extension",
      defaultValue: "A VS Code extension",
      validate: (value) => {
        if (!value?.trim()) {
          return "Description is required";
        }
      },
    }),
    features: await multiselectPrompt({
      title: "What type of features will your extension include?",
      options: [
        {
          label: "Commands",
          value: "commands",
          hint: "Add custom commands to VS Code",
        },
        {
          label: "WebView",
          value: "webview",
          hint: "Create custom UI panels",
        },
        {
          label: "Language Support",
          value: "language",
          hint: "Add support for a programming language",
        },
        {
          label: "Themes",
          value: "themes",
          hint: "Create custom color themes",
        },
      ],
    }),
    activation: await selectPrompt({
      title: "When should your extension activate?",
      options: [
        {
          label: "On Command",
          value: "onCommand",
          hint: "Activate when a specific command is run",
        },
        {
          label: "On Language",
          value: "onLanguage",
          hint: "Activate for specific file types",
        },
        {
          label: "On Startup",
          value: "startup",
          hint: "Activate when VS Code starts",
        },
      ],
    }),
    publisher: await inputPrompt({
      title: "What's your VS Code marketplace publisher ID?",
      content: "Create one at https://marketplace.visualstudio.com/manage",
      validate: (value) => {
        if (!value?.trim()) {
          return "Publisher ID is required";
        }
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(value)) {
          return "Invalid publisher ID format";
        }
      },
    }),
  };

  return extensionConfig;
}

export async function buildBrandNewThing(
  isDev: boolean,
  config?: ReliverseConfig,
): Promise<void> {
  const endTitle =
    "📚 Check the docs to learn more: https://docs.reliverse.org/reliverse/cli";
  const initialMessage =
    randomInitialMessage[
      Math.floor(Math.random() * randomInitialMessage.length)
    ];

  await selectPrompt({
    endTitle,
    title: initialMessage,
    options: [
      {
        label: "Development",
        value: "development",
        hint: "apps, sites, plugins, etc",
      },
      {
        label: "...",
        hint: "coming soon",
        value: "coming-soon",
        disabled: true,
      },
    ],
  });

  // Get project type
  const projectType = await selectPrompt({
    endTitle,
    title: "What type of project would you like to create?",
    options: [
      {
        label: "Web Application",
        value: "web",
        hint: "Create a web application with Next.js",
      },
      {
        label: "VS Code Extension",
        value: "vscode",
        hint: "Create a VS Code extension",
      },
    ],
  });

  if (projectType === "vscode") {
    const template = await selectPrompt({
      endTitle,
      title: "Which VS Code extension template would you like to use?",
      options: Object.values(VSCODE_TEMPLATE_OPTIONS),
    });

    const extensionConfig = await configureVSCodeExtension();

    await createWebProject({
      template: REPO_URLS[template as TemplateOption] || template,
      message: initialMessage,
      mode: "buildBrandNewThing",
      allowI18nPrompt: false,
      isDev,
      config: {
        ...config,
        vscodeExtension: extensionConfig,
      },
    });
    return;
  }

  // Get framework from config or prompt for web applications
  let framework = config?.defaultFramework;
  if (!framework) {
    const result = await selectPrompt({
      endTitle,
      title:
        randomFrameworkTitle[
          Math.floor(Math.random() * randomFrameworkTitle.length)
        ],
      options: [
        {
          label: "Next.js",
          value: "nextjs",
          hint: "recommended for most projects",
        },
        {
          label: "...",
          hint: "coming soon",
          value: "coming-soon",
          disabled: true,
        },
      ],
    });
    if (result !== "nextjs") {
      relinka("error", "Invalid framework selected");
      return;
    }
    framework = result;
  }

  await selectPrompt({
    endTitle,
    title:
      randomWebsiteCategoryTitle[
        Math.floor(Math.random() * randomWebsiteCategoryTitle.length)
      ],
    options: [
      { label: "E-commerce", value: "e-commerce" },
      {
        label: "...",
        hint: "coming soon",
        value: "coming-soon",
        disabled: true,
      },
    ],
  });

  // Get template from config or prompt
  let template: TemplateOption;
  if (config?.defaultTemplate) {
    template = config.defaultTemplate;
  } else {
    const result = await selectPrompt({
      endTitle,
      title: "Which template would you like to use?",
      options: Object.values(TEMPLATE_OPTIONS),
    });
    template = result as TemplateOption;
  }

  await createWebProject({
    template: REPO_URLS[template],
    message:
      randomWebsiteDetailsTitle[
        Math.floor(Math.random() * randomWebsiteDetailsTitle.length)
      ],
    mode: "buildBrandNewThing",
    allowI18nPrompt: config?.shouldUseI18n ?? true,
    isDev,
    config,
  });
}
