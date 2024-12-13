// 📚 Docs: https://docs.reliverse.org/reliverse/cli

import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import { readReliverseMemory } from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import { randomReliverseMenuTitle } from "./data/messages.js";
import { randomWelcomeMessages } from "./data/messages.js";
import { buildBrandNewThing } from "./menu/buildBrandNewThing.js";
import { showEndPrompt, showStartPrompt } from "./menu/showStartEndPrompt.js";

export async function app({ isDev }: { isDev: boolean }) {
  await showStartPrompt();

  if (isDev) {
    const cwd = getCurrentWorkingDirectory();
    const testRuntimePath = path.join(cwd, "tests-runtime");

    try {
      if (await fs.pathExists(testRuntimePath)) {
        const shouldDeleteTestData = await confirmPrompt({
          title:
            "[--dev] Found tests-runtime folder. Do you want me to delete it?",
        });

        if (shouldDeleteTestData) {
          await fs.remove(testRuntimePath);
        }
      }
    } catch (error) {
      relinka(
        "error",
        "Error checking/removing test runtime path:",
        error.toString(),
      );
    }
  }

  // TODO: if config contains at least one project, show "Open project" option
  // TODO: implement "Edit Reliverse Memory" option (configuration data editor)

  const memory = await readReliverseMemory();
  const username = memory.user?.name;

  const option = await selectPrompt({
    title: `🤖 ${
      username
        ? randomWelcomeMessages(username)[
            Math.floor(Math.random() * randomWelcomeMessages(username).length)
          ]
        : ""
    } ${
      randomReliverseMenuTitle[
        Math.floor(Math.random() * randomReliverseMenuTitle.length)
      ]
    }`,
    titleColor: "retroGradient",
    options: [
      {
        label: "Build a brand new thing from scratch",
        value: "1",
      },
      // {
      //   label: "Clone and configure any GitHub repo",
      //   hint: "coming soon",
      //   value: "2",
      //   disabled: true,
      // },
      // "4. Add shadcn/ui components to your React/Vue/Svelte project",
      // "5. Run code modifications on the existing codebase",
      // "6. Update your GitHub clone with the latest changes",
      // "7. Add, remove, or replace the Relivator's features",
      { label: pc.italic("Exit"), value: "exit" },
    ],
  });

  if (option === "1") {
    await buildBrandNewThing(isDev);
  }
  // else if (option === "2") {
  //   await installAnyGitRepo();
  // }
  // else if ( option === "4. Add shadcn/ui components to your React/Vue/Svelte project" ) {
  //   await shadcnComponents(program);
  // }
  // else if (option === "5. Run code modifications on the existing codebase") {
  //   await askCodemodUserCodebase();
  // } else if (option === "6. Update your GitHub clone with the latest changes") {
  //   await showUpdateCloneMenu();
  // } else if (option === "7. Add, remove, or replace the Relivator's features") {
  //   await showRelivatorFeatEditor();
  // }
  else if (option === "exit") {
    process.exit(0);
  } else {
    relinka("error", "Invalid option selected. Exiting.");
  }

  await showEndPrompt();
}
