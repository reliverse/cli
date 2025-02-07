import {
  selectPrompt,
  inputPrompt,
  confirmPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { askProjectName } from "~/utils/askProjectName.js";
import { getUserPkgManager } from "~/utils/dependencies/getUserPkgManager.js";
import { handleDownload } from "~/utils/downloading/handleDownload.js";
import { ensureGithubToken } from "~/utils/instanceGithub.js";
import { cd } from "~/utils/terminalHelpers.js";

/**
 * Normalizes a GitHub repository URL to the format "owner/repo"
 */
function normalizeGitHubUrl(url: string): string {
  return url
    .trim()
    .replace(
      /^https?:\/\/(www\.)?(github|gitlab|bitbucket|sourcehut)\.com\//i,
      "",
    )
    .replace(/^(github|gitlab|bitbucket|sourcehut)\.com\//i, "")
    .replace(/\.git$/i, "");
}

/**
 * Data structure to hold the user's chosen repo and whether it was a custom entry.
 */
type RepoPromptResult = {
  repo: string;
  isCustom: boolean;
};

/**
 * Data structure to hold multiple chosen repos and whether they were custom entries.
 */
type MultiRepoPromptResult = {
  repos: string[];
  isCustomMap: Map<string, boolean>;
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
 * Helper function to create menu options from repository list
 */
function createMenuOptions(
  repos: string[],
  config: ReliverseConfig,
  isUserFocused: boolean,
) {
  const customRepos = (
    isUserFocused
      ? (config.customUserFocusedRepos ?? [])
      : (config.customDevsFocusedRepos ?? [])
  ).map(normalizeGitHubUrl);

  // Hide predefined repos if hideRepoSuggestions is true and there are custom repos
  const shouldHidePredefined =
    config.hideRepoSuggestions && customRepos.length > 0;
  const allRepos = shouldHidePredefined
    ? customRepos
    : [...repos, ...customRepos];

  // Only show custom input option when not in multiple mode
  if (!config.multipleRepoCloneMode) {
    return [
      {
        label: "📝 I want to provide a custom GitHub repo link",
        value: "custom",
      },
      ...allRepos.map((repo) => ({
        label: repo,
        value: repo,
        hint: customRepos.includes(repo) ? "custom" : undefined,
      })),
    ];
  }

  return allRepos.map((repo) => ({
    label: repo,
    value: repo,
    hint: customRepos.includes(repo) ? "custom" : undefined,
  }));
}

/**
 * Options for "End-user" category repositories.
 */
function getUserOptions(config: ReliverseConfig) {
  return createMenuOptions(REPOS_USERS, config, true);
}

/**
 * Options for "Developer" category repositories.
 */
function getDevOptions(config: ReliverseConfig) {
  return createMenuOptions(REPOS_DEVS, config, false);
}

/**
 * Helper function to prompt for a repository from a list of options.
 * If "custom" is chosen, it prompts the user for a link.
 * Returns both the `repo` string and a boolean `isCustom`.
 */
async function promptForRepo({
  title,
  options,
  category,
  config,
}: {
  title: string;
  options: { label: string; value: string }[];
  category: "users" | "developers";
  config: ReliverseConfig;
}): Promise<RepoPromptResult | MultiRepoPromptResult> {
  const customRepos = (
    category === "users"
      ? (config.customUserFocusedRepos ?? [])
      : (config.customDevsFocusedRepos ?? [])
  ).map(normalizeGitHubUrl);

  if (config.multipleRepoCloneMode) {
    const selections = await multiselectPrompt({
      title,
      options,
    });

    // If selections is empty, ask user to select at least one
    if (selections.length === 0) {
      relinka("error", "Please select at least one repository.");
      return promptForRepo({ title, options, category, config });
    }

    // Map selections to normalized URLs and check if each is custom
    const normalizedSelections = selections.map(normalizeGitHubUrl);
    const isCustomMap = new Map(
      normalizedSelections.map((repo) => [repo, customRepos.includes(repo)]),
    );

    return {
      repos: normalizedSelections,
      isCustomMap,
    };
  } else {
    const selection = await selectPrompt({ title, options });

    // If user chooses "custom", ask for their custom GitHub link
    if (selection === "custom") {
      const examples = category === "users" ? REPOS_USERS : REPOS_DEVS;
      const randomUrl = `(e.g. ${examples[Math.floor(Math.random() * examples.length)]})`;
      let customRepo = await inputPrompt({
        title: `Enter a GitHub repository link ${randomUrl}`,
      });

      // Normalize the user input
      customRepo = normalizeGitHubUrl(customRepo);

      return { repo: customRepo, isCustom: true };
    }

    // If one of the predefined options is chosen, check if it's from custom repos
    const normalizedSelection = normalizeGitHubUrl(selection);
    return {
      repo: normalizedSelection,
      isCustom: customRepos.includes(normalizedSelection),
    };
  }
}

/**
 * Unified function to prompt for either user or developer repository selection.
 */
async function getCategoryChoice(
  category: "users" | "developers",
  config: ReliverseConfig,
): Promise<RepoPromptResult | MultiRepoPromptResult> {
  if (category === "users") {
    return promptForRepo({
      title: "What end-user related project do you want to clone?",
      options: getUserOptions(config),
      category: "users",
      config,
    });
  } else {
    return promptForRepo({
      title: "What developer related project do you want to clone?",
      options: getDevOptions(config),
      category: "developers",
      config,
    });
  }
}

/**
 * Main function to show the clone project menu and handle user selection.
 */
export async function showCloneProjectMenu({
  isDev,
  cwd,
  config,
  memory,
}: {
  isDev: boolean;
  cwd: string;
  config: ReliverseConfig;
  memory: ReliverseMemory;
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
  const result = await getCategoryChoice(category, config);

  if ("repos" in result) {
    // Handle multiple repos
    for (const repo of result.repos) {
      // Decide if it's public or private (only relevant for custom repos)
      let privacy = "public";
      // Check if the repo is in the predefined list
      const isCustom = !REPOS_DEVS.includes(repo);
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
      let shouldInstallDeps = false;
      if (!isDev) {
        shouldInstallDeps = await confirmPrompt({
          title: "Do you want me to install dependencies?",
          content: `I can run "${packageManager} install" in the dir of the cloned repo.`,
        });
      }

      const projectName = await askProjectName({ repoName: repo });

      // Ask about Git history preference
      const gitPreference = await selectPrompt({
        title: "How would you like to handle Git history?",
        content: `(project: ${projectName} | repo: ${repo})`,
        options: [
          {
            label: "Preserve original Git history",
            hint: "keeps the original .git folder",
            value: "preserve",
          },
          {
            label: "Start fresh Git history",
            hint: "initializes a new .git folder",
            value: "fresh",
          },
        ],
      });

      // Download the repository
      let githubToken = "";
      if (privacy === "private") {
        githubToken = await ensureGithubToken(memory, "prompt");
      }
      const { source, dir } = await handleDownload({
        cwd,
        isDev,
        skipPrompts: false,
        projectPath: "",
        projectName,
        selectedRepo: repo,
        auth: githubToken,
        preserveGit: gitPreference === "preserve",
        config: gitPreference === "fresh" ? config : undefined,
        install: shouldInstallDeps,
        isCustom,
        isTemplateDownload: false,
      });
      relinka("success", `🎉 ${source} was downloaded to ${dir}`);
    }
  } else {
    // Handle single repo
    // Decide if it's public or private (only relevant for custom repos)
    let privacy = "public";
    // Check if the repo is in the predefined list
    const isCustom = !REPOS_DEVS.includes(result.repo);
    if (isCustom) {
      privacy = await selectPrompt({
        title: `Is repo ${result.repo} public or private?`,
        options: [
          { label: "Public", value: "public" },
          { label: "Private", value: "private" },
        ],
      });
    }

    const { packageManager } = await getUserPkgManager();
    let shouldInstallDeps = false;
    if (!isDev) {
      shouldInstallDeps = await confirmPrompt({
        title: "Do you want me to install dependencies?",
        content: `I can run "${packageManager} install" in the dir of the cloned repo.`,
      });
    }

    const projectName = await askProjectName({ repoName: result.repo });

    // Ask about Git history preference
    const gitPreference = await selectPrompt({
      title: "How would you like to handle Git history?",
      content: `(project: ${projectName} | repo: ${result.repo})`,
      options: [
        {
          label: "Preserve original Git history",
          hint: "keeps the original .git folder",
          value: "preserve",
        },
        {
          label: "Start fresh Git history",
          hint: "initializes a new .git folder",
          value: "fresh",
        },
      ],
    });

    // Download the repository
    let githubToken = "";
    if (privacy === "private") {
      githubToken = await ensureGithubToken(memory, "prompt");
    }
    const { source, dir } = await handleDownload({
      cwd,
      isDev,
      skipPrompts: false,
      projectPath: "",
      projectName,
      selectedRepo: result.repo,
      auth: githubToken,
      preserveGit: gitPreference === "preserve",
      config: gitPreference === "fresh" ? config : undefined,
      install: shouldInstallDeps,
      isCustom: result.isCustom,
      isTemplateDownload: false,
    });
    relinka(
      "success",
      `I have downloaded the repo ${source} to ${dir}. Enjoy! 🎉`,
    );
  }
}
