import { downloadTemplate } from "giget";
import { consola } from "consola";
import { validate } from "~/utils/validate";
import { generate } from "random-words";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import { detectPackageManager } from "nypm";
import type { SimpleGit } from "simple-git";
import { simpleGit } from "simple-git";

export async function createProject() {
  const name = await appName();
  const template = await chooseTemplate();
  const git = await gitInitialization();
  const deps = await dependencies();
  const confirmed = await confirmation();

  if (confirmed) {
    await installTemplate(name, template, deps, git);
  } else {
    consola.info("Installation canceled by the user.");
  }
}

async function appName(): Promise<string> {
  const placeholder = generate({ exactly: 3, join: "-" });
  const name = await consola.prompt("Enter the project name:", {
    default: placeholder,
    placeholder,
    type: "text",
  });
  validate(name, "string", "Project creation canceled.");
  return name;
}

async function dependencies(): Promise<boolean> {
  const deps = await consola.prompt(
    "Do you want to install the project dependencies?",
    { type: "confirm" },
  );
  validate(deps, "boolean", "Installation canceled by the user.");
  return deps;
}

async function chooseTemplate(): Promise<string> {
  const templateCategory = await consola.prompt("Choose a template category:", {
    type: "select",
    options: ["Install Reliverse Template", "Install External Template"],
  });

  if (templateCategory === "Install Reliverse Template") {
    const reliverseTemplate = await consola.prompt(
      "Select a Reliverse template:",
      {
        type: "select",
        options: [
          "blefnk/relivator-nextjs-template",
          "blefnk/astro-starlight-template",
        ],
      },
    );
    validate(reliverseTemplate, "string", "Template selection canceled.");
    return reliverseTemplate;
  }

  if (templateCategory === "Install External Template") {
    const externalTemplate = await consola.prompt(
      "Select an external template or provide a custom GitHub link:",
      {
        type: "select",
        options: [
          "blefnk/create-next-app",
          "blefnk/create-t3-app",
          "Provide custom GitHub link",
        ],
      },
    );

    if (externalTemplate === "Provide custom GitHub link") {
      const defaultLinks = [
        "reliverse/acme",
        "relivator-nextjs-template",
        "blefnk/astro-starlight-template",
      ];
      const randomDefaultLink =
        defaultLinks[Math.floor(Math.random() * defaultLinks.length)];
      const customLink = await consola.prompt(
        "Enter the GitHub repository link:",
        {
          default: randomDefaultLink,
          type: "text",
        },
      );
      validate(customLink, "string", "Custom template selection canceled.");
      return customLink;
    }

    validate(externalTemplate, "string", "Template selection canceled.");
    return externalTemplate;
  }

  throw new Error("Unexpected template selection error.");
}

async function gitInitialization(): Promise<boolean> {
  const git = await consola.prompt(
    "Do you want to initialize a Git repository?",
    { type: "confirm" },
  );
  validate(git, "boolean", "Git initialization canceled by the user.");
  return git;
}

async function initializeGitRepository(dir: string): Promise<void> {
  try {
    const git: SimpleGit = simpleGit({ baseDir: dir });
    await git.init();
    await git.add("");
    await git.commit("Initial commit from Create Reliverse App");
    consola.success(
      "✅ Git repository initialized and initial commit created.",
    );
    consola.info("We recommend pushing your commits using GitHub Desktop.");
    consola.info(
      "Learn more and find other tips by visiting https://reliverse.org.",
    );
  } catch (error) {
    consola.warn(
      `🤔 Failed to initialize the Git repository: ${String(error)}`,
    );
  }
}

async function confirmation(): Promise<boolean> {
  const confirmed = await consola.prompt(
    "Press `Y` to proceed with the selected template installation.",
    { type: "confirm" },
  );
  validate(confirmed, "boolean", "Installation canceled by the user.");
  return confirmed;
}

async function installTemplate(
  name: string,
  template: string,
  deps: boolean,
  git: boolean,
): Promise<void> {
  try {
    const cwd = getCurrentWorkingDirectory();
    const { source, dir } = await downloadTemplate(`github:${template}`, {
      dir: `${cwd}/${name}`,
      install: deps,
    });

    consola.success(`🎉 ${source} was successfully installed to ${dir}.`);
    consola.info("✨ Next steps to get started:");
    consola.info(`- Open the project: cd ${dir}`);
    if (!deps) {
      consola.info("- Install dependencies: npx nypm i");
    }

    if (git) {
      await initializeGitRepository(dir);
    }

    const packageManager = await detectPackageManager(cwd);
    consola.info(`- Run the project: ${packageManager?.name ?? "pnpm"} dev`);
  } catch (error) {
    consola.error(`🤔 Failed to set up the project: ${String(error)}`);
    process.exit(1);
  }
}
