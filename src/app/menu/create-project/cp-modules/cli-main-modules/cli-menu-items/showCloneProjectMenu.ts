import { selectPrompt, inputPrompt, confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { downloadRepo } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadRepo.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { ensureGithubToken } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/github.js";
import { getUserPkgManager } from "~/utils/dependencies/getUserPkgManager.js";
import { handleReliverseMemory } from "~/utils/reliverseMemory.js";
import { cd } from "~/utils/terminalHelpers.js";

/**
 * Data structure to hold the user's chosen repo and whether it was a custom entry.
 */
type RepoPromptResult = {
  repo: string;
  isCustom: boolean;
};

/**
 * A collection of random repository examples for user-focused repositories.
 */
const REPOS_USERS = [
  "blefnk/all-in-one-nextjs-template",
  "blefnk/astro-starlight-template",
  "blefnk/create-next-app",
  "blefnk/create-t3-app",
  "blefnk/relivator",
  "blefnk/versator",
  "onwidget/astrowind",
  "reliverse/template-browser-extension",
  "shadcn-ui/taxonomy",
];

/**
 * A collection of random repository examples for developer-focused repositories.
 */
const REPOS_DEVS = [
  "47ng/nuqs",
  "biomejs/biome",
  "pmndrs/zustand",
  "reliverse/acme",
  "reliverse/cli",
  "reliverse/pm",
  "reliverse/prompts",
  "reliverse/relico",
  "reliverse/relinka",
  "unjs/template",
  "webpro-nl/knip",
];

/**
 * Helper function to prompt for a repository from a list of options.
 * If "custom" is chosen, it prompts the user for a link.
 * Returns both the `repo` string and a boolean `isCustom`.
 */
async function promptForRepo({
  title,
  options,
  category,
}: {
  title: string;
  options: { label: string; value: string }[];
  category: "users" | "developers";
}): Promise<RepoPromptResult> {
  const selection = await selectPrompt({ title, options });

  // If user chooses "custom", ask for their custom GitHub link
  if (selection === "custom") {
    const examples = category === "users" ? REPOS_USERS : REPOS_DEVS;
    const randomUrl = `(e.g. ${examples[Math.floor(Math.random() * examples.length)]})`;
    let customRepo = await inputPrompt({
      title: `Enter a GitHub repository link (${randomUrl})`,
    });

    // Normalize the user input by removing any leading protocol and domain
    customRepo = customRepo
      .trim()
      .replace(
        /^https?:\/\/(www\.)?(github|gitlab|bitbucket|sourcehut)\.com\//,
        "",
      )
      .replace(/^(github|gitlab|bitbucket|sourcehut)\.com\//, "");

    return { repo: customRepo, isCustom: true };
  }

  // If one of the predefined options is chosen, it is not custom
  return { repo: selection, isCustom: false };
}

/**
 * Helper function to create menu options from repository list
 */
function createMenuOptions(repos: string[]) {
  return [
    {
      label: "📝 I want to provide a custom GitHub repo link",
      value: "custom",
    },
    ...repos.map((repo) => ({ label: repo, value: repo })),
  ];
}

/**
 * Options for "End-user" category repositories.
 */
const userOptions = createMenuOptions(REPOS_USERS);

/**
 * Options for "Developer" category repositories.
 */
const devOptions = createMenuOptions(REPOS_DEVS);

/**
 * Unified function to prompt for either user or developer repository selection.
 */
async function getCategoryChoice(
  category: "users" | "developers",
): Promise<RepoPromptResult> {
  if (category === "users") {
    return promptForRepo({
      title: "What end-user related project do you want to clone?",
      options: userOptions,
      category: "users",
    });
  } else {
    return promptForRepo({
      title: "What developer related project do you want to clone?",
      options: devOptions,
      category: "developers",
    });
  }
}

/**
 * Main function to show the clone project menu and handle user selection.
 */
export async function showCloneProjectMenu({
  isDev,
  cwd,
}: {
  isDev: boolean;
  cwd: string;
}) {
  if (isDev) {
    await cd("tests-runtime");
  }

  relinka(
    "success",
    "Please note: This menu only allows cloning repositories.",
    "If you want a fully personalized project bootstrapped with a desired template, re-run the CLI and choose the `✨ Create a brand new project` option instead.",
  );

  const category = await selectPrompt({
    title: "What repo category do you want to clone from GitHub?",
    options: [
      {
        label: "Developer related",
        hint: "e.g. npm package, eslint plugin, etc",
        value: "developers",
      },
      {
        label: "End-user related",
        hint: "e.g. web app, browser extension, cli, etc",
        value: "users",
      },
      {
        label: "👈 Exit",
        value: "exit",
      },
    ],
  });

  // If user selects "Exit", we stop here
  if (category === "exit") {
    relinka("info", "Exiting without cloning any repository.");
    return;
  }

  // Prompt the user with a different set of options depending on the category
  const { repo, isCustom } = await getCategoryChoice(category);

  // Decide if it's public or private (only relevant for custom repos)
  let privacy = "public";
  if (isCustom) {
    privacy = await selectPrompt({
      title: `Is repo ${repo} public or private?`,
      options: [
        { label: "Public", value: "public" },
        { label: "Private", value: "private" },
      ],
    });
  }

  const { packageManager } = await getUserPkgManager();
  const shouldInstallDeps = await confirmPrompt({
    title: "Do you want me to install dependencies?",
    content: `I can run "${packageManager} install" in the dir of the cloned repo.`,
  });

  const projectName = await askProjectName();

  // Download the repository
  if (privacy === "public") {
    const { source, dir } = await downloadRepo({
      repoURL: repo,
      projectName,
      isDev,
      cwd,
      install: shouldInstallDeps,
    });
    relinka(
      "success",
      "🎉 Enjoy! I have successfully cloned the selected repo:",
      `${source} to ${dir}`,
    );
  } else {
    const memory = await handleReliverseMemory();
    const ghToken = await ensureGithubToken(memory, "prompt");
    const { source, dir } = await downloadRepo({
      repoURL: repo,
      projectName,
      isDev,
      cwd,
      install: shouldInstallDeps,
      auth: ghToken,
    });
    relinka(
      "success",
      `I have downloaded the repo ${source} to ${dir}. Enjoy! 🎉`,
    );
  }
}
