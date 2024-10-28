import { consola } from "consola";
import path from "pathe";
import { askAppName } from "~/prompts/04-askAppName";
import { askGitInitialization } from "~/prompts/07-askGitInitialization";
import { askInstallDependencies } from "~/prompts/08-askInstallDependencies";
import { askSummaryConfirmation } from "~/prompts/09-askSummaryConfirmation";
import { choosePackageManager } from "~/prompts/utils/choosePackageManager";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { downloadGitRepo } from "~/prompts/utils/downloadGitRepo";
import { validate } from "~/prompts/utils/validate";
import { isDev, REPO_SHORT_URLS } from "~/settings";
import { justInstallRelivator } from "~/prompts/01-justInstallRelivator";
import { askUserName } from "~/prompts/05-askUserName";
import { askAppDomain } from "~/prompts/06-askAppDomain";

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

  const projectName = await askAppName();
  const username = await askUserName();
  const domain = await askAppDomain();
  const gitOption = await askGitInitialization();
  const installDeps = await askInstallDependencies("installAnyGitRepo");

  const confirmed = await askSummaryConfirmation(
    repoToInstall,
    projectName,
    username,
    domain,
    gitOption,
    installDeps,
  );

  if (!confirmed) {
    consola.info("Project setup was canceled.");
    return;
  }

  const cwd = getCurrentWorkingDirectory();

  const targetDir = isDev
    ? path.join(cwd, "..", projectName)
    : path.join(cwd, projectName);

  await downloadGitRepo(projectName, repoToInstall, installDeps, gitOption);

  if (installDeps) {
    const pkgManager = await choosePackageManager(cwd);
    consola.info(`Using ${pkgManager} to install dependencies...`);

    try {
      consola.success("Dependencies installed successfully.");
    } catch (error) {
      consola.error("Failed to install dependencies:", error);
    }
  } else {
    const pkgManager = await choosePackageManager(cwd);
    consola.info(
      `👉 To install manually, run: cd ${targetDir} && ${pkgManager} i`,
    );
  }

  consola.success(`Repository from ${repoToInstall} installed successfully.`);
  consola.info(`👉 If you have VSCode installed, run: code ${targetDir}\n`);
}
