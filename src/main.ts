// 📚 Docs: https://docs.reliverse.org/relinka

import { errorHandler } from "@reliverse/prompts";

import { showReliverseMenu } from "./menu/modules/01-showReliverseMenu.js";
import { askProjectDetails } from "./menu/modules/04-askProjectDetails.js";
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
} from "./menu/prompts.js";
import { type UserInput } from "./menu/schema.js";

export default async function main() {
  await showStartPrompt();
  await showAnykeyPrompt("welcome");
  await showReliverseMenu();
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

await main().catch((error: Error) =>
  errorHandler(
    error,
    "If this issue is related to @reliverse/cli itself, please\n│  report the details at https://github.com/reliverse/cli",
  ),
);
