import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import pc from "picocolors";

import { DEFAULT_APP_NAME, REPO_URLS } from "~/app/db/constants.js";
import { type ReliverseConfig, type TemplateOption } from "~/types.js";
import { relinka } from "~/utils/console.js";

import type { CliResults } from "./show-composer-mode/opts.js";

import {
  randomProjectFrameworkTitle,
  randomInitialMessage,
  randomWebsiteCategoryTitle,
  randomWebsiteDetailsTitle,
} from "../db/messages.js";
import { createWebProject } from "./createWebProject.js";
import { showComposerMode } from "./show-composer-mode/mod.js";

const TEMPLATE_OPTIONS = {
  "blefnk/relivator": {
    label: "Relivator",
    value: "blefnk/relivator",
    hint: pc.dim("Full-featured e-commerce template with auth, payments, etc."),
  },
  "blefnk/next-react-ts-src-minimal": {
    label: "Next.js Only",
    value: "blefnk/next-react-ts-src-minimal",
    hint: pc.dim("Essentials only: minimal Next.js with TypeScript template"),
  },
} as const;

const VSCODE_TEMPLATE_OPTIONS = {
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
} as const;

async function configureVSCodeExtension() {
  const extensionConfig = {
    displayName: await inputPrompt({
      title: "What's the display name of your extension?",
      defaultValue: "My Extension",
      validate: (value: string): string | boolean => {
        if (!value?.trim()) {
          return "Display name is required";
        }
        return true;
      },
    }),
    description: await inputPrompt({
      title: "Provide a short description of your extension",
      defaultValue: "A VS Code extension",
      validate: (value: string): string | boolean => {
        if (!value?.trim()) {
          return "Description is required";
        }
        return true;
      },
    }),
    features: await multiselectPrompt({
      title: "What kind of features will your extension include?",
      options: [
        {
          label: "Commands",
          value: "commands",
          hint: pc.dim("Add custom commands to VS Code"),
        },
        {
          label: "WebView",
          value: "webview",
          hint: pc.dim("Create custom UI panels"),
        },
        {
          label: "Language Support",
          value: "language",
          hint: pc.dim("Add support for a programming language"),
        },
        {
          label: "Themes",
          value: "themes",
          hint: pc.dim("Create custom color themes"),
        },
      ],
    }),
    activation: await selectPrompt({
      title: "When should your extension activate?",
      options: [
        {
          label: "On Command",
          value: "onCommand",
          hint: pc.dim("Activate when a specific command is run"),
        },
        {
          label: "On Language",
          value: "onLanguage",
          hint: pc.dim("Activate for specific file types"),
        },
        {
          label: "On Startup",
          value: "startup",
          hint: pc.dim("Activate when VS Code starts"),
        },
      ],
    }),
    publisher: await inputPrompt({
      title: "What's your VS Code marketplace publisher ID?",
      content: "Create one at https://marketplace.visualstudio.com/manage",
      validate: (value: string): string | boolean => {
        if (!value?.trim()) {
          return "Publisher ID is required";
        }
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(value)) {
          return "Invalid publisher ID format";
        }
        return true;
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
    "📚 Check the docs to learn more: https://docs.reliverse.org";
  const initialMessage =
    randomInitialMessage[
      Math.floor(Math.random() * randomInitialMessage.length)
    ]!;

  await selectPrompt({
    endTitle,
    title: initialMessage,
    options: [
      {
        label: "Development",
        value: "development",
        hint: pc.dim("apps, sites, plugins, etc"),
      },
      {
        label: "...",
        hint: pc.dim("coming soon"),
        value: "coming-soon",
        disabled: true,
      },
    ],
  });

  // Get project type
  const projectType = await selectPrompt({
    endTitle,
    title: "What kind of project would you like to create?",
    options: [
      {
        label: "Web Application",
        value: "web",
        hint: pc.dim("Create a web application with Next.js"),
      },
      {
        label: "VS Code Extension",
        value: "vscode",
        hint: pc.dim("Create a VS Code extension"),
      },
      { separator: true },
      {
        label: "More types of projects and frameworks coming soon",
        hint: "❤️ ",
        value: "coming-soon",
        disabled: true,
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
      template: REPO_URLS[template as TemplateOption] ?? template,
      message: initialMessage,
      mode: "buildBrandNewThing",
      i18nShouldBeEnabled: false,
      isDev,
      ...(config && {
        config: {
          ...config,
          experimental: {
            ...config.experimental,
            projectDisplayName: extensionConfig.displayName,
            projectDescription: extensionConfig.description,
            features: {
              commands: extensionConfig.features.includes("commands")
                ? ["*"]
                : [],
              webview: extensionConfig.features.includes("webview")
                ? ["*"]
                : [],
              language: extensionConfig.features.includes("language")
                ? ["*"]
                : [],
              themes: extensionConfig.features.includes("themes") ? ["*"] : [],
              i18n: false,
              analytics: false,
              themeMode: "dark-light",
              authentication: false,
              api: false,
              database: false,
              testing: false,
              docker: false,
              ci: false,
            },
            projectActivation: extensionConfig.activation,
            projectAuthor: extensionConfig.publisher,
          },
        },
      }),
    });
    return;
  }

  // Get projectFramework from config or prompt for web applications
  let projectFramework = config?.experimental?.projectFramework;
  if (!projectFramework) {
    const result = await selectPrompt({
      endTitle,
      title:
        randomProjectFrameworkTitle[
          Math.floor(Math.random() * randomProjectFrameworkTitle.length)
        ]!,
      options: [
        {
          label: "Next.js",
          value: "nextjs",
          hint: pc.dim("recommended for most projects"),
        },
        {
          label: "...",
          hint: pc.dim("coming soon"),
          value: "coming-soon",
          disabled: true,
        },
      ],
    });
    if (result !== "nextjs") {
      relinka("error", "Invalid projectFramework selected");
      return;
    }
    projectFramework = result;
  }

  // Should cli continue with recommended or offline mode?
  const shouldContinueWithRecommended = await selectPrompt({
    endTitle,
    title: "Should I continue with advanced or simple mode?",
    options: [
      {
        label: "Advanced",
        value: "recommended",
        hint: pc.greenBright("✨ recommended"),
      },
      {
        label: "Simple",
        value: "offline",
        hint: pc.redBright("🚨 experimental, offline"),
      },
    ],
  });

  if (shouldContinueWithRecommended === "offline") {
    const cliResults: CliResults = {
      appName: DEFAULT_APP_NAME,
      packages: [],
      flags: {
        noGit: false,
        noInstall: false,
        default: false,
        importAlias: "",
        framework: true,
        CI: false,
        tailwind: false,
        trpc: false,
        prisma: false,
        drizzle: false,
        nextAuth: false,
        dbProvider: "postgres",
      },
      databaseProvider: "postgres",
    };
    await showComposerMode(cliResults);
    return;
  } else {
    await selectPrompt({
      endTitle,
      title:
        randomWebsiteCategoryTitle[
          Math.floor(Math.random() * randomWebsiteCategoryTitle.length)
        ]!,
      options: [
        { label: "E-commerce", value: "e-commerce" },
        {
          label: "...",
          hint: pc.dim("coming soon"),
          value: "coming-soon",
          disabled: true,
        },
      ],
    });

    // Get template from config or prompt
    let template: TemplateOption;
    if (config?.experimental?.projectTemplate) {
      template = config.experimental.projectTemplate;
    } else {
      const result = await selectPrompt({
        endTitle,
        title: "Which template would you like to use?",
        options: Object.values(TEMPLATE_OPTIONS),
      });
      template = result as TemplateOption;
    }

    await createWebProject({
      template: REPO_URLS[template] ?? template,
      message:
        randomWebsiteDetailsTitle[
          Math.floor(Math.random() * randomWebsiteDetailsTitle.length)
        ]!,
      mode: "buildBrandNewThing",
      i18nShouldBeEnabled: config?.experimental?.i18nBehavior === "prompt",
      isDev,
      ...(config && { config }),
    });
  }
}
