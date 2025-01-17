import { selectPrompt, inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import type { AppParams } from "~/app/app-types.js";
import type { TemplateOption } from "~/utils/projectTemplate.js";

import { createWebProject } from "~/app/menu/create-project/cp-mod.js";
import { showNewProjectMenu } from "~/app/menu/menu-mod.js";

// TODO: Deprecate this file in favor of the new CLI logic

/**
 * @deprecated TODO: Integrate function logic into the main one
 */
export async function installAnyGitRepo(params: AppParams) {
  const { cwd, isDev, memory, config, reli, skipPrompts } = params;
  relinka(
    "info",
    "At the moment, the current mode is optimized for installing any package.json-based projects from GitHub. Support for other types of projects and git providers will be added in the future.",
  );

  const projectCategory = await selectPrompt({
    title: "Choose an installation category:",
    options: [
      {
        label:
          "Install any template maintained or created by the Reliverse team",
        value: "1",
      },
      {
        label:
          "Install any external template by providing a custom GitHub link",
        value: "2",
      },
      {
        label: "Install any other JS/TS repo project such as a React library",
        value: "3",
      },
    ],
  });

  let repoToInstall: TemplateOption = "blefnk/relivator";

  if (projectCategory === "1") {
    const reliverseTemplate = await selectPrompt({
      title: "Free Reliverse Templates Collection",
      options: [
        {
          label: "blefnk/all-in-one-nextjs-template",
          value: "blefnk/all-in-one-nextjs-template",
        },
        { label: "blefnk/create-t3-app", value: "blefnk/create-t3-app" },
        { label: "blefnk/create-next-app", value: "blefnk/create-next-app" },
        {
          label: "blefnk/astro-starlight-template",
          value: "blefnk/astro-starlight-template",
        },
        {
          label: "blefnk/versator",
          value: "blefnk/versator",
        },
        {
          label: "blefnk/relivator",
          value: "blefnk/relivator",
        },
        {
          label: "reliverse/template-browser-extension",
          value: "reliverse/template-browser-extension",
        },
      ],
    });
    repoToInstall = reliverseTemplate;
  } else if (projectCategory === "2") {
    const defaultLinks = [
      "reliverse/cli",
      "shadcn-ui/taxonomy",
      "onwidget/astrowind",
    ];
    const randomDefaultLink =
      defaultLinks[Math.floor(Math.random() * defaultLinks.length)] ??
      defaultLinks[0];
    const customLink = await selectPrompt({
      title: "Enter the GitHub repository link:",
      options: [
        {
          label: randomDefaultLink ?? "",
          value: randomDefaultLink ?? "",
        },
      ],
    });
    repoToInstall = customLink as TemplateOption;
  } else if (projectCategory === "3") {
    const defaultLinks = [
      "reliverse/acme",
      "pmndrs/zustand",
      "reliverse/core",
      "biomejs/biome",
      "reliverse/fs",
      "blefnk/knip",
      "47ng/nuqs",
    ];
    const randomDefaultLink =
      defaultLinks[Math.floor(Math.random() * defaultLinks.length)] ??
      defaultLinks[0];
    const customLink = await inputPrompt({
      title: "Enter the GitHub repository link:",
      defaultValue: randomDefaultLink ?? "",
      placeholder: randomDefaultLink ?? "",
    });
    repoToInstall = customLink as TemplateOption;
  } else {
    relinka("error", "Invalid option selected. Exiting.");
    throw new Error("Unexpected template selection error.");
  }

  if (
    repoToInstall === "blefnk/relivator" ||
    repoToInstall === "blefnk/next-react-ts-src-minimal"
  ) {
    return showNewProjectMenu({
      projectName: params.projectName,
      cwd,
      isDev,
      memory,
      config,
      reli,
      skipPrompts,
    });
  }

  await createWebProject({
    projectName: params.projectName,
    initialProjectName: params.projectName,
    webProjectTemplate: repoToInstall,
    message: `Setting up the repository: ${repoToInstall}...`,
    isDev,
    config,
    memory,
    cwd,
    skipPrompts,
  });
}
