import { consola } from "consola";
import { askProjectDetails } from "~/menu/04-askProjectDetails";
import { validate } from "~/utils/validate";
import { REPO_SHORT_URLS } from "~/app";
import { justInstallRelivator } from "~/menu/01-justInstallRelivator";

export async function installAnyGitRepo() {
  consola.info(
    "At the moment, the current mode is optimized for installing any package.json-based projects from GitHub. Support for other types of projects and git providers will be added in the future.",
  );

  const projectCategory = await consola.prompt(
    "Choose an installation category:",
    {
      options: [
        "Install any template maintained or created by the Reliverse team",
        "Install any external template by providing a custom GitHub link",
        "Install any other JS/TS repo project such as a React library",
      ] as const,
      type: "select",
    },
  );
  validate(projectCategory, "string", "Project category selection canceled.");

  let repoToInstall = "";

  if (
    projectCategory ===
    "Install any template maintained or created by the Reliverse team"
  ) {
    const reliverseTemplate = await consola.prompt(
      "Free Reliverse Templates Collection",
      {
        options: [
          REPO_SHORT_URLS.relivatorGithubLink,
          "blefnk/all-in-one-nextjs-template",
          "blefnk/create-t3-app",
          "blefnk/create-next-app",
          "blefnk/astro-starlight-template",
          REPO_SHORT_URLS.versatorGithubLink,
          "reliverse/template-browser-extension",
        ],
        type: "select",
      },
    );
    validate(reliverseTemplate, "string", "Template selection canceled.");
    repoToInstall = reliverseTemplate;
  } else if (
    projectCategory ===
    "Install any external template by providing a custom GitHub link"
  ) {
    const defaultLinks = [
      "reliverse/cli",
      "shadcn-ui/taxonomy",
      "onwidget/astrowind",
    ];
    const randomDefaultLink =
      defaultLinks[Math.floor(Math.random() * defaultLinks.length)];
    const customLink = await consola.prompt(
      "Enter the GitHub repository link:",
      {
        default: randomDefaultLink,
        placeholder: randomDefaultLink,
        type: "text",
      },
    );
    validate(customLink, "string", "Custom template providing canceled.");
    repoToInstall = customLink;
  } else if (
    projectCategory ===
    "Install any other JS/TS repo project such as a React library"
  ) {
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
      defaultLinks[Math.floor(Math.random() * defaultLinks.length)];
    const customLink = await consola.prompt(
      "Enter the GitHub repository link:",
      {
        default: randomDefaultLink,
        placeholder: randomDefaultLink,
        type: "text",
      },
    );
    validate(customLink, "string", "Custom template providing canceled.");
    repoToInstall = customLink;
  } else {
    consola.error("Invalid option selected. Exiting.");
    throw new Error("Unexpected template selection error.");
  }

  if (
    repoToInstall === REPO_SHORT_URLS.relivatorGithubLink ||
    repoToInstall === "blefnk/relivator"
  ) {
    return justInstallRelivator();
  }

  await askProjectDetails(
    repoToInstall,
    `Setting up the repository: ${repoToInstall}...`,
    "installAnyGitRepo",
    false,
  );
}
