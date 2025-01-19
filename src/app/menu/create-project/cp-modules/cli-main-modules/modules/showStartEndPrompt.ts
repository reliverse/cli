import { endPrompt, startPrompt } from "@reliverse/prompts";
import { emojify } from "node-emoji";

import { cliName, cliVersion } from "~/app/constants.js";

export async function showStartPrompt(isDev: boolean) {
  await startPrompt({
    titleColor: "inverse",
    clearConsole: true,
    packageName: cliName,
    packageVersion: cliVersion,
    isDev,
  });
}

export async function showEndPrompt() {
  await endPrompt({
    title: emojify("ℹ  :books: https://docs.reliverse.org/reliverse/cli"),
    titleAnimation: "glitch",
    titleColor: "passionGradient",
    titleTypography: "bold",
    titleAnimationDelay: 500,
  });
}
