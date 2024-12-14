// 📚 Docs: https://docs.reliverse.org/reliverse/cli

import {
  confirmPrompt,
  selectPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
import path from "pathe";
import pc from "picocolors";

import { readReliverseMemory } from "~/args/memory/impl.js";
import {
  clearCheckpoint,
  findExistingCheckpoints,
} from "~/utils/checkpoint.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import { randomReliverseMenuTitle } from "./data/messages.js";
import { randomWelcomeMessages } from "./data/messages.js";
import { buildBrandNewThing } from "./menu/buildBrandNewThing.js";
import { showEndPrompt, showStartPrompt } from "./menu/showStartEndPrompt.js";

export async function app({ isDev }: { isDev: boolean }) {
  await showStartPrompt();

  const cwd = getCurrentWorkingDirectory();

  if (isDev) {
    const shouldRemoveTestsRuntime = await confirmPrompt({
      title: "[--dev] Do you want to remove the entire tests-runtime folder?",
    });
    if (shouldRemoveTestsRuntime) {
      await fs.remove(path.join(cwd, "tests-runtime"));
    }
  }

  const existingCheckpoints = await findExistingCheckpoints(isDev);

  let options = [
    {
      label: pc.bold("✨ Build a brand new thing from scratch"),
      value: "1",
    },
    {
      label: `🔐 ${pc.italic("Exit")}`,
      value: "exit",
      hint: pc.dim("ctrl+c anywhere"),
    },
  ];

  if (existingCheckpoints.length > 0) {
    options = [
      ...options,
      {
        label: "📂 Continue existing project",
        value: "continue",
        hint: pc.dim(`${existingCheckpoints.length} project(s) in progress`),
      },
      {
        label: "🧼 Delete project(s)",
        value: "delete",
        hint: pc.dim("allows to choose what to delete"),
      },
    ];
  }

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
    options,
  });

  if (option === "continue") {
    if (existingCheckpoints.length === 1) {
      await buildBrandNewThing(isDev, existingCheckpoints[0]);
    } else {
      const projectToResume = await selectPrompt({
        title: "Which project would you like to continue?",
        options: existingCheckpoints.map((project) => ({
          label: project,
          value: project,
        })),
      });
      await buildBrandNewThing(isDev, projectToResume);
    }
  } else if (option === "1") {
    await buildBrandNewThing(isDev);
  } else if (option === "delete") {
    const projectsToDelete = await multiselectPrompt({
      title: "Select projects to delete",
      content: "To exit: press <Ctrl+C> or select nothing.",
      options: existingCheckpoints.map((project) => ({
        label: project,
        value: project,
      })),
      defaultValue: existingCheckpoints,
    });

    if (projectsToDelete.length > 0) {
      const confirmDelete = await confirmPrompt({
        title: `Are you sure you want to delete ${projectsToDelete.length} project(s)?`,
      });

      if (confirmDelete) {
        for (const project of projectsToDelete) {
          await clearCheckpoint(project, isDev);
          await fs.remove(
            isDev
              ? path.join(cwd, "tests-runtime", project)
              : path.join(os.homedir(), ".reliverse", "projects", project),
          );
        }
        relinka(
          "info",
          `Successfully deleted ${projectsToDelete.length} project(s)`,
        );
      }
    }
  } else if (option === "exit") {
    process.exit(0);
  } else {
    relinka("error", "Invalid option selected. Exiting.");
  }

  await showEndPrompt();
}
