import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import pc from "picocolors";

import type { CliResults } from "~/app/menu/create-project/cp-modules/use-composer-mode/opts.js";

import {
  DEFAULT_APP_NAME,
  experimental,
  recommended,
} from "~/app/db/constants.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { showComposerMode } from "~/app/menu/create-project/cp-modules/use-composer-mode/mod.js";
import {
  type ReliverseConfig,
  type ReliverseMemory,
  type TemplateOption,
} from "~/types.js";

import {
  randomProjectFrameworkTitle,
  randomInitialMessage,
  randomWebsiteCategoryTitle,
  randomWebsiteDetailsTitle,
} from "../db/messages.js";
import { createWebProject } from "./create-project/cp-mod.js";

const TEMPLATE_OPTIONS = {
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

type VSCodeTemplateOption =
  | "microsoft/vscode-extension-samples"
  | "microsoft/vscode-extension-template"
  | "coming-soon";

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
} as const satisfies Record<
  Exclude<VSCodeTemplateOption, "coming-soon">,
  { label: string; value: VSCodeTemplateOption; hint: string }
>;

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
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  config: ReliverseConfig,
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
        label: pc.italic(
          pc.dim("More types of projects and frameworks coming soon 🦾"),
        ),
        value: "coming-soon",
        disabled: true,
      },
    ],
  });

  if (projectType === "vscode") {
    const template = (await selectPrompt({
      endTitle,
      title: "Which VS Code extension template would you like to use?",
      options: [
        ...Object.values(VSCODE_TEMPLATE_OPTIONS),
        { separator: true },
        {
          label: pc.italic(pc.dim("More templates coming soon")),
          value: "coming-soon",
          disabled: true,
        },
      ],
    })) as VSCodeTemplateOption;

    const extensionConfig = await configureVSCodeExtension();

    await createWebProject({
      webProjectTemplate: template as Exclude<
        VSCodeTemplateOption,
        "coming-soon"
      >,
      message: initialMessage,
      mode: "buildBrandNewThing",
      i18nShouldBeEnabled: true,
      isDev,
      config: config ?? {
        experimental: {
          projectDisplayName: extensionConfig.displayName,
          projectDescription: extensionConfig.description,
          features: {
            commands: extensionConfig.features.includes("commands")
              ? ["*"]
              : [],
            webview: extensionConfig.features.includes("webview") ? ["*"] : [],
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
      memory,
      cwd,
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
        label: pc.bold(pc.greenBright("Advanced")),
        value: "recommended",
        hint: pc.greenBright(pc.reset("✨ STABLE & RECOMMENDED")),
      },
      {
        label: pc.dim(pc.red("Simple")),
        value: "offline",
        hint: pc.red("🚨 experimental, offline"),
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
        options: [
          ...Object.values(TEMPLATE_OPTIONS),
          { separator: true },
          {
            label: pc.italic(pc.dim("More templates coming soon")),
            value: "coming-soon",
            disabled: true,
          },
        ],
      });
      template = result as TemplateOption;
    }

    await createWebProject({
      webProjectTemplate: template,
      message:
        randomWebsiteDetailsTitle[
          Math.floor(Math.random() * randomWebsiteDetailsTitle.length)
        ]!,
      mode: "buildBrandNewThing",
      i18nShouldBeEnabled: config?.experimental?.i18nBehavior === "prompt",
      isDev,
      config: config ?? {
        experimental: {
          i18nBehavior: "prompt",
          projectFramework: "nextjs",
        },
      },
      memory,
      cwd,
    });
  }
}
