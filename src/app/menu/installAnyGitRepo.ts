import { selectPrompt, inputPrompt } from "@reliverse/prompts";

import { relinka } from "~/utils/console.js";
import { validate } from "~/utils/validate.js";

import { buildBrandNewThing } from "./buildBrandNewThing.js";
import { createWebProject } from "./createWebProject.js";

export async function installAnyGitRepo(isDev: boolean) {
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
  validate(projectCategory, "string", "Project category selection canceled.");

  let repoToInstall = "";

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
    validate(reliverseTemplate, "string", "Template selection canceled.");
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
    validate(customLink, "string", "Custom template providing canceled.");
    repoToInstall = customLink;
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
    validate(customLink, "string", "Custom template providing canceled.");
    repoToInstall =
      customLink.toString() ?? "https://github.com/reliverse/acme";
  } else {
    relinka("error", "Invalid option selected. Exiting.");
    throw new Error("Unexpected template selection error.");
  }

  if (
    repoToInstall === "blefnk/relivator" ||
    repoToInstall === "blefnk/relivator"
  ) {
    return buildBrandNewThing(isDev);
  }

  await createWebProject({
    webProjectTemplate: repoToInstall,
    message: `Setting up the repository: ${repoToInstall}...`,
    mode: "installAnyGitRepo",
    i18nShouldBeEnabled: false,
    isDev,
  });
}
