import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";

import type {
  ProjectArchitecture,
  ProjectSubcategory,
  ReliverseConfig,
} from "~/utils/libs/config/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import {
  endTitle,
  experimental,
  recommended,
  UNKNOWN_VALUE,
} from "~/app/constants.js";
import {
  randomProjectFrameworkTitle,
  getRandomMessage,
} from "~/app/db/messages.js";
import {
  TEMP_BROWSER_TEMPLATE_OPTIONS,
  TEMP_VSCODE_TEMPLATE_OPTIONS,
  TEMP_FULLSTACK_WEBSITE_TEMPLATE_OPTIONS,
  type RepoOption,
  TEMP_SEPARATED_WEBSITE_TEMPLATE_OPTIONS,
} from "~/utils/projectRepository.js";

import { createWebProject } from "./create-project/cp-mod.js";

/**
 * Possible template options for VS Code extensions
 */
export type VSCodeRepoOption =
  | "microsoft/vscode-extension-samples"
  | "microsoft/vscode-extension-template"
  | "unknown";

/**
 * Possible template options for browser extensions
 */
export type BrowserRepoOption =
  | "reliverse/template-browser-extension"
  | "unknown";

/**
 * Asks the user for extension config via prompts
 */
export async function configureBrowserExtension() {
  const browserExtensionConfig = {
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
          hint: re.dim("Add custom commands to VS Code"),
        },
        {
          label: "WebView",
          value: "webview",
          hint: re.dim("Create custom UI panels"),
        },
        {
          label: "Language Support",
          value: "language",
          hint: re.dim("Add support for a programming language"),
        },
        {
          label: "Themes",
          value: "themes",
          hint: re.dim("Create custom color themes"),
        },
      ],
    }),
    activation: await selectPrompt({
      title: "When should your extension activate?",
      options: [
        {
          label: "On Command",
          value: "onCommand",
          hint: re.dim("Activate when a specific command is run"),
        },
        {
          label: "On Language",
          value: "onLanguage",
          hint: re.dim("Activate for specific file types"),
        },
        {
          label: "On Startup",
          value: "startup",
          hint: re.dim("Activate when VS Code starts"),
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

  return browserExtensionConfig;
}

/**
 * Asks the user for extension config via prompts
 */
export async function configureVSCodeExtension() {
  const vscodeExtensionConfig = {
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
          hint: re.dim("Add custom commands to VS Code"),
        },
        {
          label: "WebView",
          value: "webview",
          hint: re.dim("Create custom UI panels"),
        },
        {
          label: "Language Support",
          value: "language",
          hint: re.dim("Add support for a programming language"),
        },
        {
          label: "Themes",
          value: "themes",
          hint: re.dim("Create custom color themes"),
        },
      ],
    }),
    activation: await selectPrompt({
      title: "When should your extension activate?",
      options: [
        {
          label: "On Command",
          value: "onCommand",
          hint: re.dim("Activate when a specific command is run"),
        },
        {
          label: "On Language",
          value: "onLanguage",
          hint: re.dim("Activate for specific file types"),
        },
        {
          label: "On Startup",
          value: "startup",
          hint: re.dim("Activate when VS Code starts"),
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

  return vscodeExtensionConfig;
}

export async function optionCreateVSCodeExtension(
  projectName: string,
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  config: ReliverseConfig,
  skipPrompts: boolean,
) {
  const template = await selectPrompt({
    endTitle,
    title: "Which VS Code extension template would you like to use?",
    options: [
      ...Object.values(TEMP_VSCODE_TEMPLATE_OPTIONS),
      { separator: true },
      {
        label: re.italic(re.dim("More templates coming soon")),
        value: "unknown",
        disabled: true,
      },
    ],
  });

  const vscodeExtensionConfig = await configureVSCodeExtension();

  if (vscodeExtensionConfig) {
    await createWebProject({
      projectName,
      initialProjectName: projectName,
      selectedRepo: template as Exclude<VSCodeRepoOption, "unknown">,
      message: getRandomMessage("category"),
      isDev,
      config,
      memory,
      cwd,
      skipPrompts,
    });
  } else {
    relinka("error", "No VS Code extension config provided");
  }
}

export async function optionCreateBrowserExtension(
  projectName: string,
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  config: ReliverseConfig,
  skipPrompts: boolean,
) {
  const template = (await selectPrompt({
    endTitle,
    title: "Which browser extension template would you like to use?",
    options: [
      ...Object.values(TEMP_BROWSER_TEMPLATE_OPTIONS),
      { separator: true },
      {
        label: re.italic(re.dim("More templates coming soon")),
        value: "unknown",
        disabled: true,
      },
    ],
  })) as BrowserRepoOption;

  const browserExtensionConfig = await configureBrowserExtension();

  if (browserExtensionConfig) {
    await createWebProject({
      projectName,
      initialProjectName: projectName,
      selectedRepo: template as Exclude<BrowserRepoOption, "unknown">,
      message: getRandomMessage("category"),
      isDev,
      config,
      memory,
      cwd,
      skipPrompts,
    });
  } else {
    relinka("error", "No browser extension config provided");
  }
}

/**
 * Orchestrates the creation of a Web project.
 * If `isMultiConfig` is true, we loop through `reli` array.
 */
export async function optionCreateWebProject(
  projectName: string,
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  config: ReliverseConfig,
  isMultiConfig: boolean,
  reli: ReliverseConfig[],
  skipPrompts: boolean,
): Promise<void> {
  if (isMultiConfig) {
    for (const multiConfig of reli) {
      let template = multiConfig.projectTemplate;
      if (template === "unknown") {
        let architecture = multiConfig.projectArchitecture;
        if (architecture === "unknown") {
          architecture = await selectPrompt<ProjectArchitecture>({
            endTitle,
            title: "Which architecture would you prefer?",
            options: [
              {
                label: `${re.bold("Fullstack")} ${recommended}`,
                value: "fullstack",
              },
              {
                label: `${re.dim("Separated frontend and backend")} ${experimental}`,
                value: "separated",
              },
            ],
          });
        }
        template = (await selectPrompt({
          endTitle,
          title: "Which template would you like to use?",
          options:
            architecture === "fullstack"
              ? Object.values(TEMP_FULLSTACK_WEBSITE_TEMPLATE_OPTIONS)
              : Object.values(TEMP_SEPARATED_WEBSITE_TEMPLATE_OPTIONS),
        })) as RepoOption;
      }

      const settingUpMsg = `Setting up project #${reli.indexOf(multiConfig) + 1}...`;

      await createWebProject({
        projectName,
        initialProjectName: projectName,
        selectedRepo: template,
        message: settingUpMsg,
        isDev,
        config: multiConfig,
        memory,
        cwd,
        skipPrompts,
      });
    }
  } else {
    // Single config: prompt for projectFramework if not set
    let projectFramework = config.projectFramework;
    if (projectFramework === UNKNOWN_VALUE) {
      const result = await selectPrompt({
        endTitle,
        title:
          randomProjectFrameworkTitle[
            Math.floor(Math.random() * randomProjectFrameworkTitle.length)
          ] ?? "What project framework best fits your project?",
        options: [
          {
            label: "Next.js",
            value: "nextjs",
            hint: re.dim("recommended for most projects"),
          },
          {
            label: "...",
            hint: re.dim("coming soon"),
            value: "unknown",
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

    // Prompt for website subcategory
    let websiteSubcategory = config.projectSubcategory;
    if (websiteSubcategory === UNKNOWN_VALUE) {
      const selectedSubcategory = await selectPrompt<ProjectSubcategory>({
        endTitle,
        title: getRandomMessage("subcategory"),
        options: [
          { label: "E-commerce", value: "e-commerce" },
          {
            label: "...",
            hint: re.dim("coming soon"),
            value: UNKNOWN_VALUE,
            disabled: true,
          },
        ],
      });
      websiteSubcategory = selectedSubcategory;
    }

    // If user's config has a template, use it; else ask
    let template: RepoOption;
    if (config.projectTemplate !== UNKNOWN_VALUE) {
      template = config.projectTemplate as RepoOption;
    } else {
      let architecture = config.projectArchitecture;
      if (architecture === "unknown") {
        architecture = await selectPrompt<ProjectArchitecture>({
          endTitle,
          title: "Which architecture would you prefer?",
          options: [
            {
              label: `${re.bold("Fullstack")} ${recommended}`,
              value: "fullstack",
            },
            {
              label: `${re.dim("Separated frontend and backend")} ${experimental}`,
              value: "separated",
            },
          ],
        });
      }
      const result = await selectPrompt({
        endTitle,
        title: "Which template would you like to use?",
        options:
          architecture === "fullstack"
            ? Object.values(TEMP_FULLSTACK_WEBSITE_TEMPLATE_OPTIONS)
            : Object.values(TEMP_SEPARATED_WEBSITE_TEMPLATE_OPTIONS),
      });
      template = result as RepoOption;
    }

    const settingUpMsg = isMultiConfig
      ? `Setting up project #${reli.indexOf(config) + 1}...`
      : getRandomMessage("details");

    // Finally, create the web project
    await createWebProject({
      projectName,
      initialProjectName: projectName,
      selectedRepo: template,
      message: settingUpMsg,
      isDev,
      config,
      memory,
      cwd,
      skipPrompts,
    });
  }
}
