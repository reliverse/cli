// 📚 Docs: https://docs.reliverse.org/cli

import { errorHandler } from "@reliverse/prompts";

import {
  askDir,
  doSomeFunStuff,
  showAnimatedText,
  showAnykeyPrompt,
  showConfirmPrompt,
  showDatePrompt,
  showEndPrompt,
  showMultiselectPrompt,
  showNextStepsPrompt,
  showNumberPrompt,
  showNumMultiselectPrompt,
  showNumSelectPrompt,
  showPasswordPrompt,
  showProgressBar,
  showResults,
  showSelectPrompt,
  showStartPrompt,
  showTogglePrompt,
} from "./data/prompts.js";
import { showReliverseMenu } from "./menu/01-showReliverseMenu.js";
import { askProjectDetails } from "./menu/04-askProjectDetails.js";

// import { type UserInput } from "./data/schema.js";

export default async function app({ isDev }: { isDev: boolean }) {
  await showStartPrompt();
  await showReliverseMenu(isDev);
  // const username = await showInputPrompt();
  // const dir = await askDir(username);
  // const age = await showNumberPrompt();
  // const password = await showPasswordPrompt();
  // const birthday = await showDatePrompt();
  // const lang = await showSelectPrompt();
  // const langs = await showMultiselectPrompt();
  // const color = await showNumSelectPrompt();
  // const features = await showNumMultiselectPrompt();
  // const toggle = await showTogglePrompt();
  // const spinner = await showConfirmPrompt(username);
  // const userInput = {
  //   username,
  //   dir,
  //   age,
  //   lang,
  //   color,
  //   password: "123456",
  //   birthday: "14.02.1990",
  //   langs,
  //   features,
  //   spinner,
  //   toggle,
  // } satisfies UserInput;
  // await showProgressBar();
  // await showResults(userInput);
  // await doSomeFunStuff(userInput);
  // await showNextStepsPrompt();
  // await showAnimatedText();
  await showEndPrompt();
}
