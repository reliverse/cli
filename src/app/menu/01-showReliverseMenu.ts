import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import pc from "picocolors";

import { readReliverseMemory } from "~/args/memory/impl.js";

import { buildBrandNewThing } from "./02-buildBrandNewThing.js";

export async function showReliverseMenu(isDev: boolean) {
  // TODO: if config contains at least one project, show "Open project" option
  // TODO: implement "Edit Reliverse Memory" option (configuration data editor)

  const memory = await readReliverseMemory();
  const username = memory.user?.name;

  const welcomeBackMessages = [
    `Welcome back, ${username}!`,
    `It's great to see you again, ${username}!`,
    `Nice to see you back, ${username}!`,
    `Hey ${username}, welcome back!`,
    `Good to have you back, ${username}!`,
    `Look who's back - it's ${username}!`,
    `${username} has returned! Welcome back!`,
    `Welcome back to your dev journey, ${username}!`,
  ];

  const randomReliverseMenuTitle = [
    "What would you like to create today? I'm your all-in-one tool for developing anything!",
    "Ready to build something amazing? I'm here to help you develop your next big project!",
    "Let's create something special today! I'm your development companion for any kind of project.",
    "Looking to start a new project? I've got all the tools you need to build anything!",
    "Welcome to your development journey! What would you like to create today?",
    "Got an idea? Let's turn it into reality! I'm here to help you build anything you imagine.",
    "Time to start building! What kind of project can I help you develop today?",
  ];

  const option = await selectPrompt({
    title: `🤖 ${
      username &&
      welcomeBackMessages[
        Math.floor(Math.random() * welcomeBackMessages.length)
      ]
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
      {
        label: "Clone and configure any GitHub repo",
        hint: "coming soon",
        value: "2",
        disabled: true,
      },
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
  //   // await installAnyGitRepo();
  //   relinka.error("This option is not available yet.");
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
    relinka.error("Invalid option selected. Exiting.");
  }
}
